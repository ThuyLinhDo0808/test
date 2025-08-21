import math
from typing import Any, Dict, Optional
import cv2
import numpy as np
import mediapipe as mp

# ===================== Config (adjust as needed) =====================
MAX_FACES = 1
REFINE = True
MIN_DET_CONF = 0.5
MIN_TRK_CONF = 0.5

# Distance / smoothing
SCALE_CONST = 2880.62  # your measured constant
SMOOTH_ALPHA = 0.25  # EMA smoothing
FAR_DIST_CM = 60.0  # your baseline calibration distance
MID_THRESHOLD_CM = FAR_DIST_CM * 0.90
NEAR_THRESHOLD_CM = FAR_DIST_CM * 0.60

# Gaze thresholds
HX_THR = 0.65
HY_THR = 0.65

# Head-yaw sanity via eye-width ratio (left_width / right_width)
YAW_RATIO_MIN = 0.45
YAW_RATIO_MAX = 2

# Landmark indices (MediaPipe FaceMesh with refined landmarks)
# Right eye (subject's R, image left)
RIGHT_EYE_OUTER = 33
RIGHT_EYE_INNER = 133
RIGHT_EYE_TOP = 159
RIGHT_EYE_BOT = 145
RIGHT_IRIS = [474, 475, 476, 477]

# Left eye (subject's L, image right)
LEFT_EYE_OUTER = 263
LEFT_EYE_INNER = 362
LEFT_EYE_TOP = 386
LEFT_EYE_BOT = 374
LEFT_IRIS = [469, 470, 471, 472]


# =============================== Utils ===============================


def proximity_status(dist_cm: Optional[float]) -> str:
    if dist_cm is None:
        return "UNKNOWN"
    if dist_cm <= NEAR_THRESHOLD_CM:
        return "NEAR"
    if dist_cm <= MID_THRESHOLD_CM:
        return "MID"
    return "FAR"


def _pt(lmk, idx, w, h):
    p = lmk[idx]
    return p.x * w, p.y * h


def eye_metrics(lmk, w, h, inner_idx, outer_idx, top_idx, bot_idx, iris_idxs):
    # Eye geometry
    ix, iy = _pt(lmk, inner_idx, w, h)
    ox, oy = _pt(lmk, outer_idx, w, h)
    tx, ty = _pt(lmk, top_idx, w, h)
    bx, by = _pt(lmk, bot_idx, w, h)

    # Iris center = mean of ring points (robust)
    iris_xy = np.array([_pt(lmk, i, w, h) for i in iris_idxs], dtype=np.float32)
    cx, cy = iris_xy.mean(axis=0)

    # Normalize offsets within eye box
    center_x = 0.5 * (ix + ox)
    center_y = 0.5 * (ty + by)
    half_w = 0.5 * abs(ix - ox)
    half_h = 0.5 * abs(by - ty)
    if half_w < 1e-3 or half_h < 1e-3:
        return None

    hx = (cx - center_x) / half_w
    hy = (cy - center_y) / half_h

    width_px = abs(ix - ox)
    return {
        "hx": float(hx),
        "hy": float(hy),
        "width_px": float(width_px),
    }


def classify_gaze(hx_avg, hy_avg, ax, ay):
    if ax <= HX_THR and ay <= HY_THR:
        return "CENTER"
    if abs(hx_avg) > abs(hy_avg):
        return "RIGHT" if hx_avg > 0 else "LEFT"
    else:
        return "DOWN" if hy_avg > 0 else "UP"


# =====================================================================


class FaceProcessor:
    """
    FaceProcessor for eye tracking and distance estimation.
    Uses MediaPipe FaceMesh for eye landmarks and ONNX model for liveness.
    Supports gaze calibration and provides metrics like distance, gaze direction,
    and 'looking at camera' classification.
    """

    def __init__(self):
        # --- FaceMesh (persistent across frames) ---
        self.mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=MAX_FACES,
            refine_landmarks=REFINE,
            min_detection_confidence=MIN_DET_CONF,
            min_tracking_confidence=MIN_TRK_CONF,
        )

        # Distance smoothing
        self.ema_dist: Optional[float] = None

        # Gaze bias (can be set by calibrate_gaze())
        self.gaze_bias_hx: float = 0.0
        self.gaze_bias_hy: float = 0.0
        self.has_gaze_calib: bool = False

    # -------------------- Gaze calibration --------------------
    def calibrate_gaze(self, hx: float, hy: float):
        """
        Set gaze bias offsets for calibration.

        Args:
            hx (float): Horizontal gaze offset (normalized).
            hy (float): Vertical gaze offset (normalized).
        """
        self.gaze_bias_hx = hx
        self.gaze_bias_hy = hy
        self.has_gaze_calib = True

    # -------------------- Eye tracking -----------------------
    def process_frame(self, frame_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Eye tracking + distance + 'looking at camera' classification.
        Returns a compact dict with metrics. (No visualization.)
        """
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        res = self.mesh.process(rgb)
        rgb.flags.writeable = True

        out = {
            "has_face": bool(res.multi_face_landmarks),
            "distance_cm": None,
            "proximity": "UNKNOWN",
            "gaze_dir": "—",
            "looking": False,
            "hx": None,
            "hy": None,
            "yaw_ratio": None,
            "eye_span_px": None,
        }

        if not res.multi_face_landmarks:
            return out

        lmk = res.multi_face_landmarks[0].landmark

        # Outer corners for distance proxy
        rx, ry = int(lmk[RIGHT_EYE_OUTER].x * w), int(lmk[RIGHT_EYE_OUTER].y * h)
        lx, ly = int(lmk[LEFT_EYE_OUTER].x * w), int(lmk[LEFT_EYE_OUTER].y * h)
        d_px = math.hypot(lx - rx, ly - ry)
        out["eye_span_px"] = d_px

        if d_px and SCALE_CONST:
            dist_raw = SCALE_CONST / d_px
            self.ema_dist = (
                dist_raw
                if self.ema_dist is None
                else (SMOOTH_ALPHA * dist_raw + (1 - SMOOTH_ALPHA) * self.ema_dist)
            )
            out["distance_cm"] = float(self.ema_dist)
            out["proximity"] = proximity_status(self.ema_dist)

        # Per-eye metrics
        m_right = eye_metrics(
            lmk,
            w,
            h,
            RIGHT_EYE_INNER,
            RIGHT_EYE_OUTER,
            RIGHT_EYE_TOP,
            RIGHT_EYE_BOT,
            RIGHT_IRIS,
        )
        m_left = eye_metrics(
            lmk,
            w,
            h,
            LEFT_EYE_INNER,
            LEFT_EYE_OUTER,
            LEFT_EYE_TOP,
            LEFT_EYE_BOT,
            LEFT_IRIS,
        )
        if not (m_right and m_left):
            return out

        # Head yaw proxy
        yaw_ratio = (m_left["width_px"] + 1e-6) / (m_right["width_px"] + 1e-6)
        head_ok = YAW_RATIO_MIN <= yaw_ratio <= YAW_RATIO_MAX
        out["yaw_ratio"] = float(yaw_ratio)

        # Average gaze offsets (+ optional bias)
        hx_avg = 0.5 * (m_left["hx"] + m_right["hx"]) - (
            self.gaze_bias_hx if self.has_gaze_calib else 0.0
        )
        hy_avg = 0.5 * (m_left["hy"] + m_right["hy"]) - (
            self.gaze_bias_hy if self.has_gaze_calib else 0.0
        )
        ax, ay = abs(hx_avg), abs(hy_avg)

        gaze_dir = classify_gaze(hx_avg, hy_avg, ax, ay)
        eyes_forward = ax <= HX_THR and ay <= HY_THR
        looking = eyes_forward and head_ok

        out.update(
            {
                "gaze_dir": gaze_dir,
                "looking": bool(looking),
                "hx": float(hx_avg),
                "hy": float(hy_avg),
            }
        )
        return out
