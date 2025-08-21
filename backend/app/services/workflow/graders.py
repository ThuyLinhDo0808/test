from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda, RunnableParallel
from langchain_core.runnables.config import RunnableConfig
from app.services.workflow.utils import format_docs
from app.services.workflow.registry import register_node, register_edge
from app.services.workflow.base import BaseNode, BaseEdge
from app.models import (
    ConversationState,
    BooleanModel,
    NodeInfoModel,
    ElementParamModel,
    EdgeInfoModel,
)

# NOTE: We could consider adding additional examples for better performance, and perhaps use the original question as well.

DOC_GRADER_INSTRUCTION = """
You are an expert grader evaluating whether a retrieved document is relevant to a user's question.

Your goal is to filter out unrelated or erroneous retrievals, but for broad or open-ended questions, you should allow a wider range of relevant material.

Guidelines:
- If the document meaningfully addresses, expands upon, or is useful in understanding the user's question, consider it relevant.
- Documents that add related information — even if indirectly — should still be considered relevant.
- Minor off-topic content is acceptable as long as the document substantially contributes to the topic.
- You do not require exact keyword matches — prioritize semantic relevance and usefulness.

Answer with a single word: "yes" if relevant, "no" if not relevant.
"""

DOC_GRADER_PROMPT = """
Retrieved document: 
{document}

Question:
{question}
"""


@register_node("doc_grader")
class DocGraderNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Perform document grading to determine if the document is relevant to the question.

        Args:
            llm (BaseChatModel): The LLM to use for generating the answer.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
        """
        llm = kwargs["llm"]
        self.llm = llm.with_structured_output(BooleanModel)
        self.chat_history = kwargs["chat_history"]
        self.doc_grader_instruction = kwargs.get(
            "doc_grader_instruction", DOC_GRADER_INSTRUCTION
        )
        self.doc_grader_prompt = kwargs.get("doc_grader_prompt", DOC_GRADER_PROMPT)

    def __doc_relevant__(self, messages, question, doc: Document) -> bool:
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.doc_grader_instruction),
                *[(m.type, m.content) for m in messages[:-1]],
                ("human", self.doc_grader_prompt),
            ]
        )

        try:
            chain = prompt | self.llm
            relevancy = chain.invoke({"document": doc, "question": question})
            decision = relevancy.decision.lower()

            if decision == "yes":
                print(f"DOCUMENT RELEVANT")
            else:
                print(f"DOCUMENT NOT RELEVANT")

            return decision == "yes"
        except Exception as e:
            print(f"Error grading document: {str(e)}")
            return False

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("DOC GRADER")

        if not state["messages"]:
            raise ValueError("No messages available for retrieval.")

        if not state["context"]:
            raise ValueError("No context available for document grading.")

        context = state["context"]

        # Empty messages if question is rewritten
        messages = (
            (list(self.chat_history.messages) + state["messages"])
            if not state["rewritten_question"]
            else []
        )

        question = (
            state["rewritten_question"].content
            if state["rewritten_question"]
            else state["messages"][-1].content
        )

        grading_tasks = {
            f"doc_{i}": RunnableLambda(
                lambda doc=doc: self.__doc_relevant__(
                    messages, question, format_docs(doc)
                )
            )
            for i, doc in enumerate(context)
        }

        parallel_grader = RunnableParallel(grading_tasks)

        results = parallel_grader.invoke({}, config=config)

        # Filter documents based on grading results
        relevant_docs = [doc for i, doc in enumerate(context) if results[f"doc_{i}"]]

        # Update the state with relevant documents
        return {"context": relevant_docs}

    @classmethod
    def get_metadata(clse) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Document Grader Node",
            description="Node that grades documents to determine if they are relevant to the user's question.",
            parameters=[
                ElementParamModel(
                    name="doc_grader_instruction",
                    type="str",
                    default=DOC_GRADER_INSTRUCTION,
                    description="Instruction for the document grader model to follow when grading documents.",
                ),
                ElementParamModel(
                    name="doc_grader_prompt",
                    type="str",
                    default=DOC_GRADER_PROMPT,
                    description="Prompt template for the document grader model to generate an answer.",
                ),
            ],
            prerequisites=["messages", "context"],
            outputs=[
                "context"
            ],  # This will be the filtered context with relevant documents
            allow_input=True,
            allow_output=True,
        )


HALLUCINATION_TEMPLATE = """
You are an expert fact-checking assistant.

Your task is to determine whether the given answer is fully supported by the provided context.

Guidelines:
- If all factual claims in the answer are clearly supported by the context, mark it as grounded.
- If any part of the answer cannot be verified from the context, or is inconsistent with it, mark it as hallucinated.
- Minor rephrasings or rewordings are acceptable if they don't change meaning.
- Do not speculate or assume - only consider information explicitly present in the context.

Answer with a single word: "yes" if hallucinated, "no" if grounded.

Context:
{context}

Answer:
{answer}

Result:
"""


@register_edge("hallucination_grader")
class HallucinationGraderEdge(BaseEdge):
    def __init__(self, **kwargs):
        """
        Perform hallucination grading to determine if the answer is grounded in the context (documents).
        Increment current_retries by 1 if the answer is hallucinated, stop if reached max_retries.
        When using this edge, be careful to not create a loop in the workflow as it will create an infinite loop.
        For example, if "max_retries_reached", and we connect it back to the RAG node, it will create an infinite loop.
        This error will be prevented by the HallucinationEdge class itself.


        Return:
            "max_retries_reached" if is hallucinated and max_retries is reached.
            "not_hallucinated" if is not hallucinated.
            "hallucinated" if is hallucinated and max_retries is not reached.

        Args:
            llm (BaseChatModel): The LLM to use for generating the answer.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
        """
        llm = kwargs["llm"]
        self.llm = llm.with_structured_output(BooleanModel)
        self.chat_history = kwargs["chat_history"]
        self.hallucination_template = kwargs.get(
            "hallucination_template", HALLUCINATION_TEMPLATE
        )

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("HALLUCINATION GRADER")

        if not state["context"]:
            raise ValueError("No context available for hallucination grading.")

        if not state["answer"]:
            raise ValueError("No answer available for hallucination grading.")

        if state.get("n_generations") is None:
            raise ValueError("No n_generations available for hallucination grading")

        if not state["max_retries"]:
            raise ValueError("No max_retries available for hallucination grading")

        if state["n_generations"] > state["max_retries"]:
            raise ValueError(
                "Invalid n_generations surpassing max_retries. Make sure n_generations is less than max_retries and check if the workflow is not creating a loop."
                ""
            )

        context = state["context"]

        try:
            prompt = ChatPromptTemplate.from_template(self.hallucination_template)
            chain = prompt | self.llm

            result = chain.invoke(
                {"context": format_docs(context), "answer": state["answer"]},
                config=config,
            )

            hallucinated = result.decision.lower()

            if hallucinated == "yes" and state["n_generations"] < state["max_retries"]:
                print("HALLUCINATED - RETRYING")
                return "hallucinated"
            elif hallucinated == "no" and state["n_generations"] < state["max_retries"]:
                print("NOT HALLUCINATED - CONTINUING")
                return "not_hallucinated"
            elif (
                hallucinated == "yes" and state["n_generations"] == state["max_retries"]
            ):
                print("HALLUCINATED - MAX RETRIES REACHED")
                return "max_retries_reached"
            else:
                print("NOT HALLUCINATED - MAX RETRIES REACHED")
                return "not_hallucinated"
        except Exception as e:
            print(f"Error grading hallucination: {str(e)}")
            return "max_retries_reached"

    @classmethod
    def get_metadata(cls) -> EdgeInfoModel:
        return EdgeInfoModel(
            type="edge",
            name="Hallucination Grader Edge",
            description="Edge that grades the answer for hallucinations based on the context. If hallucinated, increment current_retries by 1 if the answer is hallucinated, stop if reached max_retries.",
            parameters=[
                ElementParamModel(
                    name="hallucination_template",
                    type="str",
                    default=HALLUCINATION_TEMPLATE,
                    description="Template for grading hallucinations in the answer.",
                )
            ],
            prerequisites=["context", "answer", "n_generations", "max_retries"],
            outputs=[
                "hallucinated",
                "not_hallucinated",
                "max_retries_reached",
            ],  # All possible outputs of the edge
            allow_input=True,
            allow_output=True,
        )
