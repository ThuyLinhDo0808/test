from langchain_core.runnables.config import RunnableConfig
from langgraph.types import interrupt
from langchain_core.messages import AIMessage
from app.services.workflow.registry import register_node
from app.services.workflow.base import BaseNode, NodeInfoModel
from app.models import ConversationState, SecurityCheckStatus


@register_node("security")
class SecurityNode(BaseNode):
    def __init__(self, **kwargs):
        """
        Direct to security check for the workflow

        Args:
            sql_manager (SQLManager): SQL manager for database operations.
            event_handler (EventHandler): Event handler to manage events during the security check.
            chat_history (ChatHistory): Chat history to manage conversation state.
        """
        self.sql_manager = kwargs["sql_manager"]
        self.event_handler = kwargs["event_handler"]
        self.chat_history = kwargs["chat_history"]
        self.timeout = kwargs.get("timeout", 300.0)

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        """
        The flow for the security node is as follows:
        1. When first called, it will start with the interrupt to ask the user for their purpose of entry.
        2. The second time it is called, it will save visitor's answer as purpose, then start running the rest of the function
        3. First, it will wait until the security check in the frontend is done.
        3. When done, it will check if the security check was valid.
        4. If valid, it will save the visitor data to the database and return a success message. If not valid, it will return a failure message.
        6. In both cases, it will signal to the event handler that the whole security operation is completed.
        7. After this, the frontend can use the permission data to generate a QR code, and present PIN to the user.
        """
        print("SECURITY CHECK")

        if not state["messages"]:
            raise ValueError("No messages available for security check.")

        prompt = "Please provide your purpose of entry before proceeding to ID scan and liveness check"
        purpose = interrupt(prompt)

        # Signal frontend to start security check: Present QR scanner and liveness check
        self.event_handler.security_status = SecurityCheckStatus.WAITING_FOR_FRONTEND
        self.event_handler.do_security_check.set()

        # Wait for security check to complete or timeout
        # The event is set through the set_security_check_results method in workflow_service.py
        is_finished = self.event_handler.security_check_finished.wait(
            timeout=self.timeout
        )

        if not is_finished:
            self.event_handler.security_status = SecurityCheckStatus.TIMED_OUT
            print("Security check timed out.")
        else:
            # Validate required fields if it passed
            if self.event_handler.security_status == SecurityCheckStatus.PASSED:
                required_fields = ["name", "dob", "card_id"]
                if not all(
                    field in self.event_handler.visitor_data
                    for field in required_fields
                ):
                    self.event_handler.security_status = SecurityCheckStatus.FAILED
                    print("Security check failed. Missing fields.")

        success = self.event_handler.security_status == SecurityCheckStatus.PASSED

        if success:
            visitor_data = {
                "purpose": purpose,
                **self.event_handler.visitor_data,
            }

            permission_data = None
            try:
                permission_data = self.sql_manager.insert_visitor(visitor_data)
                answer = AIMessage(
                    content="Security check successful. Here is your QR code and PIN."
                )
            except Exception as e:
                print(f"Failed to save visitor data in SecurityNode: {e}")
                answer = AIMessage(
                    content="Security check successful, but failed to save your data. Please try again later."
                )

            self.event_handler.permission_data = permission_data

        else:
            answer = AIMessage(content="Security check failed.")

        self.chat_history.add_messages(state["messages"] + [answer])
        self.event_handler.security_status = SecurityCheckStatus.COMPLETED
        self.event_handler.security_op_completed.set()

        return {"answer": answer.content, "messages": answer}

    @classmethod
    def get_metadata(cls) -> dict:
        return NodeInfoModel(
            type="node",
            name="Security Node",
            description="Node to direct to security check for the workflow.",
            parameters=[],
            prerequisites=["messages"],
            outputs=["answer", "messages"],
            allow_input=True,
            allow_output=True,
        )
