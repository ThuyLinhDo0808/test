import json
import os
from functools import lru_cache

from app.core import MODEL_CONFIG_PATH, WORKFLOW_CONFIG_PATH
from app.dependencies.sql import get_sql_manager
from app.dependencies.vector_store import get_vector_manager
from app.models import GraphConfig
from app.services import ConversationManager
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_deepseek import ChatDeepSeek
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

# Here, we could switch to different LLM Provider such as vllm as well, as long as it inherits use the BaseChatModel interface.


@lru_cache(maxsize=1)
def get_llm(
    config_path: str = MODEL_CONFIG_PATH,
) -> BaseChatModel:
    config = json.load(open(config_path, "r"))
    provider = config.get("backend_provider", "ollama")
    model_name = config.get("model_name", "llama3.2")
    base_url = config.get("base_url", "http://localhost:11434")
    api_key = config.get("api_key", "")

    if provider == "ollama":
        llm = ChatOllama(model=model_name, base_url=base_url)
    elif provider == "deepseek":
        llm = ChatDeepSeek(model=model_name, api_key=api_key)
    elif provider == "openai":
        llm = ChatOpenAI(model=model_name, api_key=api_key)
    else:
        raise ValueError(f"Unsupported model backend provider: {provider}")

    # Preload the model to avoid latency during the first request
    _ = llm.invoke("Hi from preload")

    return llm


@lru_cache(maxsize=1)
def get_conversation_manager() -> ConversationManager:
    """
    Creates and returns a ConversationManager instance.

    Returns:
        ConversationManager: An instance of the ConversationManager class.
    """
    # Load json config file
    with open(WORKFLOW_CONFIG_PATH, "r") as f:
        workflow_config = json.load(f)
        workflow_config = GraphConfig(**workflow_config)

    manager = ConversationManager(
        llm=get_llm(),
        vector_manager=get_vector_manager(),
        sql_manager=get_sql_manager(),
        config=workflow_config,
    )

    return manager
