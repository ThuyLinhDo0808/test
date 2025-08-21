# Workflow Module

The `workflow` module is responsible for managing the conversation flow, routing user queries, and generating responses. It integrates with language models, vector stores, and other services to handle user interactions and workflows.

---

## **Overview**

This module contains nodes to be used to create the graph with Langchain as the backend. The graphs are loaded from the workflow_config.json file, which are built by the GraphBuilder class. Each nodes / edges have access to a shared context (has singleton objects such as LLM, vector manager, sql manager, etc) for the nodes to function. Nodes can access these objects by using an unique key of those objects.

Nodes and edges must implement the **call** function (which is called by the graph internally), and the get_metadata function (so that GraphBuilder can determine runtime errors and ensure susbsequent nodes / edges have enough information to function properly)

The get_metadata function must return EdgeInfoModel (for edges) or NodeInfoModel (for nodes). Both have similar information, but EdgeInfoModel has the outputs field so that the GraphBuilder knows all the possible cases of an edge, while NodeInfoModel has the allow_input / allow_output field to determine if the node can only be used as the initial or end node. Both model has the name / description (for display purposes in the frontend), and parameters (optional parameters to be passed into the node/edge to change its behaviour - must be ElementParamModel which has data type, its own description, and default value). Nodes and edges also have the prerequisite fields so that the GraphBuilder can determine if the information it needs is provided by nodes before it

To create a new node, edge and add it to the registry, inherit the BaseNode / BaseEdge class and implement **call** and get_metadata functions. After that, use @register_node or @register_edge to automatically add it to the registry. The parameter you pass to register_node and register_edge must be unique, as it is used to identify the node/edge from the registry.

## **Workflow confi**

Now, look into the workflow_config.json file, you will see the following fields for a node:

{"name":"query_rewrite","node_type":"query_rewrite","position":{"x":166.49513479100472,"y":219.48220225318443},"params":null}

Note that the name in the workflow config file is different from the name in edge and node from the get_metadata function. name in the workflow config case is the unique name of that instance of the node (this means that there can be many instances of the same node type, but each instances must have different names). The node_type in workflow config is the name/parameter that you pass to register_node and register_edge. The name in workflow_config is used so that edges can have know which node instance to connect (using the from_node and to_node field)

{"from_node":"query_rewrite","to_node":"retrieve","connect_type":"direct","edge_type":"","position":{"x":0.0,"y":0.0},"params":null},

There are 2 edge types: direct and conditional:

- Direct: {"from_node":"query_rewrite","to_node":"retrieve","connect_type":"direct","edge_type":"","position":{"x":0.0,"y":0.0},"params":null
- Conditional: {"from_node":"starter","to_node":{"security_check":"security","database_search":"query_rewrite","general_answer":"fallback"},"connect_type":"conditional","edge_type":"routing","position":{"x":154.0,"y":18.999999999999858},"params":null},

The type of the edge is defined using the connect_type field which has 2 possible values: conditional or direct. If the connect_type is direct, then the edge_type field can be empty, if not, then edge_type must be filled. For conditional edge types, in to_node field, instead of a string (like in direct edges), you will have to pass in a dict where each key is the possible values of the outputs field the edge defines, and the values is the name of the node **instance** you defined in the workflow config.

Next, there is the entry_node field in workflow config, this is to define the starting point of the graph. By default, Langgraph push all updates the graph makes to the GraphState, thus, to filter and get the relevant messages the visitor needs to see, you must defined the allowed_nodes. This is basically nodes that you allow the graph to push to the frontend for display. In the workflow config, you pass the name of the node to allowed_nodes
