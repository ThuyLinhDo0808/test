"use client"

import SuggestionsBar from "@/components/aura/suggestion"
import { useRef, useState, useEffect, useCallback } from "react"
import ChatInput from "@/components/aura/ChatInput"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Star } from "lucide-react"
import MagicalParticles from "@/layout/Particles"
import { useTheme } from "@/context/ThemeContext"
import { Canvas } from "@react-three/fiber"
import type { AvatarMessage } from "@/types/avatar"
import { CameraControls, Environment } from "@react-three/drei";
import type { CameraControls as CameraControlsType } from "@react-three/drei";
import { RotatableAvatar } from "@/components/aura/avatarFeature/RotatableAvatar";
import { Random } from "@/components/aura/avatarFeature/random"
import { Leva } from "leva"
import {v4 as uuidv4} from "uuid";

export interface ChatMessage {
  id: string;          // Unique identifier for each message 
  sender: "user" | "bot";
  text?: string; // still allow normal text messages
  content?: React.ReactNode; // for special rich content (QR codes, etc.)
  finalized: boolean; // Whether the message has been finalized and sent
}

interface ChatContentProps {
  showSuggestions: boolean;
  showTitle: boolean;
  messages: ChatMessage[];
  handleSuggestionClick: (text: string) => void;
  handleSendMessage: (text: string) => void;
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

  const handleSendMessage = (msg: string) => {
    const id = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id, sender: "user", text: msg, finalized: true },
    ]);
    setShowSuggestions(false);
    setShowTitle(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setExternalMessage(suggestion);
    setShowSuggestions(false);
    setShowTitle(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


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
              message={avatarMessage}
            />
          </Canvas>
        </div>
      </div>
      
      <div className="flex-1 relative z-10 ">
        <ChatContent
          showSuggestions={showSuggestions}
          showTitle={showTitle}
          messages={messages}
          handleSuggestionClick={handleSuggestionClick}
          handleSendMessage={handleSendMessage}
          // setAvatarMessage={setAvatarMessage}
          externalMessage={externalMessage}
          setMessages={setMessages}
        />
        <div ref={scrollRef} />
      </div>
    </div>
  );
}

const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

function ChatContent({
  showSuggestions,
  showTitle,
  messages,
  handleSuggestionClick,
  handleSendMessage,
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
  
  return (
    <div className="flex flex-col h-full relative ">
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key="welcome"
                {...fadeInUp()}
                className="text-center space-y-8"
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
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-6 bg-transparent">
        <ChatInput
          onSendMessageAction={handleSendMessage}
          externalMessage={externalMessage}
          // setAvatarMessage={handleAvatarMessage}
          messages={messages}
          setMessages={setMessages}
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