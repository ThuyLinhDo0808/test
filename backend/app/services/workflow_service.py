"""
The ConversationManager class manages the conversation flow using a state graph.
It integrates with the LLM, vector store, and SQL manager to handle user interactions and workflows.

Key Responsibilities:
- State Graph: Manages the conversation flow using a compiled state graph.
- LLM Integration: Uses the LLM for generating responses.
- Event Handling: Manages events like security checks using the EventHandler.
- Chat History: Maintains a history of chat messages.

Interactions:
- Vector Store Manager: Retrieves documents for answering user queries
- SQL Manager: Stores and retrieves visitor information
- ChatSession: Provides conversation management capabilities to the ChatSession
"""

import uuid
import threading
from typing import Generator, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.chat_history import InMemoryChatMessageHistory
from langgraph.checkpoint.memory import (
    InMemorySaver,
)  # Use this since we don't need persistence
from app.services.vector_store_service import VectorStoreManager
from app.services.sql_service import SQLManager
from app.services.workflow import *
from app.models import ConversationState, GraphConfig, SecurityCheckStatus
from app.core import WORKFLOW_CONFIG_PATH


class GraphBuilder:
    @staticmethod
    def build(
        config: GraphConfig, checkpointer: InMemorySaver, shared_context: dict
    ) -> CompiledStateGraph:
        """
        Builds a state graph based on the provided configuration and shared context.

        Args:
            config (GraphConfig): The configuration for the state graph.
            checkpointer (InMemorySaver): The checkpointer for saving the state graph.
            shared_context (dict): A dictionary containing shared context for the state graph.

        Returns:
            CompiledStateGraph: The compiled state graph representing the conversation flow.

        Raises:
            ValueError: If there is an error during the graph dynamic loading.
        """
        workflow = StateGraph(ConversationState)
        node_outputs = set()
        node_info_map = {}

        try:
            # Get all end nodes from nodes
            end_nodes = [
                node.name for node in config.nodes if node.node_type == "ender"
            ]

            # Add nodes that are not end nodes to graph
            for node in (n for n in config.nodes if n.node_type != "ender"):
                params = {**shared_context, **(node.params or {})}
                node_instance = create_node(node.node_type, **(params or {}))
                workflow.add_node(node.name, node_instance)

                # Get metadata to check prerequisites and outputs
                node_info = node_instance.get_metadata()
                node_info_map[node.name] = node_info

                # Check prerequisites
                missing = set(node_info.prerequisites) - node_outputs
                if missing:
                    raise ValueError(
                        f"Node '{node.name}' has missing prerequisites: {', '.join(missing)}"
                    )
                # Add outputs provided by this node
                node_outputs.update(node_info.outputs)

            workflow.set_entry_point(config.entry_node)

            # Add edges
            for edge in config.edges:
                params = {**shared_context, **(edge.params or {})}

                # If edge is from node to end node, replace to_node with END
                to_node = edge.to_node if edge.to_node not in end_nodes else END

                if edge.connect_type == "direct":
                    workflow.add_edge(edge.from_node, to_node)
                elif edge.connect_type == "conditional":
                    # For conditional edges, validate prerequisites
                    edge_instance = create_edge(edge.edge_type, **(params or {}))
                    edge_info = edge_instance.get_metadata()
                    missing = set(edge_info.prerequisites) - node_outputs
                    if missing:
                        raise ValueError(
                            f"Edge from '{edge.from_node}' to '{to_node}' has missing prerequisites: {', '.join(missing)}"
                        )
                    workflow.add_conditional_edges(
                        edge.from_node, edge_instance, to_node
                    )

        except ValueError as e:
            raise ValueError(f"Unexpected error during graph dynamic loading: {str(e)}")

        return workflow.compile(checkpointer=checkpointer)


class EventHandler:
    """
    Handles events and state for the security check process.
    This includes managing the security status, visitor data, and liveness check results.
    This class can be extended to handle more complex event handling for more nodes in the future.
    But for now, it is used only for the security node.
    """

    def __init__(self):
        self.security_status: SecurityCheckStatus = SecurityCheckStatus.NOT_STARTED

        self.do_security_check = threading.Event()
        self.security_check_finished = threading.Event()
        self.security_op_completed = threading.Event()

        self.visitor_data: Optional[dict] = None
        self.liveness_status: bool = False
        self.permission_data: Optional[dict] = None

    def reset(self):
        """
        Resets the event handler to its initial state.
        This is useful to clear the state after a whole security check operation is completed.
        """
        self.security_status = SecurityCheckStatus.NOT_STARTED
        self.do_security_check.clear()
        self.security_check_finished.clear()
        self.security_op_completed.clear()

        self.visitor_data = None
        self.liveness_status = False
        self.permission_data = None

    def set_security_check_results(
        self, cancel: bool, visitor_data: dict = None, liveness_status: bool = None
    ):
        """
        Sets the results of the security check.
        This is intended to be done through a REST API call from the frontend after the security check is completed.
        After calling this method, the rest of the security operation in the SecurityNode should proceed automatically.

        Args:
            cancel (bool): Whether to cancel the security check. If False (not canceled), both visitor_data and liveness_status must be provided.
            visitor_data (dict, optional): Visitor data after ID QR scan. Defaults to None.
            liveness_status (bool, optional): Status of liveness check. Defaults to None.

        Raises:
            ValueError: If cancel is False and either visitor_data or liveness_status is None.
        """
        if not cancel and (visitor_data is None or liveness_status is None):
            raise ValueError("visitor_data or liveness_status missing.")

        if cancel:
            self.security_status = SecurityCheckStatus.CANCELED
        else:
            self.visitor_data = visitor_data
            self.liveness_status = liveness_status
            self.security_status = (
                SecurityCheckStatus.PASSED
                if (liveness_status and visitor_data)  # Only valid if both are provided
                else SecurityCheckStatus.FAILED
            )

        self.security_check_finished.set()


class ConversationManager:
    def __init__(
        self,
        llm: BaseChatModel,
        vector_manager: VectorStoreManager,
        sql_manager: SQLManager,
        config: GraphConfig,
    ):
        """
        Manages the conversation flow and state for the question answering system..

        Args:
            llm (BaseChatModel): The language model instance.
            vector_manager (VectorStoreManager): The vector store manager for document retrieval.
            sql_manager (SQLManager): The SQL manager for database operations.
            config (GraphConfig): The configuration for the state graph.
        """
        # Shared contexts
        self.llm = llm
        self.vector_manager = vector_manager
        self.sql_manager = sql_manager
        self.event_handler = EventHandler()

        self.chat_history = InMemoryChatMessageHistory()
        self.checkpointer = InMemorySaver()
        self.config = config
        self.thread_config = {"configurable": {"thread_id": uuid.uuid4()}}
        self.graph = self.__load_graph()

    def __shared_context(self) -> dict:
        """
        Returns a dictionary containing shared context for the state graph.

        Returns:
            dict: A dictionary containing shared context for the state graph.
        """
        return {
            "llm": self.llm,
            "vector_manager": self.vector_manager,
            "chat_history": self.chat_history,
            "event_handler": self.event_handler,
            "sql_manager": self.sql_manager,
        }

    def __load_graph(self) -> CompiledStateGraph:
        """
        Loads the state graph based on the provided configuration.

        Returns:
            CompiledStateGraph: The compiled state graph representing the conversation flow.

        Raises:
            ValueError: If there is an error during the graph dynamic loading.
        """
        compiled_graph = None
        try:
            compiled_graph = GraphBuilder.build(
                self.config, self.checkpointer, self.__shared_context()
            )
        except ValueError as e:
            raise ValueError(f"Error loading graph: {str(e)}")

        return compiled_graph

    async def reload_from_config(self, config: GraphConfig):
        """
        Reloads the conversation manager with a new configuration for the state graph.
        This will also clear the chat history.

        Args:
            config (GraphConfig): The new configuration for the conversation manager.

        Raises:
            ValueError: If there is an error during the graph dynamic loading.
        """
        original_config = self.config

        try:
            self.config = config
            self.graph = self.__load_graph()

            # Save the new config into path
            with open(WORKFLOW_CONFIG_PATH, "w") as f:
                f.write(self.config.model_dump_json())

        except ValueError as e:
            # If there is an error, revert to the original config
            self.config = original_config
            self.graph = self.__load_graph()

            raise ValueError(f"Error reloading graph: {str(e)}")

        await self.chat_history.aclear()

    def clear_memory(self):
        """
        Clears the conversation memory and delete the current thread's state from the checkpointer.
        This ensure the graph stays the same, while the memory is cleared.

        Raises:
            ValueError: If there is an error during the graph dynamic loading after clearing memory.
        """
        self.chat_history.clear()
        # Delete all interrupt states of the graph from the checkpointer
        self.checkpointer.delete_thread(self.thread_config["configurable"]["thread_id"])

        print("Workflow service: Memory cleared.")

    def get_current_config(self) -> GraphConfig:
        """
        Returns the current configuration of the conversation manager.

        Returns:
            GraphConfig: The current configuration of the conversation manager.
        """
        return self.config

    def invoke(self, input: dict) -> AIMessage:
        """
        Asynchronously invokes the model with the given input.

        Args:
            input (dict): The input data for the model.

        Returns:
            AIMessage: The model's response.
        """
        return self.graph.invoke(input, config=self.thread_config)

    def stream(
        self,
        input: dict,
        stream_mode: str = "messages",
        all: bool = False,
        stop_event: threading.Event = None,
    ) -> Generator[str, None, None]:
        """
        Streams the model's response token by token.

        Args:
            input (dict): The input data for the model.
            stream_mode (str, optional): The mode to stream output. Defaults to "messages".
            all (bool, optional): If True, streams all nodes without filtering using the config. Defaults to False.
            stop_event (threading.Event, optional): An event to stop the streaming. Defaults to None.
        """
        # Store the ongoing generation as it is generated
        # So that we can save it to chat history if the user interrupts the generation
        ongoing_generation = ""
        current_node = ""  # To track the current node when graph interrupts

        # Check for interrupts in the graph
        snapshot = self.graph.get_state(self.thread_config)

        # If there is an interrupt call from the nodes, set the next query to be a Command
        # To resume the graph from the last state
        if (
            snapshot.interrupts
            # This part might be redundant, but it ensures that the interrupt is from the same thread
            and snapshot.config["configurable"]["thread_id"]
            == self.thread_config["configurable"]["thread_id"]
        ):
            input = input.get("messages", "")
            input = (
                input.content if isinstance(input, HumanMessage) else input
            )  # Accounting for the default
            input = Command(resume=input)

        # This should not yield any messages if the graph's interrupt is activated
        for msg, metadata in self.graph.stream(
            input, stream_mode=stream_mode, config=self.thread_config
        ):
            # Check for external interruption
            if stop_event and stop_event.is_set():
                if ongoing_generation:
                    self.chat_history.add_ai_message(ongoing_generation)
                    print(
                        "Workflow service: Internal generation stopped due to event set."
                    )
                # Reset the event handler if there was an interrupt
                # Although during this the frontend should block new input until the verification is done
                self.event_handler.reset()
                break

            node = metadata.get("langgraph_node", "")
            current_node = node

            # Only stream messages based on node permission or --all flag
            if msg.content and (node in self.config.allowed_nodes or all):
                ongoing_generation += msg.content
                yield {"msg": msg.content, "node": node}

        # After all messages, check again if there is an graph interrupt
        # If there is, yield the value
        # yield {"msg": "Hello", "node": "mockup"}
        
        snapshot = self.graph.get_state(self.thread_config)

        if snapshot.interrupts:
            msg = snapshot.interrupts[0].value
            yield {"msg": msg, "node": current_node}
