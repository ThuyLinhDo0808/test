from langchain_core.runnables.config import RunnableConfig
from app.models import ConversationState, EdgeInfoModel, NodeInfoModel


class BaseNode:
    def __init__(self):
        """
        Base class for nodes in the workflow.
        """
        pass

    def __call__(self, state: ConversationState, config: RunnableConfig) -> dict:
        raise NotImplementedError("Subclasses must implement this method.")

    @classmethod
    def get_metadata(cls) -> NodeInfoModel:
        """
        Get metadata for the node.
        """
        raise NotImplementedError("Subclasses must implement this method.")


class BaseEdge:
    def __init__(self):
        """
        Base class for edges in the workflow.
        """
        pass

    def __call__(self, state: ConversationState, config: RunnableConfig) -> str:
        raise NotImplementedError("Subclasses must implement this method.")

    @classmethod
    def get_metadata(cls) -> EdgeInfoModel:
        """
        Get metadata for the edge.
        """
        raise NotImplementedError("Subclasses must implement this method.")
