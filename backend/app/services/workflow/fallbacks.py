from langchain_core.runnables.config import RunnableConfig
from langchain_core.messages import AIMessage
from langchain_core.prompts import ChatPromptTemplate
from app.services.workflow.registry import register_node, register_edge
from app.services.workflow.base import BaseNode, BaseEdge
from app.models import (
    ConversationState,
    EdgeInfoModel,
    NodeInfoModel,
    ElementParamModel,
)


FALLBACK_INSTRUCTION = """
You are a helpful assistant named Aura that helps users with questions about the building.

You are allowed to respond to:
- Greetings and polite conversation (e.g., "Hi", "Hello", "How are you", "My name is John").
- Questions about your identity (e.g., "Who are you?", "What is your name?", "What do you do?", "How can you help").

If the question is NOT about greetings or your identity or unclear, you must respond with one of the following exact phrases:
- I don't know.
- I'm not sure about that.
- I can't respond to that.
- Sorry, I don't have information on that.
- That’s outside my scope - I'm here to help with things about the building.
- I’m not able to answer that question.

Never add explanations, reflections, or commentary. Do not explain why you can't answer. Do not interpret the user's intent.
Keep your tone professional and confident.
"""

FALLBACK_PROMPT = """
Question: {question}
Answer:
"""


@register_node("no_answer")
class NoAnswerNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Fallback node for when the model should not answer the question.
        This node will use the LLM to generate a fallback answer, but will still answer simple questions like "What is your name?" or "How are you?".

        Args:
            llm (BaseChatModel): The language model instance.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
        """
        self.llm = kwargs["llm"]
        self.chat_history = kwargs["chat_history"]
        self.fallback_instruction = kwargs.get(
            "fallback_instruction", FALLBACK_INSTRUCTION
        )
        self.fallback_prompt = kwargs.get("fallback_prompt", FALLBACK_PROMPT)

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("NO ANSWER FALLBACK")

        if not state["messages"]:
            raise ValueError("No messages available for fallback.")

        messages = list(self.chat_history.messages) + state["messages"]
        last_msg = messages[-1]

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.fallback_instruction),
                *[(m.type, m.content) for m in messages[:-1]],
                ("human", self.fallback_prompt),
            ]
        )

        chain = prompt | self.llm
        answer = chain.invoke({"question": last_msg.content}, config=config)
        self.chat_history.add_messages(state["messages"] + [answer])

        return {"answer": answer.content, "messages": answer}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="No Answer Node",
            description="Node to handle fallback answers when no answer is found or the model should not answer the question.",
            parameters=[
                ElementParamModel(
                    name="fallback_instruction",
                    type="str",
                    default=FALLBACK_INSTRUCTION,
                    description="Instruction for the fallback model to follow when generating an answer.",
                ),
                ElementParamModel(
                    name="fallback_prompt",
                    type="str",
                    default=FALLBACK_PROMPT,
                    description="Prompt template for the fallback model to generate an answer.",
                ),
            ],
            prerequisites=["messages"],
            outputs=["answer", "messages"],
            allow_input=True,
            allow_output=True,
        )


@register_node("no_document")
class NoDocumentNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Fallback node for when no document is found.

        Args:
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
        """
        self.chat_history = kwargs["chat_history"]

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        print("NO DOCUMENT FALLBACK")

        if not state["messages"]:
            raise ValueError("No messages available for fallback.")

        answer = AIMessage(content="No relevant documents found for your question.")
        self.chat_history.add_messages(state["messages"] + [answer])
        return {"answer": answer.content, "messages": answer}

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        return NodeInfoModel(
            type="node",
            name="No Document Node",
            description="Node to handle fallback when no relevant documents are found.",
            parameters=[],
            prerequisites=["messages"],
            outputs=["answer", "messages"],
            allow_input=True,
            allow_output=True,
        )


@register_edge("no_document")
class NoDocumentEdge(BaseEdge):
    def __init__(self, **kwargs):
        """
        Edge to determine if no document is present
        "no" is returned to indicate that no document is present.
        "yes" is returned to indicate that a document is present.
        """
        pass

    def __call__(self, state: ConversationState, config: RunnableConfig) -> str:
        if not state["context"]:
            return "no"

        if state["context"] and len(state["context"]) == 0:
            return "no"

        return "yes"

    @classmethod
    def get_metadata(cls) -> EdgeInfoModel:
        return EdgeInfoModel(
            type="edge",
            name="No Document Edge",
            description="Edge to determine if no document is present.",
            parameters=[],
            prerequisites=["context"],
            outputs=["yes", "no"],
        )
