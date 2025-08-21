import { useRef, useCallback, useEffect } from "react";

// Constants for audio processing
const TARGET_SR = 24000; // what backend expects
const FRAME_MS = 40; // try 20 ms; 40 ms also OK
const BATCH_SAMPLES = Math.round(TARGET_SR * FRAME_MS / 1000); 
const HEADER_BYTES = 8;       // space for metadata
const MESSAGE_BYTES = HEADER_BYTES + BATCH_SAMPLES * 2;
type OnStream = (ctx: AudioContext, stream: MediaStream) => void;
export function useSTT(
  audioCtxRef: React.RefObject<AudioContext | null>,
  socketRef: React.RefObject<WebSocket | null>,
  isTTSPlayingRef: React.RefObject<boolean>,
  shouldSendAudioRef: React.RefObject<boolean>,
  isAwaitingBotResponseRef: React.RefObject<boolean>,
  resultQRcodeRef: React.RefObject<boolean>,
  onStream?: OnStream,
) {
  const streamRef   = useRef<MediaStream | null>(null);
  const micNodeRef  = useRef<AudioWorkletNode | null>(null);

  // persistent batch state
  const bufferPoolRef  = useRef<ArrayBuffer[]>([]);
  const batchBufferRef = useRef<ArrayBuffer | null>(null);
  const batchViewRef   = useRef<DataView | null>(null);
  const batchI16Ref    = useRef<Int16Array | null>(null);
  const batchOffsetRef = useRef(0);
  const seqRef = useRef(0);
  
  /* ---------- helpers ---------- */
  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, [audioCtxRef]);

  function initBatch() {
    if (!batchBufferRef.current) {
      const pool = bufferPoolRef.current;
      const buf  = pool.pop() || new ArrayBuffer(MESSAGE_BYTES);
      batchBufferRef.current = buf;
      batchViewRef.current   = new DataView(buf);
      batchI16Ref.current    = new Int16Array(buf, HEADER_BYTES);
      batchOffsetRef.current = 0;
      //console.log("Init batch")
    }
    //console.log("Not complete Init batch")
  };

  // Debug function - Detect gaps 
  let lastFlush = performance.now();
  function afterFlush(seq:number) {
    const now = performance.now();
    const dt = now - lastFlush;

    if (dt > 250) console.warn("[MicStream] flush gap", Math.round(dt), "ms at seq", seq);
    lastFlush = now;
  }

  function flushBatch() {
    const buf  = batchBufferRef.current;
    const view = batchViewRef.current;
    const i16  = batchI16Ref.current;
    const ws = socketRef.current;

    if (!buf || !view || !i16) return;
    
    const ts    = Date.now() & 0xFFFFFFFF;
    const seq   = (seqRef.current = (seqRef.current + 1) >>> 0);
    view.setUint32(0, ts,    true); // little-endian (change to false if your server is big-endian)
    const flags = isTTSPlayingRef.current ? 1 : 0;
    view.setUint32(4, flags, true);
    view.setUint32(8, seq,   true);

    if (
      shouldSendAudioRef.current &&
      !isAwaitingBotResponseRef.current &&
      !resultQRcodeRef.current &&
      ws && ws.readyState === WebSocket.OPEN
    ) {
      const payload = buf.slice(0) // clone
      socketRef.current?.send(payload);
      afterFlush(seq)
    } else {
      console.warn("[MicStream] Gated: not sending batch.");
    }
    bufferPoolRef.current.push(buf); 
    batchBufferRef.current = null;

  } 

  function flushRemainder()  {
    const offset = batchOffsetRef.current;
    const i16    = batchI16Ref.current;
    if (batchBufferRef.current && i16 && offset > 0) {
      for (let i = offset; i < BATCH_SAMPLES; i++) i16[i] = 0;
      flushBatch();
    }
  }

  const silenceTimerRef = useRef<number | null>(null);
  const SILENCE_MS = 180;
  function scheduleTailFlush() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      flushRemainder();           // zero-pad + send
    }, SILENCE_MS);
  }
  function rms(i16: Int16Array) {
    let s = 0; for (let i=0;i<i16.length;i++){ const v=i16[i]/32768; s += v*v; }
    return Math.sqrt(s / i16.length);
  }

  /* ---------- mic ---------- */

  const startMicStream = useCallback(async () => {
    if (streamRef.current || micNodeRef.current) {
      console.log("[Mic] already started");
      if (audioCtxRef.current && streamRef.current) {
        onStream?.(ensureCtx(), streamRef.current);
      }
      return;
    }

    // 1) Ask for mic
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: TARGET_SR },
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    streamRef.current = stream;

    // 2) AudioContext
    const audioContext = ensureCtx();
    if (audioContext.state === "suspended") {
      try { await audioContext.resume(); } catch (e) { console.warn("[Mic] resume failed", e); }
    }
    onStream?.(ensureCtx(), streamRef.current);
    // 3) Worklet (with resample to TARGET_SR if needed)
    const code = `
      const TARGET_SR = ${TARGET_SR};
      if (!globalThis.__pcm_registered) {
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0][0];
            if (!input) return true;

            const inSr = sampleRate;
            if (inSr === TARGET_SR) {
              // Fast path: just convert f32 -> i16
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                let s = input[i];
                s = s < -1 ? -1 : s > 1 ? 1 : s;
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              this.port.postMessage(int16.buffer, [int16.buffer]);
              return true;
            }

            // Resample to TARGET_SR
            const ratio = inSr / TARGET_SR;
            const outLen = Math.floor(input.length / ratio);
            const out = new Float32Array(outLen);

            if (Math.abs(ratio - Math.round(ratio)) < 1e-6) {
              // integer decimation (e.g., 48000 -> 24000)
              const step = Math.round(ratio);
              for (let i = 0, j = 0; j < outLen; i += step, j++) out[j] = input[i];
            } else {
              // linear interpolation for non-integer ratios
              for (let j = 0; j < outLen; j++) {
                const x = j * ratio;
                const i0 = Math.floor(x);
                const i1 = Math.min(i0 + 1, input.length - 1);
                const t = x - i0;
                out[j] = input[i0] * (1 - t) + input[i1] * t;
              }
            }

            // f32 -> i16
            const int16 = new Int16Array(outLen);
            for (let i = 0; i < outLen; i++) {
              let s = out[i];
              s = s < -1 ? -1 : s > 1 ? 1 : s;
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            this.port.postMessage(int16.buffer, [int16.buffer]);
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
        globalThis.__pcm_registered = true;  
      }
    `;

    const blob = new Blob([code], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url); // tidy

    // 4) Node & pipe
    const micNode = new AudioWorkletNode(audioContext, "pcm-processor");

    micNode.port.onmessage = ({ data }) => {
      const int16 = new Int16Array(data);

      let read = 0;
      while (read < int16.length) {
        initBatch(); // must initialize batch refs if null

        const i16   = batchI16Ref.current!;
        const off   = batchOffsetRef.current;
        const room  = BATCH_SAMPLES - off;
        const toCopy = Math.min(int16.length - read, room);

        i16.set(int16.subarray(read, read + toCopy), off);
        batchOffsetRef.current = off + toCopy;
        read += toCopy;

        if (batchOffsetRef.current === BATCH_SAMPLES) {
          flushBatch();             // sends & recycles buffer
        }
      }
      // Only schedule if the energy is low:
      if (rms(int16) < 0.015) scheduleTailFlush();
    };

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(micNode); // do NOT connect to destination (no echo)
    micNodeRef.current = micNode;
    //console.log("Mic Node", micNode)

    console.log("[Mic] started at", audioContext.sampleRate, "Hz →", TARGET_SR, "Hz");
  }, []);

  /* ---------- cleanup ---------- */
  const cleanupMic = useCallback(() => {
    // stop worklet messages first
    const node = micNodeRef.current;
    if (node) {
      try { node.port.onmessage = null; } catch {}
      try { node.disconnect(); } catch {}
      micNodeRef.current = null;
      console.log("Mic node clean", micNodeRef.current)
    }

    // stop tracks
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        if (track.readyState !== "ended") track.stop();
      }
      streamRef.current = null;
      console.log("Stream  clean", streamRef.current)
    }

    // clear batching state (do NOT init)
    batchBufferRef.current = null;
    batchViewRef.current   = null;
    batchI16Ref.current    = null;
    batchOffsetRef.current = 0;
    console.log("Complete clean the mic")
  }, []);


  /* --- public API --- */
  return { startMicStream, flushRemainder, cleanupMic };
}
