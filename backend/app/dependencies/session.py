from functools import lru_cache
from app.services import ChatSession
from app.dependencies.stt import get_stt_recorder
from app.dependencies.tts import get_tts_stream


@lru_cache(maxsize=1)
def get_chat_session() -> ChatSession:
    """
    Creates and returns a ChatSession instance.

    Returns:
        ChatSession: An instance of the ChatSession class.
    """
    return ChatSession(stt_pipeline=get_stt_recorder(), tts_pipeline=get_tts_stream())
