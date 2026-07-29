"use client";

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { API_HOST } from "@/lib/constants";

const SCAN_INTERVAL_MS = 1200;
const STABILITY_MS = 3000;
const TOTAL_TIMEOUT_MS = 60000;

const LivenessCheck = forwardRef(function LivenessCheck(
  {
    onResult,
  }: {
    onResult: (livenessToken: string | null) => void;
  },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // UI state
  const [result, setResult] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // control refs
  const pollingRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const stabilityTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const startTsRef = useRef<number | null>(null);

  const stopAll = () => {
    // stop polling
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // stop stability timer
    if (stabilityTimerRef.current) {
      window.clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
    // stop global timeout
    if (timeoutTimerRef.current) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    // stop camera
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
  };

  const submitSuccess = (token: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setResult("✅ Passed liveness check");
    setShowPopup(true);

    window.setTimeout(() => {
      setShowPopup(false);
      onResult(token);
      stopAll();
    }, 300); // small UI grace; not the 3s stability (already elapsed)
  };

  const submitFailure = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setResult("❌ Liveness timed out");
    setShowPopup(true);

    window.setTimeout(() => {
      setShowPopup(false);
      onResult(null);
      stopAll();
    }, 300);
  };

  const startCamera = async () => {
    if (typeof window === "undefined" || !navigator?.mediaDevices) {
      console.warn("Camera not available");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      setResult("⚠️ Camera error");
      setShowPopup(true);
    }
  };

  const checkOnce = async () => {
    if (processingRef.current) return;
    if (!videoRef.current) return;

    processingRef.current = true;

    // snapshot
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      processingRef.current = false;
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    await new Promise<void>((resolve) =>
      canvas.toBlob(async (blob) => {
        if (!blob) {
          processingRef.current = false;
          return resolve();
        }

        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");

        try {
          const res = await fetch(
            `http://${API_HOST}/api/chat/chatbot/liveness_check/`,
            { method: "POST", body: formData }
          );
          const data = await res.json();
          const isLive = data?.liveness_result === true;

          if (isLive) {
            // Start/ensure a stability window. If already running, keep it.
            if (!stabilityTimerRef.current) {
              setResult("✅ Detected live face — holding for 3s…");
              setShowPopup(true);

              stabilityTimerRef.current = window.setTimeout(() => {
                // stability held for STABILITY_MS; accept
                const token = data.token ?? "liveness-token-placeholder";
                submitSuccess(token);
              }, STABILITY_MS);
            }
          } else {
            // Any false during the 3s window cancels confirmation
            if (stabilityTimerRef.current) {
              window.clearTimeout(stabilityTimerRef.current);
              stabilityTimerRef.current = null;
              setResult("🔎 Rechecking… hold steady in frame");
              setShowPopup(true);
            }
            // Do not auto-submit false here; just continue polling
          }
        } catch (error) {
          console.error("Liveness detection failed:", error);
          // Treat as a transient error; don’t submit, keep polling
          setResult("⚠️ Network hiccup — retrying…");
          setShowPopup(true);
        } finally {
          processingRef.current = false;
          resolve();
        }
      }, "image/jpeg")
    );
  };

  const startLoop = async () => {
    stopAll(); // reset any prior run
    hasSubmittedRef.current = false;
    startTsRef.current = Date.now();

    await startCamera();

    // Global timeout: if no stable true in 60s => fail
    timeoutTimerRef.current = window.setTimeout(() => {
      if (!hasSubmittedRef.current) submitFailure();
    }, TOTAL_TIMEOUT_MS);

    // Begin polling
    pollingRef.current = window.setInterval(checkOnce, SCAN_INTERVAL_MS);
  };

  useEffect(() => {
    // auto-start on mount
    startLoop();
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    // Allow parent to restart the whole flow if needed
    start: startLoop,
  }));

  return (
<<<<<<< HEAD
    <div className="flex flex-col h-full max-w-full p-4">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Face Liveness Check</h2>
        <p className="text-sm text-gray-600 mt-1">
          Keep your face inside the oval, well-lit, and steady for verification.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        {/* Camera with face guide - larger and centered */}
        <div className="relative w-full max-w-[600px] aspect-[4/3] bg-black overflow-hidden rounded-lg border shadow-md">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[40%] h-[55%] border-4 border-white rounded-full scale-y-[1.2]" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              1
            </div>
            <span className="text-gray-700">Position face</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              2
            </div>
            <span className="text-gray-700">Good lighting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              3
            </div>
            <span className="text-gray-700">Hold steady</span>
          </div>
        </div>

        {result && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center max-w-md">
            {result}
          </div>
        )}
      </div>
    </div>
  )
})
=======
    <div className="flex flex-col md:flex-row max-w-5xl mx-auto p-6 gap-8">
      {/* Left: Camera + face guide */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="relative w-full aspect-[7/8] max-w-sm bg-black overflow-hidden rounded-xl border shadow-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Vertical oval face alignment overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[55%] h-[50%] border-4 border-white rounded-full scale-y-[1.2]" />
          </div>
        </div>
      </div>

      {/* Right: Instructions and result */}
      <div className="w-full md:w-1/2 space-y-5 flex flex-col justify-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Face Liveness Check</h2>
          <p className="text-sm text-gray-600 mt-2">
            Keep your face inside the oval, well-lit, and steady. We’ll auto-verify
            and submit once stable for 3 seconds.
          </p>
        </div>

        {/* No manual button now */}
        <div className="text-sm text-gray-600">
          Status: <span className="font-medium">{result || "Scanning…"}</span>
        </div>
      </div>

      {/* Top-right popup */}
      {showPopup && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-gray-200 shadow-lg px-4 py-3 rounded-md text-gray-800">
          {result}
        </div>
      )}
    </div>
  );
});
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

export default LivenessCheck;
