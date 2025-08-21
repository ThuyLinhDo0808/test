import os
from functools import lru_cache
import onnxruntime as ort
from insightface.app import FaceAnalysis
from app.services.face_service import FaceProcessor
from app.core import LIVENESS_MODEL_PATH, DEVICE, FACE_ANALYSIS_MODEL_PATH


@lru_cache(maxsize=1)
def get_face_processor() -> FaceProcessor:
    return FaceProcessor()


@lru_cache(maxsize=1)
def get_liveness_dependencies() -> tuple:
    face_app = FaceAnalysis(name="buffalo_l", root=FACE_ANALYSIS_MODEL_PATH)
    # GPU = 0, CPU = -1
    iddevice = 0 if DEVICE == "GPU" else -1
    face_app.prepare(ctx_id=iddevice)

    # Load ONNX model for liveness classification
    onnx_session = ort.InferenceSession(os.path.abspath(LIVENESS_MODEL_PATH))

    return face_app, onnx_session
