import { useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/3 mb-2 bg-white text-black text-xs px-3 py-2 rounded shadow-lg max-w-[200px] w-max z-50 ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}