"use client"

import { ArrowRight, Building, Lock, MessageSquare, Upload, Users } from "lucide-react"
import Button from "@/components/ui/button/Button"
<<<<<<< HEAD
=======
import FeatureCard from "@/components/common/FeatureCard"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
import HowItWorksSection from "./InstructionSection"
import SecurityFeatures from "./SecuritySection"

import { useInView } from "react-intersection-observer"
import MagicalParticles from "@/layout/Particles"

export default function HomePage() {
  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: false })
  const [featuresRef, featuresInView] = useInView({ threshold: 0.1, triggerOnce: false })
  const [securityRef, securityInView] = useInView({ threshold: 0.1, triggerOnce: false })
  const [ctaRef, ctaInView] = useInView({ threshold: 0.1, triggerOnce: false })

  return (
<<<<<<< HEAD
    <div className="bg-transparent flex flex-col relative overflow-x-clip">
=======
    <div className="bg-transparent flex flex-col">
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      {/* Background magical particles */}
      <MagicalParticles />

      {/* Hero Section */}
      <section
        ref={heroRef}
<<<<<<< HEAD
        className={`relative transition-all duration-1000
          ${heroInView ? "opacity-100" : "opacity-0 translate-y-10"}
          min-h-[100svh] isolate flex items-center
        `}
      >
        {/* ambient glows: light=blue; dark=purple */}
        <div className="absolute inset-0 z-0 overflow-x-clip pointer-events-none opacity-50">
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-300 dark:bg-purple-500 rounded-full blur-3xl delay-1000 animate-pulse" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* LEFT: copy + actions */}
            <div className="text-center lg:text-left max-w-2xl lg:max-w-none mx-auto">
              <p className="text-xs tracking-[0.22em] uppercase font-semibold text-blue-700 dark:text-purple-300 mb-4">
                AI‑Powered Reception Assistant
              </p>

              <h1 className="text-4xl md:text-8xl font-bold text-blue-900 dark:text-white mb-6 relative overflow-x-clip">
                Meet{" "}
                <span className="relative inline-block">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600">Aura</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-200/30 via-pink-100/30 to-blue-200/30 dark:from-purple-600/30 dark:via-pink-500/30 dark:to-blue-600/30 blur-md rounded-lg -z-10 animate-pulse" />
                </span>
              </h1>

              <p className="mt-6 text-lg md:text-xl lg:text-2xl text-blue-800 dark:text-purple-100 leading-relaxed">
                The AI Unified Reception Assistant that transforms how visitors experience your building with intelligent
                conversations and seamless interactions.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
                <a href="/chat" className="inline-block">
                  <Button
                    size="md"
                    className="px-7 py-4 text-base md:text-lg font-semibold bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600 hover:from-purple-500 hover:to-blue-500 dark:hover:from-purple-700 dark:hover:to-blue-700 text-white border border-blue-300/20 dark:border-purple-500/20"
                  >
                    <span className="relative flex items-center">
                      Experience Aura
                      <ArrowRight className="ml-2.5 h-5 w-5 -mr-1 transition-transform group-hover:translate-x-0.5" />
=======
        className={`relative pt-20 pb-32 transition-all duration-1000 ${
          heroInView ? "opacity-100" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 z-0 opacity-30">
          <div
            className="absolute top-20 left-1/4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full filter blur-3xl animate-pulse"
          ></div>
          <div
            className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-300 dark:bg-blue-500 rounded-full filter blur-3xl animate-pulse delay-1000"
          ></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-blue-900 dark:text-white mb-6 relative">
                Meet{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600 relative inline-block">
                  Aura
                  <span className="absolute -inset-1 bg-gradient-to-r from-purple-200/30 via-pink-100/30 to-blue-200/30 dark:from-purple-600/30 dark:via-pink-500/30 dark:to-blue-600/30 blur-md rounded-lg -z-10 animate-pulse"></span>
                </span>
                <div className="absolute -inset-4 hidden lg:block">
                  <div
                    className="w-2 h-2 rounded-full bg-purple-300 dark:bg-purple-500 absolute top-0 left-0 animate-ping"
                    style={{ animationDuration: "3s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-blue-300 dark:bg-blue-500 absolute bottom-0 right-0 animate-ping"
                    style={{ animationDuration: "4s" }}
                  ></div>
                </div>
              </h1>
              <p className="text-xl md:text-2xl text-blue-900 dark:text-purple-100 mb-8">
                The AI Unified Reception Assistant that transforms how visitors experience your building
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/chat" className="inline-block">
                  <Button
                    size="md"
                    className="bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600 hover:from-purple-500 hover:to-blue-500 dark:hover:from-purple-700 dark:hover:to-blue-700 text-white relative group overflow-hidden"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/40 to-blue-400/40 dark:from-purple-600/40 dark:to-blue-600/40 animate-pulse-slow"></span>
                    <span className="relative">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 inline-block transition-transform group-hover:translate-x-1" />
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
                    </span>
                  </Button>
                </a>
              </div>
<<<<<<< HEAD

              {/* trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-blue-700 dark:text-purple-200">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Enterprise Security
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150" />
                  24/7 Availability
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse delay-300" />
                  Multi‑language Support
                </div>
              </div>
            </div>

            {/* RIGHT: visual hero panel */}
            <div className="relative">
              {/* glass panel */}
              <div className="mx-auto max-w-[520px]">
                <div className="relative rounded-3xl border border-blue-300/20 dark:border-purple-500/20 bg-blue-50/40 dark:bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                    <span className="text-sm text-blue-900 dark:text-white/80">Aura is online</span>
                  </div>

                  <div className="space-y-4">
                    <div className="w-4/5 rounded-2xl px-4 py-3 bg-gradient-to-r from-purple-200/50 to-blue-200/50 dark:from-purple-500/25 dark:to-blue-500/25 border border-blue-300/30 dark:border-white/10 text-blue-900 dark:text-white/90 text-sm">
                      Welcome! I can help you check in, find offices, and answer building questions.
                    </div>
                    <div className="ml-auto w-3/4 rounded-2xl px-4 py-3 bg-blue-100/60 dark:bg-white/10 border border-blue-300/30 dark:border-white/10 text-blue-900 dark:text-white/90 text-sm">
                      I&apos;d like to visit the Operations team.
                    </div>
                    <div className="w-[92%] rounded-2xl px-4 py-3 bg-gradient-to-r from-purple-200/50 to-blue-200/50 dark:from-purple-500/25 dark:to-blue-500/25 border border-blue-300/30 dark:border-white/10 text-blue-900 dark:text-white/90 text-sm">
                      Great—please scan your ID. I’ll issue a temporary QR for access.
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-full text-xs border border-blue-300/30 dark:border-white/15 text-blue-800 dark:text-white/80 bg-blue-100/50 dark:bg-white/5">
                      Secure • On‑Prem
                    </span>
                    <span className="px-3 py-1.5 rounded-full text-xs border border-blue-300/30 dark:border-white/15 text-blue-800 dark:text-white/80 bg-blue-100/50 dark:bg-white/5">
                      Realtime STT/TTS
                    </span>
                    <span className="px-3 py-1.5 rounded-full text-xs border border-blue-300/30 dark:border-white/15 text-blue-800 dark:text-white/80 bg-blue-100/50 dark:bg-white/5">
                      LLM + RAG
                    </span>
                  </div>
                </div>
=======
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="aspect-square w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-500">
                {/* Insert your image or animation component here */}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
              </div>
            </div>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* Features Section */}
      <section
        ref={featuresRef}
        className={[
          "relative py-24 transition-all duration-1000",
          featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        ].join(" ")}
      >
        {/* light/dark glows */}
        <div className="pointer-events-none absolute inset-0">
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-blue-900 dark:text-white">
              Magical{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-400 dark:to-blue-400">Features</span>
            </h2>
            <p className="mt-6 text-2xl text-blue-800/90 dark:text-purple-100/90 max-w-2xl mx-auto">
              Everything visitors need—delivered with low latency, strong security, and a delightful experience.
            </p>
          </div>

          {/* cards: keep structure, recolor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: MessageSquare, title: "Natural Interactions", desc: "Visitors can speak or chat with Aura just like they would with a human receptionist." },
              { icon: Lock,         title: "Secure Authentication", desc: "Advanced identity verification with ID scan and liveness." },
              { icon: Building,     title: "Building Knowledge",    desc: "Aura provides visitors with detailed information about your building and services." },
              { icon: Upload,       title: "Owner Knowledge",       desc: "Building owners can upload documents to train Aura with specific information." },
              { icon: Users,        title: "Visitor Management",    desc: "Streamline check-ins, access control, and visitor tracking in real-time." },
              { icon: MessageSquare,title: "Custom Q&A",            desc: "Create and edit your own FAQs to ensure Aura provides accurate information." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-blue-300/20 dark:border-white/10 bg-gradient-to-br from-blue-100/50 to-blue-200/40 dark:from-blue-950/60 dark:via-black/50 dark:to-purple-950/60 backdrop-blur-xl p-6 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_60px_-20px_rgba(147,51,234,.25)]"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative grid h-15 w-15 place-items-center rounded-xl border border-blue-300/30 dark:border-white/10 bg-blue-100/60 dark:bg-black/50">
                      <Icon className="h-7 w-7 text-blue-500 dark:text-purple-500" />
                    </div>
                    <div>
                      <h3 className="px-1 text-xl font-semibold text-blue-900 dark:text-white">{f.title}</h3>
                      <p className="px-1 mt-3 text-base text-blue-800/90 dark:text-slate-300/90">{f.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
=======

      {/* Features Section */}
      <section
        ref={featuresRef}
        className={`py-20 relative bg-transparent transition-all duration-1000 ${
          featuresInView ? "opacity-100" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 z-0 overflow-visible pointer-events-none opacity-50">
          {/* Top-left purple glow */}
          <div className="absolute top-[8rem] right-[6rem] w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-pulse"></div>

          {/* Bottom-right blue glow */}
          <div className="absolute bottom-[6rem] left-[6rem] w-80 h-80 bg-blue-300 dark:bg-blue-500 rounded-full filter blur-3xl opacity-60 animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-900 dark:text-white mb-16 relative inline-block">
            Magical{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-400 dark:to-blue-400">
              Features
            </span>
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-300/20 via-transparent to-blue-300/20 dark:from-purple-600/20 dark:to-blue-600/20 blur-md rounded-lg -z-10 animate-pulse-slow"></div>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Natural Interactions"
              description="Visitors can speak or chat with Aura just like they would with a human receptionist."
              delay={0}
            />
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Secure Authentication"
              description="Advanced identity verification with passport KYC and facial recognition."
              delay={100}
            />
            <FeatureCard
              icon={<Building className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Building Information"
              description="Aura provides visitors with detailed information about your building and services."
              delay={200}
            />
            <FeatureCard
              icon={<Upload className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Customizable Knowledge"
              description="Building owners can upload documents to train Aura with specific information."
              delay={300}
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Visitor Management"
              description="Streamline check-ins, access control, and visitor tracking in real-time."
              delay={400}
            />
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8 text-blue-500 dark:text-purple-500" />}
              title="Custom Q&A"
              description="Create and edit your own FAQs to ensure Aura provides accurate information."
              delay={500}
            />
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Security Features */}
      <div ref={securityRef}>
        <SecurityFeatures inView={securityInView} />
      </div>

<<<<<<< HEAD
=======
      {/* FAQ Section */}
     

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      {/* CTA Section */}
      <section
        ref={ctaRef}
        className={`py-20 relative overflow-hidden transition-all duration-1000 ${
          ctaInView ? "opacity-100" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 z-0 opacity-30 h-screen">
          <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-2/5 right-1/3 w-72 h-72 bg-blue-300 dark:bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
<<<<<<< HEAD
          <h2 className="text-4xl md:text-5xl font-bold text-blue-900 dark:text-white mb-6 relative inline-block">
=======
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 dark:text-white mb-6 relative inline-block">
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
            Ready to Transform Your Reception Experience?
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20 dark:from-purple-600/20 dark:to-purple-600/20 blur-md rounded-lg -z-10 animate-pulse-slow"></div>
          </h2>

<<<<<<< HEAD
          <p className="text-xl text-blue-800 dark:text-purple-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join the future of visitor management with Aura, the AI receptionist that combines security, efficiency, and a magical user experience.
          </p>
        </div>
      </section>
    </div>
  )
}
=======
          <p className="text-xl text-blue-800 dark:text-purple-100 mb-10 max-w-3xl mx-auto">
            Join the future of visitor management with Aura, the AI receptionist that combines security, efficiency, and
            a magical user experience.
          </p>
        </div>
      </section>

    </div>
  )
}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
