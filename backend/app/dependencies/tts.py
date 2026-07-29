from functools import lru_cache
from app.services import TtsService, TtsPipeline
from app.dependencies.llm import get_conversation_manager


@lru_cache(maxsize=1)
def get_tts_stream() -> TtsPipeline:
    service = TtsService()

    pipeline = TtsPipeline(
        synthesizer=service, conversation_manager=get_conversation_manager()
    )

    return pipeline
