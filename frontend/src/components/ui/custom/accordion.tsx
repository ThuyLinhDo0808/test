"use client"

import type React from "react"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

// Simple utility function to conditionally join classNames
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

interface AccordionItemProps {
  value: string
  title: string
  children: ReactNode
  isOpen: boolean
  onToggle: (value: string) => void
  className?: string
  style?: React.CSSProperties
}

export function AccordionItem({ value, title, children, isOpen, onToggle, className, style }: AccordionItemProps) {
  return (
      <div
        className={cn(
          "border-b border-blue-300/30 dark:border-purple-500/30 transition-all duration-500",
          className
        )}
        style={style}
      >
        <button
          type="button"
          onClick={() => onToggle(value)}
          className="flex w-full items-center justify-between py-6 text-left text-lg font-medium text-blue-900 dark:text-white hover:text-blue-600 dark:hover:text-purple-300 transition-colors group"
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-blue-600 dark:text-purple-300 transition-transform duration-300",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isOpen ? "max-h-96 pb-6" : "max-h-0"
          )}
        >
          <div className="text-blue-800 dark:text-purple-100 relative">
            <div className="absolute left-0 top-0 w-1 h-0 bg-blue-500 dark:bg-purple-500 transition-all duration-500"></div>
            {children}
          </div>
        </div>
      </div>

  )
}

interface AccordionProps {
  type?: "single" | "multiple"
  children: ReactNode
  className?: string
}

export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn("space-y-1", className)}>{children}</div>
}

export function useAccordion(defaultValues: string[] = []) {
  const [openItems, setOpenItems] = useState<string[]>(defaultValues)

  const toggleItem = (value: string) => {
    if (openItems.includes(value)) {
      setOpenItems(openItems.filter((item) => item !== value))
    } else {
      setOpenItems([...openItems, value])
    }
  }

  return {
    openItems,
    toggleItem,
  }
}
