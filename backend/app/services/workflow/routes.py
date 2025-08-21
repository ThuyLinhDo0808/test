from langchain_core.runnables.config import RunnableConfig
from langchain_core.prompts import ChatPromptTemplate
from app.services.workflow.registry import register_edge
from app.services.workflow.base import BaseEdge
from app.models import ConversationState, RouteQuery, EdgeInfoModel, ElementParamModel
from typing import get_args

ROUTING_PROMPT = """
You are a smart assistant named Aura responsible for routing visitor questions within a building named Nextway to the most appropriate handling action. There are three possible actions you can choose from:
You will use "database_search" if the visitor is asking about the building, or requesting for building's documents.
You will use "general_answer" if the visitor is asking a general question that is not related to the building. A example of such question is "What is your name?". "What can you do?"
You will use "security_check" only if the visitor request entry to the physical building.

Based on what the visitor's latest question is asking, your task is to route it to the most relevant action.

Guidelines:
- If the latest input is a random, unclear word (e.g., "apple", "etc") with no clear connection to the conversation history, treat it as a general question and route to "general_answer".
- If the latest input is a question asking for information about the building, route to "database_search".
- If the latest input clearly requests access or entry into the building, route to "security_check".
- Never guess or assume beyond the conversation history.

Examples:
[Conversation History]
User: Hi there.
Aura: Hello! How can I help you?

[New User Input]
apple

[Routing Action]
general_answer

---

[Conversation History]
User: Hi there.
Aura: Hello! How can I help you?

[New User Input]
Tell me something interesting about the building.

[Routing Action]
database_search

---

[Conversation History]
User: Hi there.
Aura: Hello! How can I help you?

[New User Input]
Are pets allowed in the building?

[Routing Action]
database_search
---

[Conversation History]
User: Hi there.
Aura: Hello! How can I help you?
User: I would like to see the building floor plan.

[New User Input]
Can I get the parking layout too?

[Routing Action]
database_search

---

[Conversation History]
User: Hi what is your name?
Aura: I am Aura.

[New User Input]
I'm here to enter the building.

[Routing Action]
security_check

---

[Conversation History]
User: Hi there?
Aura: Hi, How can I help you?

[New User Input]
I would like to do the security check.

[Routing Action]
security_check
"""


@register_edge("routing")
class RoutingEdge(BaseEdge):
    def __init__(self, **kwargs):
        """
        Route the visitor question to the most appropriate action based on the conversation context.

        Args:
            llm (BaseChatModel): The LLM to use for generating the answer.
            chat_history (InMemoryChatMessageHistory): The chat history of the conversation.
            routing_prompt (str): The prompt used to guide the routing decision.
        """
        self.llm = kwargs["llm"]
        self.chat_history = kwargs["chat_history"]
        self.routing_prompt = kwargs.get("routing_prompt", ROUTING_PROMPT)

    def __call__(self, state: ConversationState, config: RunnableConfig) -> str:
        print("ROUTE")

        if not state["messages"]:
            raise ValueError("No messages available for RAG generation.")

        structured_llm = self.llm.with_structured_output(RouteQuery)
        messages = list(self.chat_history.messages) + state["messages"]
        # Only use the last 6 messages (3 messages from each sides) to avoid context overflow
        # TODO: Might make this configurable in the future
        messages = messages[-6:] if len(messages) > 6 else messages

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.routing_prompt),
                *[(m.type, m.content) for m in messages],
            ]
        )

        router = prompt | structured_llm
        result = router.invoke({}, config=config)

        return result.action

    @classmethod
    def get_metadata(cls) -> EdgeInfoModel:
        return EdgeInfoModel(
            type="edge",
            name="Routing Edge",
            description="Edge to route visitor questions to the most appropriate action based on conversation context.",
            parameters=[
                ElementParamModel(
                    name="routing_prompt",
                    type="str",
                    default=ROUTING_PROMPT,
                    description="The prompt used to guide the routing decision.",
                ),
            ],
            prerequisites=["messages"],
            outputs=list(get_args(RouteQuery.model_fields["action"].annotation)),
        )
