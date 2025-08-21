import {useCallback, useEffect, useMemo, useRef} from "react";

/** Server payload */
export type EyeTrackingData = {
  has_face: boolean;
  distance_cm?: number;
  proximity?: "FAR" | "MID" | "NEAR" | string;
  gaze_dir?: "LEFT" | "RIGHT" | "CENTER" | string;
  looking?: boolean;
  hx?: number;
  hy?: number;
  yaw_ratio?: number;
  eye_span_px?: number;
  [k: string]: unknown;
};

export type EyeTrackingConfig = {
  wsUrl: string;
  nth?: number;                 // send every Nth frame (natural throttle)
  quality?: number;             // JPEG quality 0..1
  downscalePct?: number;        // % of source size (e.g. 60)
  consecutiveNeeded?: number;   // hits required to declare ATTENTION
  lostNeeded?: number;          // misses required to declare LOST
  cooldownMs?: number;          // min ms between attention flips
  onServerMessage?: (d: EyeTrackingData) => void;
  onAttention?: () => void;
  onAttentionLost?: () => void;
};

export function useEyeTrackingCanvas(cfg: EyeTrackingConfig) {
  const {
    wsUrl,
    nth = 2,
    quality = 0.6,
    downscalePct = 60,
    consecutiveNeeded = 3,
    lostNeeded = 6,
    cooldownMs = 1000,
    onServerMessage,
    onAttention,
    onAttentionLost,
  } = cfg;

  // --- refs / state (no renders from these) ---
  const wsRef = useRef<WebSocket | null>(null);
  const runningRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // internal off-DOM canvas (we reuse a single canvas/context)
  const canvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const vfcHandleRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);

  // attention hysteresis
  const attentionRef = useRef(false);
  const hitRef = useRef(0);
  const missRef = useRef(0);
  const lastFlipRef = useRef(0);

  // ---------- helpers ----------
  const ensureMedia = useCallback(async () => {
    if (streamRef.current && streamRef.current.getVideoTracks()[0]?.readyState === "live") {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;

    // attach to hidden/visible <video> for reliability (and iOS)
    const el = videoRef.current;
    if (el) {
      el.srcObject = stream;
      el.playsInline = true;
      el.muted = true;
      try { await el.play(); } catch { /* autoplay may require gesture; stream still live */ }
    }
  }, []);

  function ensureCanvas(dw: number, dh: number) {
    if (!canvasRef.current) {
      if (typeof OffscreenCanvas !== "undefined") {
        canvasRef.current = new OffscreenCanvas(dw, dh);
      } else {
        const c = document.createElement("canvas");
        c.width = dw; c.height = dh;
        canvasRef.current = c;
      }
    }
    const c = canvasRef.current!;
    if (c instanceof HTMLCanvasElement) { c.width = dw; c.height = dh; }
    else { c.width = dw; c.height = dh; }

    if (!ctxRef.current) {
      ctxRef.current = (c as any).getContext("2d");
    }
  }

  async function drawCurrentFrameToCanvas(dw: number, dh: number): Promise<boolean> {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return false; // not ready
    ensureCanvas(dw, dh);
    const ctx = ctxRef.current!;
    // faster enough at these sizes; optionally set smoothing low for speed
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = "low";
    ctx.drawImage(v, 0, 0, dw, dh);
    return true;
  }

  async function canvasToJPEGArrayBuffer(quality: number): Promise<ArrayBuffer> {
    const c = canvasRef.current!;
    if ("convertToBlob" in c) {
      const blob = await (c as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
      return await blob.arrayBuffer();
    }
    const blob: Blob = await new Promise(res =>
      (c as HTMLCanvasElement).toBlob(b => res(b || new Blob()), "image/jpeg", quality)
    );
    return await blob.arrayBuffer();
  }

  const sendOneFrame = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // backpressure: drop if > ~2MB queued
    if (ws.bufferedAmount > 2_000_000) return;

    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    const scale = Math.max(0.3, Math.min(1.0, downscalePct / 100));
    const dw = Math.max(2, Math.round(v.videoWidth * scale));
    const dh = Math.max(2, Math.round(v.videoHeight * scale));

    const ok = await drawCurrentFrameToCanvas(dw, dh);
    if (!ok) return;

    const buf = await canvasToJPEGArrayBuffer(quality);
    ws.send(buf);
  }, [downscalePct, quality]);

  // --------- pump (rVFC preferred, fallback to rAF) ----------
  const stopLoops = useCallback(() => {
    if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    const vid = videoRef.current as any;
    if (vid && typeof vid.cancelVideoFrameCallback === "function" && vfcHandleRef.current != null) {
      vid.cancelVideoFrameCallback(vfcHandleRef.current);
      vfcHandleRef.current = null;
    }
  }, []);

  const loopRAF = useCallback(() => {
    if (!runningRef.current) { rafIdRef.current = null; return; }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) { rafIdRef.current = null; return; }

    frameCountRef.current++;
    if (frameCountRef.current % nth === 0) {
      // fire & forget; the async work continues
      void sendOneFrame();
    }
    rafIdRef.current = requestAnimationFrame(loopRAF);
  }, [nth, sendOneFrame]);

  const loopVFC = useCallback((now: number, meta: VideoFrameCallbackMetadata) => {
    if (!runningRef.current) { vfcHandleRef.current = null; return; }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) { vfcHandleRef.current = null; return; }

    frameCountRef.current++;
    if (frameCountRef.current % nth === 0) {
      void sendOneFrame();
    }
    const vid = videoRef.current as any;
    vfcHandleRef.current = vid.requestVideoFrameCallback(loopVFC);
  }, [nth, sendOneFrame]);

  const startLoops = useCallback(() => {
    const vid = videoRef.current as any;
    if (vid && typeof vid.requestVideoFrameCallback === "function") {
      vfcHandleRef.current = vid.requestVideoFrameCallback(loopVFC);
    } else {
      rafIdRef.current = requestAnimationFrame(loopRAF);
    }
  }, [loopRAF, loopVFC]);

  // ---------- WS handlers / attention state ----------
  const handleServerMessage = useCallback((ev: MessageEvent) => {
    let data: EyeTrackingData | null = null;
    try {
      data = typeof ev.data === "string" ? JSON.parse(ev.data) as EyeTrackingData : null;
    } catch { data = null; }
    if (!data) return;

    onServerMessage?.(data);

    const now = performance.now();
    const canFlip = (now - lastFlipRef.current) >= cooldownMs;

    // condition flags
    const hasFace = Boolean(data.has_face);
    const isLooking = Boolean(data.looking);

    if (hasFace && isLooking) {
      // positive case: reset miss, count hit
      hitRef.current += 1;
      missRef.current = 0;

      if (!attentionRef.current && hitRef.current >= consecutiveNeeded && canFlip) {
        attentionRef.current = true;
        lastFlipRef.current = now;
        onAttention?.();
      }
    } else {
      // either has_face === false OR looking === false
      missRef.current += 1;
      hitRef.current = 0;
      
      if (attentionRef.current && missRef.current >= lostNeeded && canFlip) {
        attentionRef.current = false;
        lastFlipRef.current = now;
        onAttentionLost?.();
      }
    }
  }, [onServerMessage, onAttention, onAttentionLost, consecutiveNeeded, lostNeeded, cooldownMs]);
 
  // ---------- start / stop ----------
  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    await ensureMedia();

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      startLoops();
      // reset counters
      frameCountRef.current = 0;
      hitRef.current = 0;
      missRef.current = 0;
      attentionRef.current = false;
      lastFlipRef.current = 0;
      // eslint-disable-next-line no-console
      console.log("[EyeTracking] open");
    };
    ws.onmessage = handleServerMessage;
    ws.onerror = (e) => { console.warn("[EyeTracking] ws error", e); };
    ws.onclose = () => { console.log("[EyeTracking] close"); };
  }, [wsUrl, ensureMedia, handleServerMessage, startLoops]);

  const stop = useCallback(() => {
    runningRef.current = false;
    stopLoops();

    // close WS
    try { wsRef.current?.close(1000, "client-stop"); } catch {}
    wsRef.current = null;

    // stop media
    const stream = streamRef.current;
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    streamRef.current = null;

    // clear <video>
    const v = videoRef.current;
    if (v && v.srcObject) { v.srcObject = null; }

    // reset counters
    frameCountRef.current = 0;
    hitRef.current = 0;
    missRef.current = 0;
    attentionRef.current = false;
    lastFlipRef.current = 0;
  }, [stopLoops]);

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ start, stop, videoRef }), [start, stop]);
}
