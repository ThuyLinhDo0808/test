from app.services import VectorStoreManager
from functools import lru_cache


@lru_cache(maxsize=1)
def get_vector_manager() -> VectorStoreManager:
    return VectorStoreManager()
