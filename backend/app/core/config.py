import os
import json
import torch
from pathlib import Path
from dotenv import load_dotenv


load_dotenv()

# MODEL
MODEL_CONFIG_PATH = os.getenv("MODEL_CONFIG_PATH", "./llm_config.json")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "llama3.2")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "documents")
CHROMA_PERSISTS_DIR = os.getenv("CHROMA_PERSISTS_DIR", "./chroma_langchain_db")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 7000))

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# WORKER
BASE_DIR = Path(__file__).resolve().parents[2]
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

UPLOAD_DIR = BASE_DIR / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXT = [".pdf", ".docx"]
CHUNK_SIZE = 400
CHUNK_OVERLAP = 0

# SQLDB
DB_PATH = BASE_DIR / "sql_db" / "sql.db"
os.makedirs(DB_PATH.parent, exist_ok=True)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Workflow
WORKFLOW_CONFIG_PATH = os.getenv("WORKFLOW_CONFIG_PATH", "./workflow_config.json")

# Create empty json if not already exists
if not Path(WORKFLOW_CONFIG_PATH).exists():
    with open(WORKFLOW_CONFIG_PATH, "w") as f:
        f.write("{}")

# STT
MAIN_STT_MODEL = os.getenv("MAIN_STT_MODEL", "distil-whisper/distil-large-v3.5-ct2")
RT_STT_MODEL = os.getenv("RT_STT_MODEL", "tiny.en")
STT_SILENCE_TIMEMOUT = os.getenv("STT_SILENCE_TIMEOUT", 1.5)
RT_PROCESSING_PAUSE = os.getenv("RT_PROCESSING_PAUSE", 0.02)

# TTS
SAMPLE_RATE = 24000
BYTES_PER_SAMPLE = 2
PIPELINE_LATENCY = 0.5
MAX_AUDIO_QUEUE_SIZE = int(os.getenv("MAX_AUDIO_QUEUE_SIZE", 50))
# Perhaps move these to a config file that we can change
VOICE = "af_heart"
LANG_CODE = "a"
SPEED = 0.9

# NOTIFICATION. Read from webhook_config.json file
WEBHOOK_CONFIG_PATH = os.getenv("WEBHOOK_CONFIG_PATH", "./webhook_config.json")

# Create empty json if not already exists with empty url and key
if not Path(WEBHOOK_CONFIG_PATH).exists():
    with open(WEBHOOK_CONFIG_PATH, "w") as f:
        f.write('{"url": "", "key": ""}')

# LIVENESS
LIVENESS_MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "models",
    "liveness",
    "mobilenet_v3_small.onnx",
)

FACE_ANALYSIS_MODEL_PATH = (
    Path(__file__).resolve().parent.parent.parent / "models" / "face_analysis"
)
