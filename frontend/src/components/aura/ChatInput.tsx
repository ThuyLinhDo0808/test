"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { API_HOST } from "@/lib/constants";
import Image from "next/image";
import { useWebSocket } from "@/components/aura/hooksChat/useWebsocket";
import MicVisualizer from "@/components/aura/MicVisualizer";
import { useEyeTrackingCanvas } from "@/components/aura/hooksChat/useEyeTracking";
import { Mic, MicOff } from "lucide-react";
import { ChatMessage } from "@/app/(full-width-pages)/chat/page";
import LivenessCheck from "@/components/aura/liveness";
import QRCodeScanner from "@/components/aura/QRCodeScanner";
import { useModal } from "@/hooks/useModal";
import QRCode from "react-qr-code";
<<<<<<< HEAD
import { createPortal } from "react-dom";
import {v4 as uuidv4} from "uuid";
import { audioCtxRef } from "@/hooks/constantsLipsync";
import { playWithPhonemes } from "./avatarFeature/ProcessRawAudio" ;
=======
import {v4 as uuidv4} from "uuid";
import { createPortal } from "react-dom";
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
function addSecurityResultMessage(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  result: { access_code?: string; success: boolean }
) {
  setMessages((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      sender: "bot",
      finalized: true,
      content: (
        <div className="text-center">
          {result.success ? (
            <>
              <h2 className="text-green-600 font-bold mb-2">Access Granted</h2>
              <p className="mb-2">
                <span className="font-semibold">Access Code:</span>{" "}
                {result.access_code ?? "N/A"}
              </p>
              {result.access_code && (
                <div className="flex justify-center my-2">
                  <QRCode value={result.access_code} size={120} />
                </div>
              )}
            </>
          ) : (
            <h2 className="text-red-600 font-bold">Access Denied</h2>
          )}
        </div>
      ),
    },
  ]);
}
<<<<<<< HEAD
type Track = { id: string; audio: string; json: string };
const TRACKS: Track[] = [
  { id: 'output1', audio: '/audios/output1.wav', json: '/audios/output1.json' },
  { id: 'output2', audio: '/audios/output2.wav', json: '/audios/output2.json' },
  { id: 'output3', audio: '/audios/output3.wav', json: '/audios/output3.json' },
];
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

export default function ChatInput({
  onSendMessageAction,
  externalMessage,
  messages,
  setMessages,
<<<<<<< HEAD
  isThinking,
  setIsThinking,
  onBusyChange
}: {
  onSendMessageAction: (msg: string) => void;
  externalMessage?: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isThinking: boolean;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [isMicOn, setIsMicOn] = useState(false);
  const shouldSendAudioRef = useRef(false);
  const [message, setMessage] = useState(""); 
  const { isOpen, openModal, closeModal } = useModal();
=======
}: {
  onSendMessageAction: (msg: string) => void;
  externalMessage?: string;
  // setAvatarMessage?: (msg: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [isThinking, setIsThinking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const shouldSendAudioRef = useRef(false);
  const [message, setMessage] = useState(""); 
  
  const { isOpen, openModal, closeModal } = useModal();
  // WebSocket reference
 

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  // Modal state for QR code scanner
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    access_code?: string;
    qr_hash?: string;
    success: boolean;
  } | null>(null);

  const isAwaitingBotResponseRef = useRef(false);
  const resultQRcodeRef = useRef(false);

  const [mounted, setMounted] = useState(false);
<<<<<<< HEAD

  const hasWelcomedRef = { current: false };
  const lipsyncStopRef = { current: null as null | (() => void) };

=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!resultModalOpen || !resultData) return;
<<<<<<< HEAD
=======

    // if you used this ref to block mic while modal was open, unblock now
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    resultQRcodeRef.current = false;

    addSecurityResultMessage(setMessages, {
      access_code: resultData.access_code,
      success: resultData.success,
    });
<<<<<<< HEAD
    setResultModalOpen(false);
    setResultData(null);
  }, [resultModalOpen, resultData, setMessages]);
=======

    // don't keep modal state anymore
    setResultModalOpen(false);
    setResultData(null);
  }, [resultModalOpen, resultData, setMessages]);
  // in ChatInput (or wherever toggleMic lives)
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  // Init websocket + audio
  const { socketRef, 
            sendJson,   // STT handles
            isTTSPlayingRef,
            audioCtx, 
            micStream } = useWebSocket(
    `ws://${API_HOST}/api/chat/chatbot/`,   
    shouldSendAudioRef,
    isAwaitingBotResponseRef,
    resultQRcodeRef,
    setMessages,
    openModal,
    setResultData,
    setResultModalOpen,
    closeModal,
    setIsThinking,
<<<<<<< HEAD
    onBusyChange
  );

=======
  );
  useEffect(() => {  
    console.log("hello0") 
  }, []);

  const handleSendMessage = useCallback((msg: string) => {
    const id = uuidv4();
    setMessages((prev) => [...prev, { id, sender: "bot", text: msg, finalized: true }]);
    
  }, [setMessages]);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  const setMic = useCallback((on: boolean) => {
    setIsMicOn(on);
    shouldSendAudioRef.current = on;
  }, []);

<<<<<<< HEAD
  const handleSendMessage = (msg: string) => {
    const id = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id, sender: "bot", text: msg, finalized: true },
    ]);
  };

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const onAttention = useCallback(async () => {
    // Mic always follows presence
      setMic(true);
  
      // Only greet once per conversation
      if (hasWelcomedRef.current ||  messagesRef.current.length > 0) return;
      hasWelcomedRef.current = true;

      try {

        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }

        lipsyncStopRef.current?.();
        lipsyncStopRef.current = null;

        const t = pickRandom(TRACKS);
        const { stop: stopLipsync, sentence } = await playWithPhonemes(t.audio, t.json, {
          keepPunctuation: true,
          headStartSec: 0.06,
        });
        
        lipsyncStopRef.current = stopLipsync;
        // Send exactly what the bot is saying
        handleSendMessage(sentence);
      } catch (e) {
        console.error('[onAttention] lipsync failed:', e);
        hasWelcomedRef.current = false; // allow retry if it failed
      }
  }, []);

=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  const  { start, stop, videoRef } = useEyeTrackingCanvas({
    wsUrl: `ws://${API_HOST}/api/chat/chatbot/eye_tracking/`,
    nth: 1,
    quality: 0.7,
    downscalePct: 100,
    consecutiveNeeded: 2,
<<<<<<< HEAD
    onAttention: onAttention,
=======
    onAttention: () => {
      setMic(true);        // turn mic ON when attention gained
      // handleSendMessage("Hi there");    // optional greeting
    },
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    onAttentionLost: () => {
      setMic(false);           // turn mic OFF when attention lost
    },
  });
  
  useEffect(() => { 
    start(); 
<<<<<<< HEAD
    return () => stop(); 
  }, []);
  
  const sendEnabled = socketRef.current?.readyState === WebSocket.OPEN &&
                      isAwaitingBotResponseRef.current === false &&
                      !resultQRcodeRef.current &&
                      isTTSPlayingRef.current === false;    
                 
=======
    console.log("hello")
    return () => stop(); 
  }, []);
    
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  const handleSend = useCallback(
    (msgToSend?: string) => {
      const finalMessage = typeof msgToSend === "string" ? msgToSend : message;
      if (!finalMessage.trim() || isThinking) return;
<<<<<<< HEAD
      const lastMsg = messages[messages.length - 1];
            // empty input
=======

      const lastMsg = messages[messages.length - 1];

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      // Prevent sending only if there's a previous message and it's invalid
      if (
        lastMsg &&
        (
          (lastMsg.sender === "bot" && !lastMsg.finalized) || 
          lastMsg.sender === "user"
        )
      ) {
        return;
      }
<<<<<<< HEAD
      if (sendEnabled) {
=======

      if (socketRef.current?.readyState === WebSocket.OPEN &&
          isAwaitingBotResponseRef.current === false &&
          !resultQRcodeRef.current &&
          isTTSPlayingRef.current === false
        ) {
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        // 1. Create new finalized user message
        onSendMessageAction(finalMessage);

        // 2. Clear input + flag bot response
        setMessage("");
        setIsThinking(true);
<<<<<<< HEAD
        onBusyChange?.(true);  
=======

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        // 3. Send to backend
        const payload = { type: "text_query", query: finalMessage };
        sendJson(payload);
      } else {
        console.warn("WebSocket not ready!");
      }
    },
    [message, isThinking, socketRef, messages, onSendMessageAction]
  );

  // Automatically send a message to the chat when an external message is provided via props
  useEffect(() => {
    if (externalMessage && typeof externalMessage === "string" && externalMessage.trim() !== "") {
      const alreadySent = messages.some(
        (msg) => msg.sender === "user" && msg.text === externalMessage
      );
      if (!alreadySent) {
        handleSend(externalMessage);
      }
    }
  }, [externalMessage, messages, handleSend]);

  useEffect(() => {
    const chatEnd = document.getElementById("chat-end");
    if (chatEnd) chatEnd.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  

  const livenessRef = useRef<{ start: () => void }>(null);

  type QrData = {
    card_id: string;
    name: string;
    dob: string;
  };

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [, setLivenessData] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleQrComplete = (data: QrData) => {
    if (hasScanned) return;
    setHasScanned(true);         // hide QR scanner
    setQrData(data);             // store scanned data

    setTimeout(() => {
      livenessRef.current?.start();  // trigger liveness if method exists
      console.log("Triggered liveness...");
    }, 1000);
  };
  const resetSecurityState = () => {
    setHasScanned(false);
    setQrData(null);
    setLivenessData(null);
  };

  const handleLivenessResult = (token: string | null) => {
    setLivenessData(token); // still save it if needed elsewhere

    if (qrData) {
      const passedLiveness = token !== null;

      const payload = {
        cancel: false,
        liveness: passedLiveness, // boolean status
        card_id: qrData.card_id,
        name: qrData.name,
        dob: qrData.dob,
      };

      fetch(`http://${API_HOST}/api/chat/chatbot/security/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      .then((res) => res.json())
      .then((res) => {
        console.log("Auto submitted:", res);
        resetSecurityState(); // reset state after submission
        closeModal(); // if you also want to close the QR/liveness modal
      });
    }
  };

  const handleCancel = (token: string | null) => {
    console.log(" handleCancel triggered with token:", token);

    const payload = {
      cancel: true,
      liveness: false,
      card_id: null,
      name: null,
      dob: null,
    };

    fetch(`http://${API_HOST}/api/chat/chatbot/security/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("Cancel submitted:", res);
        resetSecurityState(); // reset state after cancellation
        closeModal();
      })
      .catch((err) => {
        console.error(" Cancel request failed:", err);
        resetSecurityState(); // reset state even on error
        closeModal();
      });
  };
<<<<<<< HEAD
=======
  
  useEffect(() => {
    //console.log("Updated messages:", messages);
  }, [messages]);
  
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  

  return (
<<<<<<< HEAD
    <div className="relative flex flex-col
      w-[clamp(500px,45vw,1200px)]
      max-w-full h-full max-h-screen mx-auto">
=======
    <div className="relative flex flex-col w-5/6 lg:w-[700px] max-w-full h-full max-h-screen">
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
      {/* PORTAL: render overlay at document.body, not inside the chat column */}
      {isOpen && mounted &&
        createPortal(
<<<<<<< HEAD
          <div className="fixed inset-0 z-[1000] backdrop-blur-md bg-black/50 flex items-center justify-center p-4">
            <div className="relative w-[60vw] h-[70vh] p-6 space-x-4
                            flex bg-white rounded-xl shadow-lg overflow-hidden
                            border border-gray-200"
            >
=======
          <div className="fixed inset-y-0 right-0 w-1/2 z-[1000] backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-[min(90%,64rem)] max-h-[90vh] p-6
                            flex space-x-4 bg-white rounded-xl shadow-lg overflow-auto">
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
              {!hasScanned && (
                <div className={`flex-1 min-w-0 transition-opacity duration-500
                                 ${hasScanned ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                  <QRCodeScanner onComplete={handleQrComplete} />
                </div>
              )}

              {hasScanned && (
                <div className={`flex-1 min-w-0 transition-opacity duration-500
                                 ${hasScanned ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <LivenessCheck ref={livenessRef} onResult={handleLivenessResult} />
                </div>
              )}

              <button
                onClick={() => handleCancel(null)}
<<<<<<< HEAD
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl
                           w-8 h-8 flex items-center justify-center rounded-full
                           hover:bg-gray-100 transition-colors duration-200 z-10"
=======
                className="absolute top-4 right-6 text-gray-600 hover:text-black text-2xl"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
              >
                &times;
              </button>
            </div>
          </div>,
          document.body
        )
      }
    
      {/* Chat messages */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[77vh] min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] break-words whitespace-pre-line px-4 py-2 rounded-2xl text-sm shadow transition-all duration-300 ${
                msg.sender === "user"
                  ? "bg-white/60 dark:bg-white/60 text-gray-900 border border-white/20"
                  : "bg-white/20 dark:text-white border border-white/10"
              }`}
            >
              {msg.content ? msg.content : msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isThinking  && (
          <div className="flex justify-start items-center gap-2">
            <Image src="/images/logo/logo-icon.png" alt="Logo" width={40} height={40} className="animate-shiny" />
            <span className="text-sm text-gray-500 dark:text-white">Thinking...</span>
          </div>
        )}

        <div id="chat-end" />
      </div>

      {/* Input and Send */}
      <div className="sticky bottom-5 flex px-2 py-5 backdrop-blur-3xl mb-4 mr-3 rounded-2xl shadow-lg border border-gray-300 dark:border-gray-700">
        <button onClick={() => setMic(!isMicOn)} className="mr-2 px-5 py-2">
          {isMicOn ? <Mic size={30} className="text-gray-800 dark:text-gray-200" />
                  : <MicOff size={30} className="text-gray-800 dark:text-gray-200" />}
        </button>
        {isMicOn && audioCtx && micStream ? <MicVisualizer ctx={audioCtx} stream={micStream} mode={1} /> : null}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isThinking) {
              e.preventDefault();
              handleSend();
            }
          }}
          
          placeholder="Ask me anything or speak..."
          className="flex-grow px-4 py-2 bg-transparent text-gray-800 dark:text-white outline-none border-none"
        />

        <button
<<<<<<< HEAD
          type="button"
          onClick={() => handleSend()}
          disabled={!sendEnabled}                      
          aria-disabled={!sendEnabled}
          title={!sendEnabled ? "Please wait…" : "Send"}
          className="
            inline-flex items-center gap-2 rounded-full px-4 py-2
            text-white dark:text-black transition-colors duration-200
            bg-primary hover:bg-secondary
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:hover:bg-primary dark:disabled:hover:bg-primary
          "
        >
          {!sendEnabled && (
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
            </svg>
          )}
          <span>{sendEnabled ? "Send" : "Waiting"}</span>
        </button>

=======
          onClick={() => handleSend()}
          className="bg-primary hover:bg-secondary text-white dark:text-black px-4 rounded-full transition-colors duration-200"
          disabled={isThinking}
          >
            Send
        </button>
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      </div>
    </div>
  );
}
