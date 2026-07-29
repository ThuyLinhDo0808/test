This markdown file explains the role of each sub folder backend:

- api: All HTTP routes (FastAPI routers). Should be thin - just parse request, call service, return response.

- core: Core configurations (settings, middleware, etc).

- dependencies: Shared resources via Depends(). Holds long-living objects and ensures models/clients don’t get reloaded every request.

- services: Business logic and model wrappers. Encapsulates reusable logic for handling AI tasks.

- utils: Shared helper functions.

- models: Pydantic models

To run the backend locally:

1. You will need to run celery using this command: celery -A app.tasks.worker worker --loglevel=info --pool=solo

Do note that redis stopped supporting Windows, so run a Redis image using Docker instead then run celery with the previous command.

2. Run the server with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

3. To test out the routes, use the tests route which contain html code to interact.

This section explains how the workflow_service works:

- Nodes and edges have to inherite and implement the `__call__` and `get_metadata` functions of the base node and edge classes. The point of the `__call__` function is that the Node class instane can be called via this line: `MyNode()` after intialization, as this is called by Langgraph's graph class. As for the `get_metadata` function, this class help expose the registered nodes and edges to the frontend, so that the frontend does not have to reimplement these classes.
- To register nodes and edges, use the `register_node` and `register_edge` functions respectively which is available in registry.py in workflow under services module. These functions help register (add) the node and edge classes to a centralized registry: `NODE_REGISTRY` and `EDGE_REGISTRY`.
- The registries are used by the `GraphBuilder` (in workflow_service under services module) which builds Langchain graphs. Through these registries, the builder can access the node and edge classes fast and modularly to initialize and add these components to the Langchain's graph. The builder builds the graph using a `GraphConfig` instance (essentially a dictionary following a specific format) which is loaded via a json file. The registries are accessed by using the `create_node` and `create_edge` functions (both of which are then used by the `build` function of `GraphBuilder`) which by passing the unique name of the node, will return the corresponding class instance.
