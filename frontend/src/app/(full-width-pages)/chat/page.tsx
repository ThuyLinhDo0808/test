"use client"

import SuggestionsBar from "@/components/aura/suggestion"
import { useRef, useState, useEffect, useCallback } from "react"
import ChatInput from "@/components/aura/ChatInput"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Star } from "lucide-react"
import MagicalParticles from "@/layout/Particles"
import { useTheme } from "@/context/ThemeContext"
import { Canvas } from "@react-three/fiber"
<<<<<<< HEAD
//import type { AvatarMessage } from "@/types/avatar"
import { CameraControls, Environment } from "@react-three/drei";
import type { CameraControls as CameraControlsType } from "@react-three/drei";
import { RotatableAvatar } from "@/components/aura/avatarFeature/RotatableAvatar";
import {v4 as uuidv4} from "uuid";
import FloatingSuggestions from "@/components/aura/hooksChat/floatingSuggestions"
import { Modal } from "@/components/ui/modal"
import Button from "@/components/ui/button/Button"
=======
import type { AvatarMessage } from "@/types/avatar"
import { CameraControls, Environment } from "@react-three/drei";
import type { CameraControls as CameraControlsType } from "@react-three/drei";
import { RotatableAvatar } from "@/components/aura/avatarFeature/RotatableAvatar";
import { Random } from "@/components/aura/avatarFeature/random"
import { Leva } from "leva"
import {v4 as uuidv4} from "uuid";
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

export interface ChatMessage {
  id: string;          // Unique identifier for each message 
  sender: "user" | "bot";
  text?: string; // still allow normal text messages
  content?: React.ReactNode; // for special rich content (QR codes, etc.)
  finalized: boolean; // Whether the message has been finalized and sent
}

interface ChatContentProps {
<<<<<<< HEAD
=======
  showSuggestions: boolean;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  showTitle: boolean;
  messages: ChatMessage[];
  handleSuggestionClick: (text: string) => void;
  handleSendMessage: (text: string) => void;
<<<<<<< HEAD
  externalMessage?: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isThinking: boolean;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
}

function HomePageInner() {
  const [externalMessage, setExternalMessage] = useState<string | undefined>(undefined);
  const [showTitle, setShowTitle] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  //const [avatarMessage, setAvatarMessage] = useState<AvatarMessage | null>(null);
  const { theme } = useTheme();
  const cameraControls = useRef<CameraControlsType | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  // --- State & refs ---
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const didReloadRef    = useRef(false);

  // --- Helpers ---
  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const resetPage = useCallback(() => {
    if (didReloadRef.current) return;           // guard against double-trigger
    didReloadRef.current = true;

    clearTimers();
    // Optional: clear persisted state if you want a truly fresh start
    // localStorage.clear(); sessionStorage.clear();

    // Close popup (not strictly necessary, but tidy)
    setShowPopup(false);

    // Hard reload the entire page/app
    window.location.reload();
  }, [clearTimers]);

  // --- Inactivity / countdown logic ---
  const setUpInactivityTimer = useCallback(() => {
    // clear old inactivity timer
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    inactivityTimer.current = setTimeout(() => {
      setShowPopup(true);
      setCountdown(5);

      // clear old countdown interval
      if (countdownTimer.current) clearInterval(countdownTimer.current);

      countdownTimer.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearTimers();
            resetPage(); // auto full-page reload on expiry
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, 60_000); // 30s of inactivity
  }, [clearTimers, resetPage]);

  // Clicking "No" -> reload page
  const handleNo = useCallback(() => {
    resetPage();
  }, [resetPage]);

  // Clicking "Yes" -> keep session, restart inactivity timer
  const handleYes = useCallback(() => {
    setShowPopup(false);
    clearTimers();
    setUpInactivityTimer();
  }, [clearTimers, setUpInactivityTimer]); // note: we will define setUpInactivityTimer with function hoisting

  // --- Lifecycle & interaction resets ---
  useEffect(() => {
    setUpInactivityTimer();
    return () => {
      clearTimers();
    };
    // Re-arm on activity; include whatever inputs reflect "user activity"
  }, [messages, externalMessage, setUpInactivityTimer, clearTimers]); 


  //const avatarMessageCallbackRef = useRef<(msg: AvatarMessage | null) => void>(() => {});

  // const setAvatarMessageCallback = (cb: (msg: AvatarMessage | null) => void) => {
  //   avatarMessageCallbackRef.current = cb;
  // };
=======
  // setAvatarMessage: React.Dispatch<React.SetStateAction<AvatarMessage | null>>;
  externalMessage?: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

function HomePageInner() {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [externalMessage, setExternalMessage] = useState<string | undefined>(undefined);
  const [showTitle, setShowTitle] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [avatarMessage, setAvatarMessage] = useState<AvatarMessage | null>(null);
  //const [cameraZoomed] = useState(false);
  const { theme } = useTheme();
  const cameraControls = useRef<CameraControlsType | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const avatarMessageCallbackRef = useRef<(msg: AvatarMessage | null) => void>(() => {});
  
  const setAvatarMessageCallback = (cb: (msg: AvatarMessage | null) => void) => {
    avatarMessageCallbackRef.current = cb;
  };
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  const handleSendMessage = (msg: string) => {
    const id = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id, sender: "user", text: msg, finalized: true },
    ]);
<<<<<<< HEAD
=======
    setShowSuggestions(false);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    setShowTitle(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setExternalMessage(suggestion);
<<<<<<< HEAD
=======
    setShowSuggestions(false);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    setShowTitle(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

<<<<<<< HEAD
  // useEffect(() => {
  //   setAvatarMessageCallback((msg: AvatarMessage | null) => {
  //     setAvatarMessage(msg);
  //   });
  // }, [setAvatarMessage]);
=======

  // useEffect(() => {
  //   if (cameraControls.current) {
  //     // Position camera higher and look down at avatar to center it lower in frame
  //     cameraControls.current.setLookAt(0, 3, 5, 0, 0, 0)
  //   }
  // }, [])

  // useEffect(() => {
  //   if (!cameraControls.current) return

  //   if (cameraZoomed) {
  //     // When zoomed, look more directly at avatar's face
  //     cameraControls.current.setLookAt(0, 1.8, 1.5, 0, 1.6, 0, true)
  //   } else {
  //     // Normal view - camera positioned higher, looking down at avatar
  //     cameraControls.current.setLookAt(0, 3, 5, 0, 0, 0, true)
  //   }
  // }, [cameraZoomed])

  useEffect(() => {
    setAvatarMessageCallback((msg: AvatarMessage | null) => {
      setAvatarMessage(msg);
    });
  }, [setAvatarMessage]);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079


  // Apply full page background gradient
  useEffect(() => {
    if (theme === "dark") {
      document.body.style.background =
        "linear-gradient(135deg, rgb(17 24 39) 0%, rgb(31 41 55) 35%, rgb(88 28 135) 100%)"
    } else {
      document.body.style.background =
        "linear-gradient(135deg, rgb(250 245 255) 0%, rgb(255 255 255) 35%, rgb(253 244 255) 100%)"
    }

    document.body.style.backgroundAttachment = "fixed"

    return () => {
      document.body.style.background = ""
      document.body.style.backgroundAttachment = ""
    }
  }, [theme])

  return (
    <div className="h-screen flex overflow-hidden">
      <MagicalParticles />
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/5 h-4/5 rounded-full bg-gradient-to-br from-violet-400/20 to-pink-400/20 blur-2xl" />
        </div>
        <div className="w-full h-full relative z-10">
          <Canvas shadows camera={{ position: [0, 0, 1.1], fov: 50 }}>
            <Environment preset="sunset"/>
            <CameraControls ref={cameraControls} enabled={false} />    
             <RotatableAvatar
<<<<<<< HEAD
              isThinking={isThinking}
=======
              message={avatarMessage}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
            />
          </Canvas>
        </div>
      </div>
      
      <div className="flex-1 relative z-10 ">
        <ChatContent
<<<<<<< HEAD
=======
          showSuggestions={showSuggestions}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
          showTitle={showTitle}
          messages={messages}
          handleSuggestionClick={handleSuggestionClick}
          handleSendMessage={handleSendMessage}
<<<<<<< HEAD
          externalMessage={externalMessage}
          setMessages={setMessages}
          isThinking={isThinking}
          setIsThinking={setIsThinking}
        />
        <div ref={scrollRef} />
      </div>

      {/* Popup */}
      <Modal
        isOpen={showPopup}
        onClose={handleNo}
        showCloseButton={false}
        backdropClassName="
          fixed inset-0
          bg-[radial-gradient(1200px_600px_at_20%_20%,rgba(99,102,241,0.25),transparent_60%),
              radial-gradient(900px_500px_at_80%_80%,rgba(168,85,247,0.20),transparent_60%),
              linear-gradient(to_bottom_right,rgba(2,6,23,0.65),rgba(2,6,23,0.65))]
          dark:bg-[radial-gradient(1200px_600px_at_20%_20%,rgba(99,102,241,0.28),transparent_60%),
              radial-gradient(900px_500px_at_80%_80%,rgba(168,85,247,0.24),transparent_60%),
              linear-gradient(to_bottom_right,rgba(2,6,23,0.75),rgba(2,6,23,0.75))]
          backdrop-blur-2xl
        "
        className="
          p-0
          shadow-[0_15px_70px_-10px_rgba(0,0,0,0.5)]
          ring-1 ring-black/10
          border border-white/10 dark:border-white/5
          [box-shadow:0_0_0_1px_rgba(255,255,255,0.08)_inset,0_20px_60px_-20px_rgba(99,102,241,0.35)]
        "
      >
        <div className="p-7 sm:p-8 rounded-3xl">
          {/* Header Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
                          bg-gradient-to-br from-indigo-500/15 to-violet-500/15
                          ring-1 ring-inset ring-white/20 dark:ring-white/10">
            <svg className="h-7 w-7 text-indigo-500 dark:text-indigo-300" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 text-center">
            Are you still here?
          </h2>

          {/* Subtitle + countdown pill */}
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            <p className="text-slate-600 dark:text-slate-300">We haven’t seen any activity.</p>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium
                            bg-slate-100/70 text-slate-700
                            dark:bg-slate-800/70 dark:text-slate-200
                            ring-1 ring-inset ring-black/5 dark:ring-white/10">
              Auto-reset in <span className="font-semibold text-indigo-600 dark:text-indigo-300">{countdown}s</span>
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={handleYes}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white
                        shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)]"
            >
              Yes, continue
            </Button>
            <Button
              variant="outline"
              onClick={handleNo}
              className="px-5 py-2 rounded-xl border-slate-300/60 text-slate-700
                        hover:bg-slate-100/60 dark:border-slate-700 dark:text-slate-200
                        dark:hover:bg-slate-800/60"
            >
              No, reset
            </Button>
          </div>
        </div>
      </Modal>
=======
          // setAvatarMessage={setAvatarMessage}
          externalMessage={externalMessage}
          setMessages={setMessages}
        />
        <div ref={scrollRef} />
      </div>
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
    </div>
  );
}

const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

function ChatContent({
<<<<<<< HEAD
=======
  showSuggestions,
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  showTitle,
  messages,
  handleSuggestionClick,
  handleSendMessage,
<<<<<<< HEAD
  externalMessage,
  setMessages,
  isThinking,
  setIsThinking
}: ChatContentProps) {
  const { theme } = useTheme();
  const showWelcome = messages.length === 0;
  const [isAnswering, setIsAnswering] = useState(false);
=======
  // setAvatarMessage,
  externalMessage,
  setMessages,
}: ChatContentProps) {
  const { theme } = useTheme();

  // const handleAvatarMessage = useCallback((msg: string) => {
  //   setAvatarMessage({
  //     animation: "idle",
  //     facialExpression: "neutral",
  //     lipsync: { mouthCues: [] },
  //     audio: msg,
  //   });
  // }, [setAvatarMessage]);

  const showWelcome = messages.length === 0;

  // This only run one
  // useEffect(()=>{
  //   console.log("Hello1")
  // },[])
  
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  return (
    <div className="flex flex-col h-full relative ">
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key="welcome"
                {...fadeInUp()}
<<<<<<< HEAD
                className="text-center space-y-4"
=======
                className="text-center space-y-8"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
              >
                {showTitle && (
                  <motion.div
                    className="relative"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <div
                      className={`relative w-28 h-28 rounded-full ${
                        theme === "dark"
                          ? "bg-gradient-to-br from-violet-600 to-indigo-600 border-white/10"
                          : "bg-gradient-to-br from-violet-500 to-indigo-500 border-black/5"
                      } flex items-center justify-center shadow-lg border backdrop-blur-sm mx-auto`}
                    >
                      <Sparkles className="w-12 h-12 text-white" />
                      <div
                        className={`absolute -inset-0.5 rounded-full ${
                          theme === "dark"
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600"
                            : "bg-gradient-to-r from-violet-500 to-indigo-500"
                        } opacity-0 hover:opacity-30 transition-opacity duration-300`}
                      />
                    </div>

                    {/* Orbiting stars */}
                    <motion.div
                      className={`absolute w-6 h-6 ${theme === "dark" ? "text-yellow-300" : "text-yellow-500"}`}
                      animate={{
                        rotate: 360,
                        x: [30, 20, 0, -20, -30, -20, 0, 20, 30],
                        y: [0, 20, 30, 20, 0, -20, -30, -20, 0],
                      }}
                      transition={{
                        rotate: { duration: 20, ease: "linear", repeat: Infinity },
                        x: { duration: 10, ease: "easeInOut", repeat: Infinity },
                        y: { duration: 10, ease: "easeInOut", repeat: Infinity },
                      }}
                      style={{ left: "50%", top: "50%", marginLeft: "-12px", marginTop: "-12px" }}
                    >
                      <Star className="w-full h-full" />
                    </motion.div>

                    <motion.div
                      className={`absolute w-4 h-4 ${theme === "dark" ? "text-blue-300" : "text-blue-500"}`}
                      animate={{
                        rotate: 360,
                        x: [0, 20, 30, 20, 0, -20, -30, -20, 0],
                        y: [30, 20, 0, -20, -30, -20, 0, 20, 30],
                      }}
                      transition={{
                        rotate: { duration: 15, ease: "linear", repeat: Infinity },
                        x: { duration: 8, ease: "easeInOut", repeat: Infinity },
                        y: { duration: 8, ease: "easeInOut", repeat: Infinity },
                      }}
                      style={{ left: "50%", top: "50%", marginLeft: "-8px", marginTop: "-8px" }}
                    >
                      <Star className="w-full h-full" />
                    </motion.div>
                  </motion.div>
                )}

<<<<<<< HEAD
                  {showTitle && (
                    <motion.h1 {...fadeInUp(0.2)} className="text-3xl font-semibold text-gray-800 dark:text-white">
                      Ask Aura anything
                    </motion.h1>
                  )}
                    <motion.div
                      {...fadeInUp(0.4)}
                      className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                    >
                      <div className="h-56 sm:h-64 md:h-72">
                        <SuggestionsBar onSuggestionClick={(t) => {
                          handleSuggestionClick(t);
                        }} />
                      </div>
                    </motion.div>
=======
                {showTitle && (
                  <motion.h1 {...fadeInUp(0.2)} className="text-3xl font-semibold text-gray-800 dark:text-white">
                    Ask Aura anything
                  </motion.h1>
                )}

                {showSuggestions && (
                  <motion.div {...fadeInUp(0.4)} className="w-full max-w-md">
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-6">
                      Suggestions on what to ask Our AI
                    </h3>
                    <div className="space-y-3">
                      <SuggestionsBar onSuggestionClick={handleSuggestionClick} />
                    </div>
                  </motion.div>
                )}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
              </motion.div>
            </AnimatePresence>
          </div>
        )}
<<<<<<< HEAD
        {/* FLOATING MODE (top of screen) */}
        {!showWelcome && (
          <FloatingSuggestions
            disabled={isAnswering}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      </div>

      {/* Chat Input */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-6 bg-transparent">
        <ChatInput
          onSendMessageAction={handleSendMessage}
          externalMessage={externalMessage}
<<<<<<< HEAD
          messages={messages}
          setMessages={setMessages}
          isThinking={isThinking}
          setIsThinking={setIsThinking}
          onBusyChange={setIsAnswering}
=======
          // setAvatarMessage={handleAvatarMessage}
          messages={messages}
          setMessages={setMessages}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* <Leva hidden /> */}
      <HomePageInner />
    </>
  )
}