"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useInView } from "react-intersection-observer"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  delay?: number
}

export default function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [inView, delay])

  return (
      <div
        ref={ref}
        className={`group relative bg-gradient-to-br from-blue-200/40 to-purple-100/40 dark:from-purple-900/40 dark:to-purple-900/40 backdrop-blur-sm p-6 rounded-xl border border-blue-300/20 dark:border-purple-500/20 hover:border-blue-400 dark:hover:border-purple-500 transition-all duration-500 overflow-hidden transform ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/10 to-blue-300/10 dark:from-purple-500/10 dark:to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Magical corner accents */}
        {/* Top-left rounded corner */}
        <div className="absolute top-0 left-0 w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-full h-full border-t-2 border-l-2 border-blue-300 dark:border-purple-500 rounded-tl-xl"></div>
        </div>

        {/* Bottom-right rounded corner */}
        <div className="absolute bottom-0 right-0 w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-full h-full border-b-2 border-r-2 border-blue-300 dark:border-purple-500 rounded-br-xl"></div>
        </div>

        <div className="relative z-10">
          <div className="mb-4 p-3 bg-blue-200/30 dark:bg-purple-900/30 rounded-lg inline-block transform group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>

          <h3 className="text-xl font-semibold text-blue-900 dark:text-purple-100 group-hover:text-blue-600 dark:group-hover:text-purple-300 transition-colors duration-300">
            {title}
          </h3>

          <p className="text-blue-900 dark:text-purple-100 group-hover:text-blue-700 dark:group-hover:text-white transition-colors duration-300">
            {description}
          </p>
        </div>
      </div>


  )
}
