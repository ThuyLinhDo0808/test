from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.dependencies.vector_store import get_vector_manager
from app.dependencies.sql import get_sql_manager
from app.dependencies.llm import get_llm, get_conversation_manager
from app.dependencies.stt import get_stt_recorder
from app.dependencies.tts import get_tts_stream
from app.dependencies.face import get_face_processor, get_liveness_dependencies
from app.dependencies.session import get_chat_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize dependencies
    get_llm()
    get_vector_manager()  # Automatically load the tokenizer
    get_sql_manager()
    get_stt_recorder()
    get_conversation_manager()
    get_tts_stream()
    get_face_processor()
    get_liveness_dependencies()
    get_chat_session().start()

    yield

    # Release memory
    get_chat_session().shutdown()
