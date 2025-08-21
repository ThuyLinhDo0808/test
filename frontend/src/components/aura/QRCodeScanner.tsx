"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import Image from "next/image";

type QrResult = { card_id: string; name: string; dob: string } | null;

/** ---------- Helpers: DOB ---------- */
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

  // ISO or ISO + time: YYYY-MM-DD or "YYYY-MM-DD 00:00:00"
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (isValidYMD(d, mo, y)) return `${m[1]}-${m[2]}-${m[3]}`;
  }

  // 8 digits ⇒ try DDMMYYYY first, then YYYYMMDD
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
  return raw; // let caller decide (will fail validation upstream)
}

function isDate(s: string): boolean {
  const t = s.trim();
  return (
    /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(t) || // 28/10/2007 or 28-10-2007
    /^\d{8}$/.test(t) ||                          // 28102007 / 20071028
    /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(t)      // 2007-10-28 or with time
  );
}

/** ---------- Helpers: ID ---------- */
const cleanId = (s: string) => s.replace(/[\s-]/g, "");
const isLikelyId = (s: string) => /^[A-Za-z0-9]{6,}$/.test(cleanId(s));

/** ---------- Core extraction ---------- */
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
  if (parts.length >= 3) {
    // Driver license fast path first
    const dl = parseDriverLicense(parts);
    if (dl) return dl;
    // Generic heuristic extraction
    const gen = extractFields(parts);
    if (gen) return gen;
  }

  // Try JSON object with various keys
  try {
    const obj = JSON.parse(data);
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
  } catch {
    /* not JSON */
  }

  return null;
}

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
}

export default function QRCodeScanner({
  onComplete,
}: {
  onComplete: (formData: { card_id: string; name: string; dob: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setResult] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const codeReader = new BrowserQRCodeReader();

    const stopStream = () => {
      const tracks = (videoEl?.srcObject as MediaStream | null)?.getTracks() ?? [];
      tracks.forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };

    const startScan = async () => {
      setResult(null);
      setError(null);

      try {
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
      </div>
    </div>
  );
}
