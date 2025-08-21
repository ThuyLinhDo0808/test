from langchain_core.runnables.config import RunnableConfig
from langchain_core.prompts import ChatPromptTemplate
from app.services.workflow.utils import format_docs
from app.services.workflow.registry import register_node
from app.services.workflow.base import BaseNode
from app.models import ConversationState, NodeInfoModel, ElementParamModel


RAG_INSTRUCTION = """
You are an assistant named Aura for question-answering task. Use the following pieces of retrieved documents, which may include both formal documents and FAQ entries to answer the question. 
If you don't know the answer, just say that you don't know and don't explain or provide additional information about the documents. 
Use five sentences maximum and keep the answer concise and factual. Keep your tone professional and confident.
"""

RAG_PROMPT = """
Question: {question} 
Building Documents: {context} 
Answer:
"""


@register_node("rag")
class RagNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Perform RAG to generate an answer based on the context and the chat history.

        Args:
            llm (BaseChatModel): The LLM to use for generating the answer.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
            add_to_history (bool): Whether to add the generated answer to the chat history.

        If add_to_history is True, the generated answer will be added to the chat history. If False, it will not be added.
        This is useful for cases where you want to do some grading on the answer before adding it to the chat history.
        """
        self.llm = kwargs["llm"]
        self.chat_history = kwargs["chat_history"]
        self.add_to_history = kwargs.get("add_to_history", True)
        self.rag_instruction = kwargs.get("rag_instruction", RAG_INSTRUCTION)
        self.rag_prompt = kwargs.get("rag_prompt", RAG_PROMPT)

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("RAG")
        # Check if context are available
        if not state["context"]:
            raise ValueError("No context available for RAG generation.")

        if not state["messages"]:
            raise ValueError("No messages available for RAG generation.")

        if state.get("n_generations") is None:
            raise ValueError("No n_generations available for RAG generation.")

        context = state["context"]

        # Use the original query for better context
        messages = list(self.chat_history.messages) + state["messages"]
        # Use only the last 6 messages (3 messages from each side) to avoid context overflow
        messages = messages[-6:] if len(messages) > 6 else messages

        question = messages[-1].content

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.rag_instruction),
                *[(m.type, m.content) for m in messages[:-1]],
                ("human", self.rag_prompt),
            ]
        )

        chain = prompt | self.llm

        try:
            answer = chain.invoke(
                {"context": format_docs(context), "question": question}, config=config
            )
        except Exception as e:
            answer = f"Error generating answer: {str(e)}"
            return {
                "answer": answer,
            }

        if self.add_to_history:
            self.chat_history.add_messages(state["messages"] + [answer])
            return {
                "answer": answer.content,
                "messages": answer,
                "n_generations": state["n_generations"] + 1,
            }
        else:
            return {
                "answer": answer.content,
                "n_generations": state["n_generations"],
            }

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="RAG Node",
            description="""Perform RAG to generate an answer based on context and chat history.
            Set add_to_history to False if you want to do some grading on the answer before adding it to the chat history. 
            Note that if you set add_to_history to False, you must use the `Answer Node` to add the answer to the chat history after grading. 
            However, this will cause the answer to appear instantly instead of word-by-word, which is not as good user experience as the normal answer generation.""",
            parameters=[
                ElementParamModel(
                    name="add_to_history",
                    type="bool",
                    default=True,
                    description="Whether to add the generated answer to the chat history.",
                ),
                ElementParamModel(
                    name="rag_instruction",
                    type="str",
                    default=RAG_INSTRUCTION,
                    description="Instruction for the RAG model to follow when generating an answer.",
                ),
                ElementParamModel(
                    name="rag_prompt",
                    type="str",
                    default=RAG_PROMPT,
                    description="Prompt template for the RAG model to generate an answer.",
                ),
            ],
            prerequisites=["context", "messages", "n_generations"],
            outputs=["answer", "n_generations"],
            allow_input=True,
            allow_output=True,
        )
