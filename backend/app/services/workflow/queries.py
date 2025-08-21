from langchain.load import dumps, loads
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.config import RunnableConfig
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage
from app.services.workflow.registry import register_node
from app.services.workflow.base import BaseNode
from app.models import ConversationState, NodeInfoModel, ElementParamModel


@register_node("retrieve")
class RetrieveNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Retrieve relevant documents from the vector store.

        Args:
            vector_manager (Chroma): The vector store for document retrieval.
        """
        self.vector_manager = kwargs["vector_manager"]
        self.n_vector_retrieval = kwargs.get("n_vector_retrieval", 3)

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("RETRIEVE")

        if not state["messages"]:
            raise ValueError("No messages available for retrieval.")

        # Use rewritten question instead if exists
        question = (
            state["rewritten_question"].content
            if state["rewritten_question"]
            else state["messages"][-1].content
        )

        # Retrieve relevant documents from the vector store
        docs = (
            self.vector_manager.get_vectorstore()
            .as_retriever(search_kwargs={"k": self.n_vector_retrieval})
            .invoke(question, config=config)
        )

        return {"context": docs}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Retrieve Node",
            description="Node for retrieving relevant documents from the vector store based on the user's question.",
            parameters=[
                ElementParamModel(
                    name="n_vector_retrieval",
                    type="int",
                    default=3,
                    description="Number of documents to retrieve from the vector store.",
                ),
            ],
            prerequisites=["messages"],
            outputs=["context"],
            allow_input=True,
            allow_output=True,
        )


QUERY_REWRITE_INSTRUCTION = """
You are an expert assistant specializing in converting a conversation (chat history + latest user question) into an optimized standalone query for vectorstore retrieval.

Rewriting rules:
- Use the conversation history to understand the full user intent.
- If the user follow-up question depends on prior answers (e.g., asking about alternatives, expansions, "other things"), you must incorporate both the latest user input and relevant prior assistant responses.
- Remove greetings, personal information, emotions, locations, small talk, and unrelated background.
- Keep the rewritten query focused, clear, and retrieval-optimized.
- If necessary, restate the user's intent fully — even if it wasn't explicit in the latest message alone.
- Do not invent new facts. Stay grounded in what was discussed.
- Output only the final retrieval-focused query. No explanations.

Examples:

[Chat History]
User: Is there a library in the building?
Assistant: I couldn't find information about a library in the building.
User: What about a financial trading lab?

Rewritten Query:
"Availability of financial trading lab in building"

---

[Chat History]
User: Are there any labs in the building?
Assistant: Yes, there are IT labs.
User: Are there other labs?

Rewritten Query:
"Other labs available in the building besides IT labs"

---

[Chat History]
User: Hi
Assistant: Welcome! How can I assist you?
User: Tell me about the facilities of the building

Rewritten Query:
"Facilities available in the building"
"""


QUERY_REWRITE_PROMPT = """
Chat history:
{chat_history}

Follow-up question:
{question}

Rewritten standalone question:
"""


@register_node("query_rewrite")
class QueryRewriteNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Rewrite the query to improve retrieval results by removing unnecessary context and focusing on the core question.
        This solves the problem when the user asks a question that is not clear and might require additional context from previous messages.
        Making vector retrieval more accurate.

        Args:
            llm (BaseChatModel): The language model for query rewriting.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
        """
        self.llm = kwargs["llm"]
        self.chat_history = kwargs["chat_history"]
        self.query_rewrite_instruction = kwargs.get(
            "query_rewrite_instruction", QUERY_REWRITE_INSTRUCTION
        )
        self.query_rewrite_prompt = kwargs.get(
            "query_rewrite_prompt", QUERY_REWRITE_PROMPT
        )

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("QUERY REWRITE")

        if not state["messages"]:
            raise ValueError("No messages available for query rewriting.")

        messages = list(self.chat_history.messages) + state["messages"]
        last_msg = messages[-1]

        # NOTE: Maybe add chat history into ChatPromptTemplate directly
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.query_rewrite_instruction),
                ("human", self.query_rewrite_prompt),
            ]
        )

        chain = prompt | self.llm

        chat_history_text = "\n".join(
            [f"{m.type.capitalize()}: {m.content}" for m in messages[:-1]]
        )

        try:
            rewritten_question = chain.invoke(
                {"chat_history": chat_history_text, "question": last_msg.content},
                config=config,
            )
            return {
                "rewritten_question": HumanMessage(content=rewritten_question.content)
            }
        except Exception as e:
            return {}

    @classmethod
    def get_metadata(self) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Query Rewrite Node",
            description="Node for rewriting the user's question to improve retrieval results by focusing on the core question.",
            parameters=[
                ElementParamModel(
                    name="query_rewrite_instruction",
                    type="str",
                    default=QUERY_REWRITE_INSTRUCTION,
                    description="Instruction for the language model to rewrite the query.",
                ),
                ElementParamModel(
                    name="query_rewrite_prompt",
                    type="str",
                    default=QUERY_REWRITE_PROMPT,
                    description="Prompt template for the language model to rewrite the query.",
                ),
            ],
            prerequisites=["messages"],
            outputs=["rewritten_question"],
            allow_input=True,
            allow_output=True,
        )


MULTI_RETRIEVE_TEMPLATE = """
You are an AI language model assistant. Your task is to generate {n_queries} different versions of the given user question to retrieve relevant documents from a vector database. 
By generating multiple perspectives on the user question, your goal is to help the user overcome some of the limitations of the distance-based similarity search. 
Provide these alternative questions separated by newlines. 
Original question: {question}

Examples:
Original question: What are the visitor entry procedures for the building?
Alternative questions:
- How do visitors gain entry to the building?
- What is the process for visitor access at the building?
- Requirements for visitor registration at the building?
- Steps visitors must follow to enter the building?
"""


@register_node("multi_retrieve")
class MultiRetrieveNode(BaseNode):
    def __init__(
        self,
        **kwargs,
    ):
        """
        Generate multiple queries and perform vector retrieval to get multiple documents.
        This node should not be used together with the `RetrieveNode`,
        or used after the QueryRewriteNode as it will shorten the question down to the core part, leaving little information for the model to generate multiple queries.

        Args:
            llm (BaseChatModel): The language model for generating queries.
            vector_manager (Chroma): The vector store for document retrieval.
            fuse (str): Document fusing strategy, must be either "rag_fusion" or "unique_union".
            k (int): K parameter for rag fusion formula
            n_queries (int): The number of queries to perform.
            n_vector_retrieval (int): The number of documents to retrieve from the vector store for each query.
            multi_retrieve_template (str): Template for generating multiple queries based on the user's question.
        """
        self.llm = kwargs["llm"]
        self.vector_manager = kwargs["vector_manager"]
        self.fuse = kwargs.get("fuse", "rag_fusion")
        self.k = kwargs.get("k", 60)
        self.n_queries = kwargs.get("n_queries", 3)
        self.n_vector_retrieval = kwargs.get("n_vector_retrieval", 3)
        self.multi_retrieve_template = kwargs.get(
            "multi_retrieve_template", MULTI_RETRIEVE_TEMPLATE
        )

    def get_unique_union(self, documents: list[list]) -> list:
        """
        Remove repeated documents from the list of lists of documents.

        Args:
            documents (list[list]): Documents

        Returns:
            list: A list of unique documents
        """
        flattened_docs = [dumps(doc) for sublist in documents for doc in sublist]
        # Get unique documents
        unique_docs = list(set(flattened_docs))
        # Return
        return [loads(doc) for doc in unique_docs]

    def __rank_fusion__(self, results: list[list]) -> list:
        """
        Takes multiple lists of ranked documents and an optional parameter k used in the RRF formula

        Args:
            results (list[list]): A list of lists containing ranked documents.
            k (int, optional): parameter k in RRF. Defaults to 60.

        Returns:
            list: A list of tuples containing the reranked documents and their scores.
        """
        # Initialize a dictionary to hold fused scores for each unique document
        fused_scores = {}

        # Iterate through each list of ranked documents
        for docs in results:
            # Iterate through each document in the list, with its rank (position in the list)
            for rank, doc in enumerate(docs):
                # Convert the document to a string format to use as a key (assumes documents can be serialized to JSON)
                doc_str = dumps(doc)

                # # If the document is not yet in the fused_scores dictionary, add it with an initial score of 0
                if doc_str not in fused_scores:
                    fused_scores[doc_str] = 0

                # Retrieve the current score of the document, if any
                previous_score = fused_scores[doc_str]

                # Update the score of the document using the RRF formula: 1 / (rank + k)
                fused_scores[doc_str] += 1 / (rank + self.k)

        # Sort the documents based on their fused scores in descending order to get the final reranked results
        reranked_results = [
            (loads(doc), score)
            for doc, score in sorted(
                fused_scores.items(), key=lambda x: x[1], reverse=True
            )
        ]

        # Return the reranked results as a list of tuples, each containing the document and its fused score
        return reranked_results

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("MULTI RETRIEVE")

        if not state["messages"]:
            raise ValueError("No messages available for multi-retrieval.")

        question = (
            state["rewritten_question"].content
            if state["rewritten_question"]
            else state["messages"][-1].content
        )

        prompt = ChatPromptTemplate.from_template(self.multi_retrieve_template)

        try:
            chain = prompt | self.llm | StrOutputParser() | (lambda x: x.split("\n"))

            # Run this in parallel
            chain = (
                chain
                | self.vector_manager.get_vectorstore()
                .as_retriever(search_kwargs={"k": self.n_vector_retrieval})
                .map()
            )

            docs = chain.invoke(
                {"question": question, "n_queries": self.n_queries}, config=config
            )

            if self.fuse == "unique_union":
                docs = self.get_unique_union(docs)
            elif self.fuse == "rag_fusion":
                docs = self.__rank_fusion__(docs)

            return {"context": docs}
        except Exception as e:
            print(f"Error in MultiRetrieveNode: {str(e)}")
            return {}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Multi Retrieve Node",
            description="Node for generating multiple queries and performing vector retrieval to get multiple documents.",
            parameters=[
                ElementParamModel(
                    name="fuse",
                    type="str",
                    default="rag_fusion",
                    options=["rag_fusion", "unique_union"],
                    description="Document fusing strategy to use for the retrieved documents. 'rag_fusion' uses RRF formula to rank the retrieved documents, 'unique_union' removes repeated documents.",
                ),
                ElementParamModel(
                    name="k",
                    type="int",
                    default=60,
                    description="Parameter k in RRF formula used to rank the retrieved documents.",
                ),
                ElementParamModel(
                    name="n_queries",
                    type="int",
                    default=3,
                    description="Number of queries to perform for multi-retrieval.",
                ),
                ElementParamModel(
                    name="n_vector_retrieval",
                    type="int",
                    default=3,
                    description="Number of documents to retrieve from the vector store for each query.",
                ),
                ElementParamModel(
                    name="multi_retrieve_template",
                    type="str",
                    default=MULTI_RETRIEVE_TEMPLATE,
                    description="Template for generating multiple queries based on the user's question.",
                ),
            ],
            prerequisites=["messages"],
            outputs=["context"],
            allow_input=True,
            allow_output=True,
        )
