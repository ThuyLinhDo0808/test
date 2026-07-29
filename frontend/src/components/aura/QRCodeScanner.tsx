"use client";

import { useEffect, useRef, useState } from "react";
<<<<<<< HEAD
import { HTMLCanvasElementLuminanceSource } from "@zxing/browser";
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  NotFoundException,
} from "@zxing/library";
import Image from "next/image";
import { decode as base45Decode } from "base45";
import { inflate } from "pako";

type QrResult = { card_id: string; name: string; dob: string } | null;

/* ---------------- Helpers: DOB ---------------- */
=======
import { BrowserQRCodeReader } from "@zxing/browser";
import Image from "next/image";

type QrResult = { card_id: string; name: string; dob: string } | null;

/** ---------- Helpers: DOB ---------- */
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isValidYMD(d: number, m: number, y: number) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === m &&
    dt.getUTCDate() === d
  );
}

function normalizeDob(rawDob: string): string {
  const raw = rawDob.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const d = +m[1], mo = +m[2], y = +m[3];
    if (isValidYMD(d, mo, y)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }

<<<<<<< HEAD
  // ISO or ISO + time
=======
  // ISO or ISO + time: YYYY-MM-DD or "YYYY-MM-DD 00:00:00"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (isValidYMD(d, mo, y)) return `${m[1]}-${m[2]}-${m[3]}`;
  }

<<<<<<< HEAD
  // 8 digits: try DDMMYYYY then YYYYMMDD
=======
  // 8 digits ⇒ try DDMMYYYY first, then YYYYMMDD
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  if (/^\d{8}$/.test(raw)) {
    const d1 = +raw.slice(0, 2);
    const m1 = +raw.slice(2, 4);
    const y1 = +raw.slice(4, 8);
    if (isValidYMD(d1, m1, y1)) return `${y1}-${pad2(m1)}-${pad2(d1)}`;

    const y2 = +raw.slice(0, 4);
    const m2 = +raw.slice(4, 6);
    const d2 = +raw.slice(6, 8);
    if (isValidYMD(d2, m2, y2)) return `${y2}-${pad2(m2)}-${pad2(d2)}`;
  }

  console.warn("Unknown DOB format:", rawDob);
<<<<<<< HEAD
  return raw;
=======
  return raw; // let caller decide (will fail validation upstream)
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}

function isDate(s: string): boolean {
  const t = s.trim();
  return (
<<<<<<< HEAD
    /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(t) ||
    /^\d{8}$/.test(t) ||
    /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(t)
  );
}

/* ---------------- Helpers: ID ---------------- */
const cleanId = (s: string) => s.replace(/[\s-]/g, "");
const isLikelyId = (s: string) => /^[A-Za-z0-9]{6,}$/.test(cleanId(s));

/* ---------------- Extraction ---------------- */
=======
    /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(t) || // 28/10/2007 or 28-10-2007
    /^\d{8}$/.test(t) ||                          // 28102007 / 20071028
    /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(t)      // 2007-10-28 or with time
  );
}

/** ---------- Helpers: ID ---------- */
const cleanId = (s: string) => s.replace(/[\s-]/g, "");
const isLikelyId = (s: string) => /^[A-Za-z0-9]{6,}$/.test(cleanId(s));

/** ---------- Core extraction ---------- */
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
function extractFields(parts: string[]): QrResult {
  if (parts.length < 3) return null;

  // Trim + drop empties
  const tokens = parts.map((p) => p.trim()).filter(Boolean);

  // Find DOB anywhere
  const dobIdx = tokens.findIndex(isDate);
  const dob = dobIdx !== -1 ? normalizeDob(tokens[dobIdx]) : null;

  // Find an ID token (allow alphanumeric; ignore the date token)
  const cardIdx = tokens.findIndex(
    (p, idx) => idx !== dobIdx && isLikelyId(p)
  );
  const card_id = cardIdx !== -1 ? cleanId(tokens[cardIdx]) : null;

  // Name: a token with letters that is neither ID nor DOB
  const name = tokens.find(
    (p, idx) => idx !== dobIdx && idx !== cardIdx && /\p{L}/u.test(p)
  );

  if (card_id && name && dob) return { card_id, name, dob };
  return null;
}

<<<<<<< HEAD
/* ---------------- Driver license quick path (3 tokens) ---------------- */
function parseDriverLicense(parts: string[]): QrResult {
  const tokens = parts.map((p) => p.trim()).filter(Boolean);
  if (tokens.length !== 3) return null;

  const di = tokens.findIndex(isDate);
  if (di >= 0) {
    const dob = normalizeDob(tokens[di]);
    const [a, b] = tokens.filter((_, i) => i !== di);
    const maybeId = cleanId(a);
    const maybeName = b;
    if (isLikelyId(maybeId) && /\p{L}/u.test(maybeName)) {
      return { card_id: maybeId, name: maybeName, dob };
    }
  }

  const [id0, name0, dob0] = tokens;
  if (isDate(dob0) && isLikelyId(id0) && /\p{L}/u.test(name0)) {
    return { card_id: cleanId(id0), name: name0, dob: normalizeDob(dob0) };
  }
  return null;
}

/* ---------------- String payload parsing ---------------- */
function parseStringPayload(data: string): QrResult {
  const trimmed = data.trim();
  if (!trimmed) return null;

  // Base64
  try {
    const decoded = atob(trimmed);
    const gen = parseStringPayload(decoded);
    if (gen) return gen;
  } catch {}

  // Base45 (+ zlib) before JSON
  try {
    const bytes = base45Decode(trimmed) as unknown as Uint8Array;
    if (bytes && bytes.length) {
      let inflated: Uint8Array = bytes;
      try {
        inflated = inflate(bytes);
      } catch {}
      const text = new TextDecoder("utf-8").decode(inflated);
      const gen2 = parseStringPayload(text);
      if (gen2) return gen2;
    }
  } catch {}

  // Token split
  const parts = trimmed.split(/[;|,\n\t]+/g);
=======
/** Driver-license oriented quick path:
 * If exactly 3 meaningful tokens, assume [id, name, dob] OR detect which is date
 */
function parseDriverLicense(parts: string[]): QrResult {
  const tokens = parts.map((p) => p.trim()).filter(Boolean);
  if (tokens.length < 3) return null;

  if (tokens.length === 3) {
    const di = tokens.findIndex(isDate);
    if (di >= 0) {
      const dob = normalizeDob(tokens[di]);
      const [a, b] = tokens.filter((_, i) => i !== di);
      const maybeId = cleanId(a);
      const maybeName = b;
      if (isLikelyId(maybeId) && /\p{L}/u.test(maybeName)) {
        return { card_id: maybeId, name: maybeName, dob };
      }
    }
    // fallback to strict positions: id;name;dob
    const [id0, name0, dob0] = tokens;
    if (isDate(dob0) && isLikelyId(id0) && /\p{L}/u.test(name0)) {
      return { card_id: cleanId(id0), name: name0, dob: normalizeDob(dob0) };
    }
  }

  return null;
}

/** ---------- String payload parsing ---------- */
function parseStringPayload(data: string): QrResult {
  // Try common separators in one pass
  const parts = data.split(/[;|,\n\t]+/g);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  if (parts.length >= 3) {
    // Driver license fast path first
    const dl = parseDriverLicense(parts);
    if (dl) return dl;
    // Generic heuristic extraction
    const gen = extractFields(parts);
    if (gen) return gen;
  }

<<<<<<< HEAD
  // JSON
  try {
    const obj = JSON.parse(trimmed);
=======
  // Try JSON object with various keys
  try {
    const obj = JSON.parse(data);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    const card_id =
      obj.card_id || obj.id || obj.pid || obj.identity || obj.identityNo;
    const name = obj.name || obj.fullname || obj.full_name || obj.nameFull;
    const dob =
      obj.dob || obj.birth || obj.date_of_birth || obj.birthday || obj.dobStr;
    if (card_id && name && dob) {
      return {
        card_id: cleanId(String(card_id)),
        name: String(name),
        dob: normalizeDob(String(dob)),
      };
    }
<<<<<<< HEAD
  } catch {}
=======
  } catch {
    /* not JSON */
  }
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  return null;
}

<<<<<<< HEAD
/* ---------------- QR payload entry ---------------- */
async function parseQrPayload(text: string): Promise<QrResult> {
  return parseStringPayload(text);
=======
/** ---------- QR payload parsing (with Base64 + optional Base45) ---------- */
async function parseQrPayload(text: string): Promise<QrResult> {
  // Direct string
  let parsed = parseStringPayload(text);
  if (parsed) return parsed;

  // Base64
  try {
    const decoded = atob(text);
    parsed = parseStringPayload(decoded);
    if (parsed) return parsed;
  } catch {
    /* not base64 */
  }

  return null;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}

export default function QRCodeScanner({
  onComplete,
}: {
  onComplete: (formData: { card_id: string; name: string; dob: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
<<<<<<< HEAD
  const debugRef = useRef<HTMLDivElement>(null);
=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  const [, setResult] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
<<<<<<< HEAD
    if (!videoEl) return;

    // ZXing reader and hints
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    const reader = new MultiFormatReader();
    // hints is a Map<DecodeHintType, unknown> built above
    reader.setHints(hints);

    // Work and analysis canvases
    const workCanvas = document.createElement("canvas");
    const workSize = 896;
    workCanvas.width = workSize;
    workCanvas.height = workSize;
    const ctx = workCanvas.getContext("2d", { willReadFrequently: true })!;

    const analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = 128;
    analysisCanvas.height = 128;
    const actx = analysisCanvas.getContext("2d", { willReadFrequently: true })!;

    let stop = false;
    let timer: number | null = null;
    let lastTexts: string[] = [];
    let frameCount = 0;

    const stopStream = () => {
      stop = true;
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
      const tracks = 
        (videoEl as HTMLVideoElement & { srcObject: MediaStream | null })
          ?.srcObject?.getTracks?.() ?? [];
      tracks.forEach((t) => t.stop());
      (videoEl as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject = null;
    };

    const applyBestConstraints = async (track: MediaStreamTrack) => {
      try {
        const constraints: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        };
        await track.applyConstraints(constraints);
        console.log("camera settings", track.getSettings?.());
      } catch (e) {
        console.warn("applyConstraints failed", e);
      }
    };

    function enhanceROI(ctx: CanvasRenderingContext2D, w: number, h: number) {
      // 10th–90th percentile linear contrast stretch
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const N = d.length / 4;
      const hist = new Uint32Array(256);
      const gray = new Uint8Array(N);
      let k = 0;
      for (let i = 0; i < d.length; i += 4) {
        const g = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0;
        gray[k++] = g;
        hist[g]++;
      }
      const t10 = N * 0.1, t90 = N * 0.9;
      let cum = 0, p10 = 0, p90 = 255;
      for (let i = 0; i < 256; i++) { cum += hist[i]; if (cum >= t10) { p10 = i; break; } }
      cum = 0;
      for (let i = 0; i < 256; i++) { cum += hist[i]; if (cum >= t90) { p90 = i; break; } }
      const scale = p90 > p10 ? 255 / (p90 - p10) : 1;

      // apply stretch
      k = 0;
      for (let i = 0; i < d.length; i += 4) {
        const g = Math.max(0, Math.min(255, Math.round((gray[k++] - p10) * scale)));
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);

      // quick Laplacian variance to decide unsharp
      let acc = 0, acc2 = 0, count = 0;
      const wpx = w, hpx = h;
      const gi = ctx.getImageData(0, 0, wpx, hpx);
      const gd = gi.data;
      const ggray = new Uint8Array(wpx * hpx);
      for (let y = 0, idx = 0; y < hpx; y++) {
        for (let x = 0; x < wpx; x++, idx++) ggray[idx] = gd[idx * 4];
      }
      for (let y = 1; y < hpx - 1; y++) {
        for (let x = 1; x < wpx - 1; x++) {
          const i0 = y * wpx + x;
          const lap = -4 * ggray[i0] + ggray[i0 - 1] + ggray[i0 + 1] + ggray[i0 - wpx] + ggray[i0 + wpx];
          acc += lap; acc2 += lap * lap; count++;
        }
      }
      const meanLap = acc / Math.max(1, count);
      const focusVar = acc2 / Math.max(1, count) - meanLap * meanLap;

      if (focusVar < 400) {
        // light 3x3 unsharp mask
        const src = ctx.getImageData(0, 0, wpx, hpx);
        const sd = src.data;
        const out = ctx.createImageData(wpx, hpx);
        const od = out.data;
        for (let y = 1; y < hpx - 1; y++) {
          for (let x = 1; x < wpx - 1; x++) {
            let sum = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) sum += sd[((y + dy) * wpx + (x + dx)) * 4];
            }
            const j0 = (y * wpx + x) * 4;
            const b = (sum / 9) | 0;
            const hp = Math.min(255, Math.max(0, sd[j0] + (sd[j0] - b)));
            od[j0] = od[j0 + 1] = od[j0 + 2] = hp; od[j0 + 3] = 255;
          }
        }
        ctx.putImageData(out, 0, 0);
      }
    }

    const tryDecodeWithFallbacks = (): string => {
      const luminance = new HTMLCanvasElementLuminanceSource(workCanvas);

      // 1) Hybrid
      try {
        const bm = new BinaryBitmap(new HybridBinarizer(luminance));
        return reader.decode(bm).getText();
      } catch {}

      // 2) GlobalHistogram
      try {
        const bm = new BinaryBitmap(new GlobalHistogramBinarizer(luminance));
        return reader.decode(bm).getText();
      } catch {}

      // 3) Manual inverted pass (restore after)
      const original = ctx.getImageData(0, 0, workSize, workSize);
      const inv = ctx.getImageData(0, 0, workSize, workSize);
      const d = inv.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(inv, 0, 0);

      try {
        const luminanceInv = new HTMLCanvasElementLuminanceSource(workCanvas);
        const bm = new BinaryBitmap(new HybridBinarizer(luminanceInv));
        const res = reader.decode(bm).getText();
        ctx.putImageData(original, 0, 0);
        return res;
      } catch {}

      try {
        const luminanceInv = new HTMLCanvasElementLuminanceSource(workCanvas);
        const bm = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceInv));
        const res = reader.decode(bm).getText();
        ctx.putImageData(original, 0, 0);
        return res;
      } catch {}

      ctx.putImageData(original, 0, 0);
      throw new NotFoundException();
=======
    const codeReader = new BrowserQRCodeReader();

    const stopStream = () => {
      const tracks = (videoEl?.srcObject as MediaStream | null)?.getTracks() ?? [];
      tracks.forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    };

    const startScan = async () => {
      setResult(null);
      setError(null);

      try {
<<<<<<< HEAD
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });
        (videoEl as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject = stream;
        await videoEl.play().catch(() => {});

        const track = stream.getVideoTracks?.()[0];
        if (track) await applyBestConstraints(track);

        const SCALES = [1.0, 1.25, 1.5, 1.75, 2.0];
        const PAD = 32; // emulate quiet zone

        timer = window.setInterval(async () => {
          if (stop) return;

          const vw = videoEl.videoWidth || 0;
          const vh = videoEl.videoHeight || 0;
          if (vw === 0 || vh === 0) return;

          frameCount++;
          const useFull = frameCount % 12 === 0; // periodic full-frame

          const baseSide = Math.floor(Math.min(vw, vh) * (useFull ? 1.0 : 0.8));
          const baseX = Math.floor((vw - baseSide) / 2);
          const baseY = Math.floor((vh - baseSide) / 2);

          for (const scale of SCALES) {
            if (stop) break;

            // draw ROI with white padding
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, workSize, workSize);

            const cropSide = Math.max(48, Math.floor(baseSide / scale));
            const zx = Math.max(0, Math.floor(baseX + (baseSide - cropSide) / 2));
            const zy = Math.max(0, Math.floor(baseY + (baseSide - cropSide) / 2));

            ctx.drawImage(
              videoEl,
              zx,
              zy,
              Math.min(cropSide, vw - zx),
              Math.min(cropSide, vh - zy),
              PAD,
              PAD,
              workSize - 2 * PAD,
              workSize - 2 * PAD
            );
            enhanceROI(ctx!, workSize, workSize);

            // diagnostics overlay (contrast/focus/module estimates)
            try {
              const diagW = 128;
              const diagH = 128;
              actx.drawImage(
                workCanvas,
                PAD,
                PAD,
                workSize - 2 * PAD,
                workSize - 2 * PAD,
                0,
                0,
                diagW,
                diagH
              );
              const imgSmall = actx.getImageData(0, 0, diagW, diagH);
              const dd = imgSmall.data;
              const N = dd.length / 4;
              const hist = new Uint32Array(256);
              const gray = new Uint8Array(N);
              let k = 0;
              for (let i = 0; i < dd.length; i += 4) {
                const g = ((dd[i] * 299 + dd[i + 1] * 587 + dd[i + 2] * 114) / 1000) | 0;
                gray[k] = g;
                hist[g]++;
                k++;
              }
              const t10 = N * 0.1;
              const t90 = N * 0.9;
              let cum = 0,
                p10 = 0,
                p90 = 255;
              for (let i = 0; i < 256; i++) {
                cum += hist[i];
                if (cum >= t10) {
                  p10 = i;
                  break;
                }
              }
              cum = 0;
              for (let i = 0; i < 256; i++) {
                cum += hist[i];
                if (cum >= t90) {
                  p90 = i;
                  break;
                }
              }
              const contrast = p90 - p10;

              let acc = 0,
                acc2 = 0,
                count = 0;
              for (let y = 1; y < diagH - 1; y++) {
                for (let x = 1; x < diagW - 1; x++) {
                  const i0 = y * diagW + x;
                  const lap =
                    -4 * gray[i0] + gray[i0 - 1] + gray[i0 + 1] + gray[i0 - diagW] + gray[i0 + diagW];
                  acc += lap;
                  acc2 += lap * lap;
                  count++;
                }
              }
              const meanLap = acc / count;
              const focusVar = acc2 / count - meanLap * meanLap;

              const estModuleSrc = Math.round(cropSide / 29);
              const estModuleCanvas = Math.round((workSize - 2 * PAD) / 29);
              const dbg = `scale=${scale.toFixed(2)} crop=${cropSide}px; module≈${estModuleSrc}px(src)/${estModuleCanvas}px(canvas); contrast≈${contrast}; focus≈${Math.round(
                focusVar
              )}`;
              if (debugRef.current) debugRef.current.textContent = dbg;
              if (frameCount % 12 === 0) console.debug("QR diagnostics:", dbg);
            } catch {}

            try {
              const text = tryDecodeWithFallbacks();

              // multi-frame voting
              lastTexts.unshift(text);
              lastTexts = lastTexts.slice(0, 6);
              const count = lastTexts.filter((t) => t === text).length;
              if (count >= 2) {
                const parsed = await parseQrPayload(text);
                if (parsed) {
                  stopStream();
                  onComplete(parsed);
                  return;
                }
              }
            } catch (err) {
              if (!(err instanceof NotFoundException)) {
                // keep trying
              }
            }
          }
        }, 120);
=======
        const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoEl!);
        const text = result.getText();
        setResult(text);

        const parsed = await parseQrPayload(text);
        if (parsed) {
          stopStream();         // stop camera immediately after success
          onComplete(parsed);
        } else {
          setError("Invalid QR format. Expected at least 3 fields.");
          stopStream();         // stop to avoid keeping camera on after failure
        }
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      } catch (err) {
        setError("Failed to read from camera.");
        console.error(err);
        stopStream();
      }
    };

    startScan();
    return stopStream;
  }, [onComplete]);

  return (
<<<<<<< HEAD
    <div className="flex flex-col h-full w-full">
      {/* Header Section - Made header more compact */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Scanner</h1>
        <p className="text-base text-gray-600">
          Position your Driver License, ID Card, or VNeID QR code within the scanning area
        </p>
      </div>

      {/* Main Scanner Section - Redesigned layout for better proportions */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Video Scanner - Made scanner much larger and more professional */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative aspect-square w-full max-w-md border rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" />

            {/* Professional QR overlay - Redesigned overlay to be cleaner and larger */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Main scanning frame - Made much larger for better document scanning */}
              <div className="relative w-[70%] h-[70%] border-4 border-blue-500 rounded-2xl bg-blue-500/5 backdrop-blur-sm">
                {/* Corner indicators - Made corners more prominent and professional */}
                <div className="absolute -top-2 -left-2 w-16 h-16 border-t-6 border-l-6 border-blue-400 rounded-tl-2xl" />
                <div className="absolute -top-2 -right-2 w-16 h-16 border-t-6 border-r-6 border-blue-400 rounded-tr-2xl" />
                <div className="absolute -bottom-2 -left-2 w-16 h-16 border-b-6 border-l-6 border-blue-400 rounded-bl-2xl" />
                <div className="absolute -bottom-2 -right-2 w-16 h-16 border-b-6 border-r-6 border-blue-400 rounded-br-2xl" />

                {/* Center target - Added professional center target */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-400 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Scanning line - Improved scanning line animation */}
                <div className="absolute inset-4 overflow-hidden rounded-xl">
                  <div
                    className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-80"
                    style={{
                      animation: "scanLine 3s ease-in-out infinite",
                      top: "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Status indicator - Made status more prominent */}
            <div className="absolute top-6 left-6 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                Scanning...
              </div>
            </div>
          </div>
        </div>

        {/* Right: Instructions - Made instructions panel more compact and organized */}
        <div className="w-80 space-y-4 flex flex-col justify-center">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Instructions
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold min-w-[20px]">1.</span>
                <span>Hold document steady within the blue frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold min-w-[20px]">2.</span>
                <span>Ensure good lighting and clear QR code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold min-w-[20px]">3.</span>
                <span>Keep document flat, avoid shadows</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold min-w-[20px]">4.</span>
                <span>Wait for automatic detection</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">Example Document</h3>
            </div>
            <div className="p-3">
              <Image
                src="/images/license.jpg"
                alt="QR Code Example"
                width={300}
                height={180}
                className="w-full aspect-video object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
=======
    <div className="flex flex-col md:flex-row max-w-4xl mx-auto p-6 gap-6">
      {/* Left: Video Scanner */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="relative aspect-square w-full max-w-xs border rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" />
          {/* QR overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-4 border-white rounded-md relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Instructions */}
      <div className="w-full md:w-1/2 space-y-4">
        <div className="text-gray-800">
          <h2 className="text-lg font-semibold">Scan your Driver License, ID Card, or VNeID</h2>
          <p className="text-sm text-gray-600">
            Hold the QR steady inside the square. Make sure the area is well lit and the code is sharp for faster detection.
          </p>
        </div>

        <Image
          src="/images/license.jpg"
          alt="QR Code Example"
          width={800}
          height={450}
          className="w-full aspect-video object-cover rounded-lg border"
        />
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      </div>
    </div>
  );
}
