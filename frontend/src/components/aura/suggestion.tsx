<<<<<<< HEAD
"use client"

import type React from "react"
import { Building2, Clock, Phone, Info } from "lucide-react"

// Add props interface
interface SuggestionsBarProps {
  onSuggestionClick: (text: string) => void
=======
import React from "react";

// Add props interface
interface SuggestionsBarProps {
  onSuggestionClick: (text: string) => void;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}

const SuggestionsBar: React.FC<SuggestionsBarProps> = ({ onSuggestionClick }) => {
  const suggestions = [
<<<<<<< HEAD
    {
      text: "Access the building",
      icon: Building2,
      description: "I want to enter the building",
    },
    {
      text: "Opening hours",
      icon: Clock,
      description: "What is the opening hours of the building?",
    },
    {
      text: "Contact information",
      icon: Phone,
      description: "What is the building address and contact information?",
    },
    {
      text: "Building information",
      icon: Info,
      description: "Tell me about the building, what can I do there?",
    },
  ]
return (
  <div className="w-full h-full p-3">
    <div className="grid w-full h-full grid-cols-2 grid-rows-2 gap-3">
      {suggestions.slice(0, 4).map((suggestion, index) => {
        const IconComponent = suggestion.icon
        return (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.text)}
            title={suggestion.description}
            className="w-full h-full rounded-2xl overflow-hidden
                       bg-white/20 text-gray-800 hover:bg-white/30
                       dark:bg-gray-800/30 dark:text-white dark:hover:bg-gray-800/50
                       backdrop-blur-sm border border-white/10 dark:border-gray-700/30
                       shadow-md transition-colors duration-200
                       flex flex-col items-center justify-center gap-2 text-center"
          >
            <IconComponent className="w-7 h-7" />
            <span className="font-semibold text-sm md:text-base truncate px-2">
              {suggestion.text}
            </span>
          </button>
        )
      })}
    </div>
  </div>
)
}

export default SuggestionsBar
=======
    "What can I ask you to do?",
    "I want to enter the building",
    "Whats is the opening hours?",
  ];

  return (
    <div className="w-full flex flex-wrap justify-center gap-2 px-4 mt-4">
      {suggestions.map((text, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(text)} 
          className="px-4 py-2 text-sm rounded-full
            bg-white/20 text-gray-800 hover:bg-white/30
            dark:bg-gray-800/30 dark:text-white dark:hover:bg-gray-800/50
            backdrop-blur-sm transition-colors shadow-md"
        >
          {text}
        </button>
      ))}
    </div>
  );
};

export default SuggestionsBar;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
