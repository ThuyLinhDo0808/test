from functools import lru_cache
from app.services import SttPipeline, SttService


@lru_cache(maxsize=1)
def get_stt_recorder() -> SttPipeline:
    service = SttService()

    pipeline = SttPipeline(transcriber=service)

    return pipeline
