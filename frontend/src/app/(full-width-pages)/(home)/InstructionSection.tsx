"use client"

import { User, Building2 } from "lucide-react"
import { useInView } from "react-intersection-observer"

export default function HowItWorksSection() {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
<section
  ref={ref}
  className={`py-20 relative bg-transparent transition-all duration-1000 ${
    inView ? "opacity-100" : "opacity-0 translate-y-10"
  }`}
>
  <div className="absolute inset-0 z-0 overflow-visible pointer-events-none opacity-50">
    {/* Light: blue glows | Dark: purple glows */}
    <div className="absolute top-[10rem] left-[6rem] w-72 h-72 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-pulse"></div>
    <div className="absolute top-[10rem] right-[6rem] w-72 h-72 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-pulse"></div>
    <div className="absolute bottom-[6rem] right-[6rem] w-80 h-80 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-pulse delay-700"></div>
    <div className="absolute bottom-[6rem] left-[6rem] w-80 h-80 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-pulse delay-700"></div>
  </div>

  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-900 dark:text-white mb-16 relative inline-block">
      How{" "}
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 dark:from-purple-400 dark:to-purple-600">
        Aura
      </span>{" "}
      Works
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20 dark:from-purple-600/20 dark:to-purple-600/20 blur-md rounded-lg -z-10 animate-pulse-slow"></div>
    </h2>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
      {/* For Visitors */}
      <div className="bg-blue-100/30 dark:bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-blue-300/20 dark:border-purple-500/20 hover:border-blue-400 dark:hover:border-purple-500 transition-all duration-500 group">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-blue-200/50 dark:bg-purple-900/50 rounded-full mr-4 group-hover:bg-blue-300 dark:group-hover:bg-purple-700 transition-colors duration-300">
            <User className="h-6 w-6 text-blue-600 dark:text-purple-300 group-hover:text-blue-900 dark:group-hover:text-white transition-colors duration-300" />
          </div>
          <h3 className="text-2xl font-semibold text-blue-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-purple-300 transition-colors duration-300">
            For Visitors
          </h3>
        </div>

        <div className="space-y-6">
          {[
            {
              title: "Approach & Interact",
              text: "Walk up to Aura and start a conversation naturally by speaking or using the touch interface. Aura responds with lifelike expressions and voice.",
            },
            {
              title: "Ask Questions",
              text: "Inquire about building information, directions, or available services. Aura provides accurate, personalized responses based on the building owner's data.",
            },
            {
              title: "Security Verification",
              text: "If you need access to secure areas, Aura will guide you through the identity verification process using passport scanning and facial recognition.",
            },
            {
              title: "Access Granted",
              text: "Once verified, Aura provides access instructions or notifies the relevant personnel of your arrival.",
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`relative pl-8 pb-6 ${
                idx === 3 ? "pb-0" : ""
              } border-l border-blue-300/30 dark:border-purple-500/30 group-hover:border-blue-400 dark:group-hover:border-purple-500 transition-colors duration-300`}
            >
              <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 dark:bg-purple-500 group-hover:bg-blue-400 dark:group-hover:bg-purple-400 transition-colors duration-300"></div>
              <h4 className="text-xl font-medium text-blue-800 dark:text-purple-200 mb-2 group-hover:text-blue-900 dark:group-hover:text-white transition-colors duration-300">
                {step.title}
              </h4>
              <p className="text-blue-700 dark:text-purple-100 group-hover:text-blue-900 dark:group-hover:text-purple-50 transition-colors duration-300">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* For Building Owners */}
      <div className="bg-blue-100/30 dark:bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-blue-300/20 dark:border-purple-500/20 hover:border-blue-400 dark:hover:border-purple-500 transition-all duration-500 group">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-blue-200/50 dark:bg-purple-900/50 rounded-full mr-4 group-hover:bg-blue-300 dark:group-hover:bg-purple-700 transition-colors duration-300">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-purple-300 group-hover:text-blue-900 dark:group-hover:text-white transition-colors duration-300" />
          </div>
          <h3 className="text-2xl font-semibold text-blue-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-purple-300 transition-colors duration-300">
            For Building Owners
          </h3>
        </div>

        <div className="space-y-6">
          {[
            {
              title: "Upload Documents",
              text: "Provide building information, policies, and procedures through the admin dashboard. Aura learns from these documents to answer visitor questions.",
            },
            {
              title: "Customize Q&A",
              text: "Create and edit specific questions and answers to ensure Aura provides accurate information about your building and services.",
            },
            {
              title: "Set Security Protocols",
              text: "Define access levels, verification requirements, and security protocols for different visitor types and building areas.",
            },
            {
              title: "Monitor & Analyze",
              text: "Access real-time data on visitor interactions, frequently asked questions, and system performance through comprehensive analytics.",
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`relative pl-8 pb-6 ${
                idx === 3 ? "pb-0" : ""
              } border-l border-blue-300/30 dark:border-purple-500/30 group-hover:border-blue-400 dark:group-hover:border-purple-500 transition-colors duration-300`}
            >
              <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 dark:bg-purple-500 group-hover:bg-blue-400 dark:group-hover:bg-purple-400 transition-colors duration-300"></div>
              <h4 className="text-xl font-medium text-blue-800 dark:text-purple-200 mb-2 group-hover:text-blue-900 dark:group-hover:text-white transition-colors duration-300">
                {step.title}
              </h4>
              <p className="text-blue-700 dark:text-purple-100 group-hover:text-blue-900 dark:group-hover:text-purple-50 transition-colors duration-300">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

  )
}
