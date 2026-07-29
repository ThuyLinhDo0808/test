import json

from app.core import MODEL_CONFIG_PATH, WEBHOOK_CONFIG_PATH
from app.dependencies import (
    get_conversation_manager,
    get_sql_manager,
    get_vector_manager,
)
from app.models import (
    FAQ,
    GraphConfig,
    ModelConfig,
    VisitorCreate,
    VisitorDeleteByID,
    VisitorUpdateByID,
    WebhookConfig,
)
from app.services import (
    EDGE_REGISTRY,
    NODE_REGISTRY,
    ConversationManager,
    SQLManager,
    VectorStoreManager,
)
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from langchain.schema import HumanMessage

router = APIRouter()


@router.get("/dashboard/")
def admin_dashboard():
    """
    Admin dashboard route.

    This route is protected and requires admin authentication.

    Returns:
        dict: A message indicating the user has access to the admin dashboard.
    """
    return {"message": "Welcome. This is the admin dashboard."}


@router.get("/llm/")
async def get_llm_info():
    with open(MODEL_CONFIG_PATH, "r") as f:
        llm_config = json.load(f)

    return llm_config


@router.post("/llm/")
async def change_llm_config(config: ModelConfig):
    # Save the updated configuration to the file
    with open(MODEL_CONFIG_PATH, "w") as f:
        # If provider is not ollama but no api key is provided, raise an error
        if config.backend_provider != "ollama" and not config.api_key:
            return HTTPException(
                status_code=400, detail="API key is required for non-ollama providers."
            )

        json.dump(config.model_dump(), f)

    return {"message": "LLM configuration updated successfully."}


# FAQ routes
@router.get("/faqs/")
async def get_faqs(manager: VectorStoreManager = Depends(get_vector_manager)) -> dict:
    """
    Get all FAQs.

    Returns:
        dict: A dictionary containing a list of FAQs.
    """
    faqs = await manager.get_faqs()
    return {"faqs": faqs}


@router.post("/faqs/")
async def create_faq(
    faq: FAQ, manager: VectorStoreManager = Depends(get_vector_manager)
) -> dict:
    """
    Create a new FAQ.

    Args:
        faq (FAQ): Pydantic FAQ object

    Returns:
        dict: A dictionary containing the ID of the newly created FAQ and the FAQ object.
    """
    new_faq = await manager.add_faq(faq)
    return {"id": new_faq["id"], "faq": new_faq["faq"]}


@router.delete("/faqs/{faq_id}/")
async def delete_faq(
    faq_id: str, manager: VectorStoreManager = Depends(get_vector_manager)
) -> dict:
    """
    Delete an FAQ by its ID.

    Args:
        faq_id (str): The ID of the FAQ to delete.
    """
    status = await manager.delete_faq(faq_id)

    return {
        "status": status,
        "message": (
            f"FAQ with ID {faq_id} deleted successfully."
            if status
            else f"Failed to delete FAQ with ID {faq_id}."
        ),
    }


@router.put("/faqs/{faq_id}/")
async def update_faq(
    faq_id: str, faq: FAQ, manager: VectorStoreManager = Depends(get_vector_manager)
) -> dict:
    """
    Update an existing FAQ.

    Args:
        faq_id (str): The ID of the FAQ to update.
        faq (FAQ): Pydantic FAQ object containing the updated question and answer.

    Returns:
        dict: A dictionary containing the ID of the updated FAQ and the updated FAQ object.
    """
    updated_faq = await manager.update_faq(faq_id, faq)
    return {"id": updated_faq["id"], "faq": updated_faq["faq"]}


@router.get("/workflow/")
async def get_workflow(
    conversation_manager: ConversationManager = Depends(get_conversation_manager),
) -> dict:
    """
    Get the current workflow config

    Returns:
        dict: A dictionary containing the workflow configuration
    """
    config = conversation_manager.get_current_config()
    return {"config": config}


@router.put("/workflow/")
async def reload_workflow(
    workflow: GraphConfig,
    conversation_manager: ConversationManager = Depends(get_conversation_manager),
):
    """
    Update workflow of chatbot conversation

    Args:
        workflow (GraphConfig): The new workflow config to update.
    """
    try:
        await conversation_manager.reload_from_config(workflow)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid workflow configuration: {str(e)}"
        )


@router.get("/workflow/metadata/nodes/")
async def get_registered_nodes():
    return {k: v.get_metadata() for k, v in NODE_REGISTRY.items()}


@router.get("/workflow/metadata/edges/")
async def get_registered_edges():
    return {k: v.get_metadata() for k, v in EDGE_REGISTRY.items()}


@router.websocket("/workflow/test_flow/")
async def test_flow(
    ws: WebSocket,
    conversation_manager: ConversationManager = Depends(get_conversation_manager),
):
    """
    WebSocket endpoint for real-time node flow testing

    Accepts a text message from the client, processes it using the language model,
    and streams the node as it process through the workflow graph.

    Args:
        ws (WebSocket): The WebSocket connection instance.
        session (ChatSession): The injected chat session (singleton).
    """
    await ws.accept()

    try:
        while True:
            query = await ws.receive_text()

            inputs = {
                "messages": HumanMessage(content=query),
                "n_generations": 0,
                "max_retries": 3,
            }

            for content in conversation_manager.stream(inputs, all=True):
                await ws.send_json(content)
    except WebSocketDisconnect:
        print("Error: WebSocket disconnected")
        conversation_manager.clear_memory()

        # If there are any pending security checks, cancel them
        if conversation_manager.event_handler.do_security_check.is_set():
            conversation_manager.event_handler.set_security_check_results(cancel=True)


@router.post("/visitors/")
async def register_visitor(
    visitor: VisitorCreate, sql_manager: SQLManager = Depends(get_sql_manager)
):
    sql_manager.insert_visitor(visitor.model_dump())
    return {"message": "Visitor registered"}


@router.get("/visitors/")
async def get_visitors(sql_manager: SQLManager = Depends(get_sql_manager)):
    visitors = sql_manager.get_all_visitors()
    return {"visitors": visitors}


@router.post("/visitors/update_by_id/")
async def update_visitor_by_id(
    data: VisitorUpdateByID, sql_manager: SQLManager = Depends(get_sql_manager)
):
    updates = {
        k: v for k, v in data.model_dump().items() if v is not None and k != "id"
    }
    result = sql_manager.update_visitor_by_id(data.id, updates)
    return result


@router.post("/visitors/delete_by_id/")
async def delete_visitor_by_id(
    data: VisitorDeleteByID, sql_manager: SQLManager = Depends(get_sql_manager)
):
    result = sql_manager.delete_visitor_by_id(data.id)
    return result


@router.get("/webhook/config/")
async def get_webhook_config() -> dict:
    """
    Get the current webhook configuration.

    Returns:
        WebhookConfig: The current webhook configuration.
    """
    with open(WEBHOOK_CONFIG_PATH, "r") as f:
        webhook_config = json.load(f)

    print("Webhook config loaded:", WEBHOOK_CONFIG_PATH, webhook_config)

    return {"url": webhook_config["url"], "key": webhook_config["key"]}


@router.put("/webhook/config/")
async def update_webhook_config(config: WebhookConfig) -> dict:
    """
    Update the webhook configuration.

    Args:
        config (WebhookConfig): The new webhook configuration.

    Returns:
        dict: A message indicating the webhook configuration has been updated.
    """
    # Save the updated configuration to the file
    with open(WEBHOOK_CONFIG_PATH, "w") as f:
        json.dump({"url": config.url, "key": config.key}, f)

    return {"message": "Webhook configuration updated successfully."}
