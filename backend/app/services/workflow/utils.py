from langchain_core.messages import trim_messages, AIMessage
from langchain_core.runnables.config import RunnableConfig
from app.core import MAX_TOKENS
from app.services.workflow.base import BaseNode
from app.services.workflow.registry import register_node
from app.models.conversation import ConversationState, NodeInfoModel


def format_docs(docs) -> str:
    """
    Formats the documents for the RAG generation step with context-aware tagging.

    Args:
        docs (list_): A list of Document objects (from LangChain or similar).

    Returns:
        str: A string containing the formatted content of the documents,
             each clearly marked as either FAQ or general Document.
    """
    formatted_chunks = []

    for doc in docs:
        tag = doc.metadata.get("tag", "document")

        if tag == "faq":
            question = doc.metadata.get("question", "[Unknown Question]")
            answer = doc.metadata.get("answer", "[No Answer Provided]")
            faq_id = doc.metadata.get("faq_id", "[NO FAQ_ID Provided]")
            formatted_chunks.append(
                f"Source: FAQ; FAQ link: {faq_id}\nQuestion: {question}\nAnswer: {answer}"
            )
        elif tag == "document":
            source = doc.metadata.get("source", "Unnamed Document")
            title = doc.metadata.get("title", "Untitled Section")
            formatted_chunks.append(
                f"Source: Document\nFile source: {source}\nTitle: {title}\nContent: {doc.page_content}"
            )
        else:
            # Fallback if tag is missing or unknown
            formatted_chunks.append(f"Source: Unknown\n{doc.page_content}")

    return "\n\n".join(formatted_chunks)


@register_node("starter")
class StartNode(BaseNode):
    def __init__(self, **kwargs):
        """
        This node does nothing, but is useful to indicate the start of the workflow.
        """

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        return {}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Start Node",
            description="Node to start the workflow. Use to indicate the start of the workflow. Only one start node is allowed in the graph.",
            parameters=[],
            prerequisites=[],
            outputs=[
                "messages",
                "n_generations",
                "max_retries",
            ],  # This output everything the manager provides
            allow_input=False,
            allow_output=True,
        )


@register_node("ender")
class EndNode(BaseNode):
    def __init__(self, **kwargs):
        """
        This node does nothing, but is useful to indicate the end of the workflow.
        """

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        return {}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="End Node",
            description="Node to end the workflow. Use to indicate the end of the workflow. Multiple end node is allowed in the graph.",
            parameters=[],
            prerequisites=[],
            outputs=[],  # Output nothing, this is the end of the workflow
            allow_input=True,
            allow_output=False,
        )


@register_node("trimmer")
class TrimNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Trim the messages to fit within the model's token limit.
        Args:
            llm (BaseChatModel): The language model for query rewriting.
        """
        self.llm = kwargs["llm"]
        self.chat_history = kwargs["chat_history"]

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        if not state["messages"]:
            raise ValueError("No messages available for trimming.")

        messages = state["messages"]
        trimmed = trim_messages(
            messages,
            max_tokens=MAX_TOKENS,
            strategy="last",
            start_on="human",
            end_on=("human", "ai"),
            include_system=False,
            allow_partial=False,
            token_counter=self.llm,
        )

        self.chat_history.clear()
        self.chat_history.add_messages(trimmed)

        return {"messages": trimmed}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Trim Node",
            description="Node to trim messages to fit within the model's token limit.",
            parameters=[],
            prerequisites=["messages"],
            outputs=["messages"],
            allow_input=True,
            allow_output=True,
        )


@register_node("final_answer")
class AnswerNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Useful for when you have grading nodes for RAG answers and only want the answer to be displayed after the grading is done and valid.
        This will add the answer to the conversation history. Therefore, if you don't have any answer grading, you should not add this node to the graph.
        If use this node, remember to set add_to_history=False in `RagNode` so that it doesn't add the answer to the conversation history twice.
        One major problem with this node is that since the answer must be generated before the grading, when all the grading is completed (which already takes some time),
        the answer will immediately popup instead of word-by-word. Although the answer appears instantly, the user experience is not as good as the normal answer generation.

        Args:
            chat_history (InMemoryChatMessageHistory): The chat history for storing messages.
        """
        self.chat_history = kwargs["chat_history"]

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("ANSWER NODE")

        if not state["answer"]:
            raise ValueError("No answer available for answer node.")

        if not state["messages"]:
            raise ValueError("No messages available for answer node.")

        answer = AIMessage(content=state["answer"])
        self.chat_history.add_messages(state["messages"] + [answer])

        return {"messages": answer}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="Answer Node",
            description="Node to add the final answer to the conversation history after grading. Note that the response will appear instantly, not word-by-word.",
            parameters=[],
            prerequisites=["messages", "answer"],
            outputs=["messages"],
            allow_input=True,
            allow_output=True,
        )
