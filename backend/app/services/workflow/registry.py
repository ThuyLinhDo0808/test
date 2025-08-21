from app.services.workflow.base import BaseNode, BaseEdge

NODE_REGISTRY = {}

EDGE_REGISTRY = {}


def register_node(node_type: str):
    """
    Decorator to register a node type in the workflow engine.

    Args:
        node_type (str): The type of the node to register.
    """

    def wrapper(cls):
        NODE_REGISTRY[node_type] = cls
        return cls

    return wrapper


def create_node(node_type: str, **kwargs) -> BaseNode:
    """
    Create a node of the specified type with the given parameters.

    Args:
        node_type (str): The type of the node to create.

    Raises:
        ValueError: If the node type is not registered.

    Returns:
        BaseNode: An instance of the specified node type.
    """
    if node_type not in NODE_REGISTRY:
        raise ValueError(f"Node type '{node_type}' is not registered.")
    return NODE_REGISTRY[node_type](**kwargs)


def register_edge(edge_type: str):
    """
    Decorator to register an edge type in the workflow engine.

    Args:
        edge_type (str): The type of the edge to register.
    """

    def wrapper(cls):
        EDGE_REGISTRY[edge_type] = cls
        return cls

    return wrapper


def create_edge(edge_type: str, **kwargs) -> BaseEdge:
    """
    Create an edge of the specified type with the given parameters.

    Args:
        edge_type (str): The type of the edge to create.

    Raises:
        ValueError: If the edge type is not registered.

    Returns:
        BaseEdge: An instance of the specified edge type.
    """
    if edge_type not in EDGE_REGISTRY:
        raise ValueError(f"Edge type '{edge_type}' is not registered.")
    return EDGE_REGISTRY[edge_type](**kwargs)
