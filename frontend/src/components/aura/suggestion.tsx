import React from "react";

// Add props interface
interface SuggestionsBarProps {
  onSuggestionClick: (text: string) => void;
}

const SuggestionsBar: React.FC<SuggestionsBarProps> = ({ onSuggestionClick }) => {
  const suggestions = [
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
