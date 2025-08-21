import { WordTiming,
        audioCtxRef,
        wordQueueRef,
} from "../../../hooks/constantsLipsync";
export type WebSocketMessage =
  | { type: "security_check_request"; content: null }
  | {
      type: "security_op_completed";
      content: {
        success: boolean;
        data?: {
          access_code?: string;
          qr_hash?: string;
        };
      };
    }
  | { type: "partial_user_request"; content: string }
  | { type: "final_user_request"; content: string }
  | { type: "partial_assistant_answer"; content: string }
  | { type: "final_assistant_answer"; content: string }
  | { type: "tts_chunk"; content: string } // base64 string
  | { type: "stop_tts"; content: null }
  | { type: "word_timing"; content: WordTiming | WordTiming[] }
  //| { type: string; content: unknown }; // fallback
type SecurityResult = { access_code?: string; qr_hash?: string; success: boolean };
import { useRef, useCallback, useState, useEffect } from "react";

import { useSTT } from "./UseSTT";
import { useTTS } from "./UseTTS";
import { ChatMessage } from "@/app/(full-width-pages)/chat/page";
import { v4 as uuidv4 } from "uuid";
import { onWordTiming } from "../avatarFeature/phonemeConvert";

export function useWebSocket(
  url: string,
  shouldSendAudioRef: React.RefObject<boolean>,
  isAwaitingBotResponseRef: React.RefObject<boolean>,
  resultQRcodeRef: React.RefObject<boolean>,
  setMessages:React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  openModal: () => void,
  setResultData: React.Dispatch<React.SetStateAction<SecurityResult | null>>,
  setResultModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  closeModal: () => void,
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>,
) {
  // ----- core refs -----
  const socketRef        = useRef<WebSocket | null>(null);
  //const audioCtxRef      = useRef<AudioContext | null>(null);

  // ----- audio hooks -----
  const isTTSPlayingRef  = useRef(false);
  const isInitializedRef = useRef(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);


  // Refs for mic stream
  const { startMicStream, flushRemainder, cleanupMic } = useSTT(
    audioCtxRef,
    socketRef,
    isTTSPlayingRef,
    shouldSendAudioRef,
    isAwaitingBotResponseRef,
    resultQRcodeRef,
    (ctx, stream) => {   
      setAudioCtx(ctx);
      setMicStream(stream);
    }
  );
  // Refs for TTS playback
  const { initTTSPlayback, playTTSChunk, stopTTSPlayback, cleanupTTS } = useTTS(
    audioCtxRef,
    socketRef,
    isInitializedRef,
    isTTSPlayingRef,
    isAwaitingBotResponseRef,
    wordQueueRef
  );

  /* ------ combine for full cleanup ----- */
  const cleanupAudio = useCallback(async () => {
    cleanupMic();
    await cleanupTTS();
    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    console.log("[Audio] All cleaned");
  }, [cleanupMic, cleanupTTS]);

  /* ---------- route messages ---------- */
  const handleFinalBotMessage = useCallback((finalText: string, final: boolean) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      // No bot yet → append once
      if (!last || last.sender !== 'bot') {
        // If you stream, ensure this only runs for the first bot token
        const newMsg: ChatMessage = { id: uuidv4(), sender: 'bot', text: finalText, finalized: !!final };
        return [...prev, newMsg];
      }

      // Already a bot message → update only if changed
      const shouldUpdate =
        last.text !== finalText ||
        (final && !last.finalized);

      if (!shouldUpdate) return prev; // <-- bail (no new array)

      const next = prev.slice();
      next[next.length - 1] = {
        ...last,
        text: finalText,
        finalized: final ? true : last.finalized,
      };
      return next;
    });

    // Fix gating bug: only “awaiting” while bot is generating
    isAwaitingBotResponseRef.current = !final;
  }, [setMessages]);
  
  const updateLatestUserMessage = useCallback((newText: string, cb?: () => void) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];

      // If the last message is from the bot → append a new finalized user message
      if (last && last.sender === 'bot') {
        const newMsg: ChatMessage = {
          id: uuidv4(),
          sender: 'user',
          text: newText,
          finalized: true,
        };
        if (cb) queueMicrotask(cb);
        return [...prev, newMsg];
      }

      // Otherwise keep your original logic: find the latest user message and update it
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].sender === 'user') { idx = i; break; }
      }

      if (idx === -1) {
        const newMsg: ChatMessage = {
          id: uuidv4(),
          sender: 'user',
          text: newText,
          finalized: true,
        };
        if (cb) queueMicrotask(cb);
        return [...prev, newMsg];
      }

      const lastUser = prev[idx];
      const shouldUpdate = lastUser.text !== newText || !lastUser.finalized;
      if (!shouldUpdate) return prev; // no-op bail (prevents unnecessary re-render)

      const next = prev.slice();
      next[idx] = { ...lastUser, text: newText, finalized: true };
      if (cb) queueMicrotask(cb);
      return next;
    });
  }, [setMessages]);

  const socketMessageHandlerRef = useRef<(m: WebSocketMessage) => void>(() => {});
  const socketMessageHandler = useCallback((msg: WebSocketMessage) => {
    const { type, content } = msg;
    const trimmed = typeof content === "string" ? content.trim() : "";
      switch (type) {
        case "security_check_request":
          console.log("🛂 Security Check Request Triggered");
          openModal();
          break;

        case "security_op_completed": {
          const { data, success } = content as {
            success: boolean;
            data?: { access_code?: string; qr_hash?: string };
          };

          if (!success) {
            console.log("Ignoring stale security failure result");
            return;
          }

          setResultData({
            success,
            access_code: data?.access_code,
            qr_hash: data?.qr_hash,
          });
          // if you actually want to store it in a ref:
          // (resultQRcodeRef as React.MutableRefObject<any>).current = data?.qr_hash ?? null;

          setResultModalOpen(true);
          closeModal();
          break;
        }

        case "partial_user_request":
          if (!trimmed) break;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];

            // block user echo if bot still streaming
            if (last && last.sender === "bot" && !last.finalized) return prev;

            if (last && last.sender === "user" && !last.finalized) {
              updated[updated.length - 1] = { ...last, text: trimmed };
            } else {
              const id = uuidv4();
              updated.push({ id, sender: "user", text: trimmed, finalized: false });
            }
            return updated;
          });
          break;

        case "final_user_request":
          if (!trimmed) break;
          console.log("Final user request:", trimmed);
          updateLatestUserMessage(trimmed);
          setIsThinking(true);
          isAwaitingBotResponseRef.current = true;
          break;

        case "partial_assistant_answer":
          if (!trimmed) break;
          setIsThinking(false);
          handleFinalBotMessage(trimmed, false);
          break;

        case "final_assistant_answer":
          if (!trimmed) break;
          setIsThinking(false);
          handleFinalBotMessage(trimmed, true);
          isAwaitingBotResponseRef.current = false;
          break;

        case "tts_chunk":
          if (typeof content === "string") {
            const raw = atob(content);
            const buf = new ArrayBuffer(raw.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
            const int16 = new Int16Array(buf);
            playTTSChunk(int16);
          }
          break;


        case "stop_tts":
          stopTTSPlayback();
          socketRef.current?.send(JSON.stringify({ type: "tts_stop" }));
          break;

        case "word_timing":
          // Hook your lipsync pipeline here (emit event or set state)
          onWordTiming(content);
          break;

        default:
          console.warn(" Unrecognized message type:", type, "with content:", content);
          break;
        }
      }, [
    openModal, setResultData, resultQRcodeRef, setResultModalOpen, closeModal,
    setMessages, setIsThinking, isAwaitingBotResponseRef,
    playTTSChunk, stopTTSPlayback
  ]);
  useEffect(() => { socketMessageHandlerRef.current = socketMessageHandler; }, [socketMessageHandler]);

  // ----- lifecycle: open once per URL, hard close on unmount/reload -----
  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = async () => {
      try {
        console.log("[WS] onopen");
        await cleanupAudio();
        await startMicStream();
        await initTTSPlayback();
      } catch (e) {
        console.warn("[WS] onopen init failed:", e);
      }
    };

    ws.onmessage = (e) => {
      try { socketMessageHandlerRef.current?.(JSON.parse(e.data)); }
      catch (err) { console.error("[WS] parse fail", err); }
    };

    ws.onerror = (e) => {
      console.log("[WS] error", e);
    };

    ws.onclose = async (ev) => {
      flushRemainder();
      await cleanupAudio();          // <-- keep this, it will run on redirect
      console.log("[WS] onclose:", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
    };

    // close THIS instance on reload/tab close
    const beforeUnload = () => { try { ws.close(1000, "page-unload"); } catch {} };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      ws.close();
    };
  }, [url]);

  /* ------------ outbound --------------- */
  const sendJson = useCallback((p: object) => socketRef.current?.send(JSON.stringify(p)), []);

  return { socketRef, 
            sendJson,   // STT handles
            isTTSPlayingRef,
            audioCtx, 
            micStream } as const;
}