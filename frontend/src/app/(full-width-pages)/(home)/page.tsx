"use client"

import { ArrowRight, Building, Lock, MessageSquare, Upload, Users } from "lucide-react"
import Button from "@/components/ui/button/Button"
import FeatureCard from "@/components/common/FeatureCard"
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
    <div className="bg-transparent flex flex-col">
      {/* Background magical particles */}
      <MagicalParticles />

      {/* Hero Section */}
      <section
        ref={heroRef}
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
                    </span>
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="aspect-square w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-500">
                {/* Insert your image or animation component here */}
              </div>
            </div>
          </div>
        </div>
      </section>


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
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Security Features */}
      <div ref={securityRef}>
        <SecurityFeatures inView={securityInView} />
      </div>

      {/* FAQ Section */}
     

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
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 dark:text-white mb-6 relative inline-block">
            Ready to Transform Your Reception Experience?
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20 dark:from-purple-600/20 dark:to-purple-600/20 blur-md rounded-lg -z-10 animate-pulse-slow"></div>
          </h2>

          <p className="text-xl text-blue-800 dark:text-purple-100 mb-10 max-w-3xl mx-auto">
            Join the future of visitor management with Aura, the AI receptionist that combines security, efficiency, and
            a magical user experience.
          </p>
        </div>
      </section>

    </div>
  )
}
