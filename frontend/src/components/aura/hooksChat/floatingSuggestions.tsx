"use client"

import * as React from "react"
import { Building2, Info } from "lucide-react"

interface FloatingSuggestionsBarProps {
  onSuggestionClick: (text: string) => void
  className?: string
  disabled?: boolean
}

const FloatingSuggestionsBar: React.FC<FloatingSuggestionsBarProps> = ({
  onSuggestionClick,
  className = "",
  disabled = false,
}) => {
  const suggestions = [
    { text: "Access the building", icon: Building2, description: "I want to enter the building" },
    { text: "Building information", icon: Info, description: "Tell me about the building, what can I do there?" },
  ]

  return (
    <div
      className={[
        "fixed top-0 right-[15px] w-full md:w-1/3 px-3",
        "pt-[max(env(safe-area-inset-top),0.5rem)]",
        "z-50",
        className,
      ].join(" ")}
      aria-busy={disabled}
    >
      <div className="w-full">
        <div className="grid grid-cols-2 gap-2 p-2 sm:p-3">
          {suggestions.map((s, i) => {
            const Icon = s.icon
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onSuggestionClick(s.text)}
                title={s.description}
                aria-disabled={disabled}
                className={[
                  "group w-full rounded-xl",
                  "bg-white/20 text-gray-800 hover:bg-white/30",
                  "dark:bg-gray-800/30 dark:text-white dark:hover:bg-gray-800/50",
                  "backdrop-blur-sm transition-colors duration-200",
                  "border border-white/10 dark:border-gray-700/30",
                  "shadow-md flex items-center justify-center gap-2",
                  "px-3 py-5 text-center",
                  // disabled styling
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "disabled:hover:bg-white/20 dark:disabled:hover:bg-gray-800/30",
                ].join(" ")}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-xs sm:text-sm truncate">{s.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FloatingSuggestionsBar
