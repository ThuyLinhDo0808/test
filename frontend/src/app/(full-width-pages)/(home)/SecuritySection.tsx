"use client"

import { Shield, Eye, Server, FileKey } from "lucide-react"
import { useInView } from "react-intersection-observer"

interface SecurityFeaturesProps {
  inView?: boolean
}

export default function SecurityFeatures({ inView = false }: SecurityFeaturesProps) {
  const [ref1, inView1] = useInView({ threshold: 0.1, triggerOnce: true })
  const [ref2, inView2] = useInView({ threshold: 0.1, triggerOnce: true })
  const [ref3, inView3] = useInView({ threshold: 0.1, triggerOnce: true })
  const [ref4, inView4] = useInView({ threshold: 0.1, triggerOnce: true })

  const isVisible = inView || inView1 || inView2 || inView3 || inView4

  return (
    <section
      className={`py-20 bg-transparent transition-all duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-900 dark:text-white mb-6 relative inline-block">
          Enterprise-Grade{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 dark:from-purple-400 dark:to-purple-600">
            Security
          </span>
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20 dark:from-purple-600/20 dark:to-purple-600/20 blur-md rounded-lg -z-10 animate-pulse-slow"></div>
        </h2>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card Template */}
          {[
            {
              icon: <Server className="h-6 w-6 text-blue-600 dark:text-purple-300" />,
              title: "On-Premises Deployment",
              text: "Aura runs entirely on your local infrastructure, ensuring sensitive data never leaves your premises. This eliminates cloud-related security risks and latency issues.",
              ref: ref1,
              inView: inView1,
            },
            {
              icon: <FileKey className="h-6 w-6 text-blue-600 dark:text-purple-300" />,
              title: "Advanced KYC Verification",
              text: "Secure passport scanning and verification ensures visitors are who they claim to be. All identity verification happens locally, protecting sensitive personal information.",
              ref: ref2,
              inView: inView2,
            },
            {
              icon: <Eye className="h-6 w-6 text-blue-600 dark:text-purple-300" />,
              title: "Facial Recognition",
              text: "Biometric verification adds an extra layer of security. Our facial recognition technology works in real-time and is resistant to spoofing attempts.",
              ref: ref3,
              inView: inView3,
            },
            {
              icon: <Shield className="h-6 w-6 text-blue-600 dark:text-purple-300" />,
              title: "Data Privacy Compliance",
              text: "Aura is designed with privacy regulations in mind. The on-premises architecture helps you maintain compliance with GDPR, HIPAA, and other data protection standards.",
              ref: ref4,
              inView: inView4,
            },
          ].map(({ icon, title, text, ref, inView }, idx) => (
            <div
              key={idx}
              ref={ref}
              className={`flex items-start p-6 bg-gradient-to-br from-blue-200/20 to-blue-300/20 dark:from-purple-900/20 dark:to-purple-900/20 rounded-xl border border-blue-300/20 dark:border-purple-500/20 hover:border-blue-500 dark:hover:border-purple-500 transition-all duration-500 transform ${
                inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
              }`}
            >
              <div className="p-3 bg-blue-100/30 dark:bg-purple-900/30 rounded-lg mr-4 transform transition-transform hover:scale-110 duration-300">
                {icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-900 dark:text-white mb-2">{title}</h3>
                <p className="text-blue-800 dark:text-purple-100">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

  )
}
