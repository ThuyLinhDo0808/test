"use client"

<<<<<<< HEAD
import { Shield, Eye, Server, FileKey, Lock, CheckCircle2 } from "lucide-react"
=======
import { Shield, Eye, Server, FileKey } from "lucide-react"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
import { useInView } from "react-intersection-observer"

interface SecurityFeaturesProps {
  inView?: boolean
}

export default function SecurityFeatures({ inView = false }: SecurityFeaturesProps) {
  const [ref1, inView1] = useInView({ threshold: 0.1, triggerOnce: true })
<<<<<<< HEAD
  const [, inView2]    = useInView({ threshold: 0.1, triggerOnce: true })
  const [, inView3]    = useInView({ threshold: 0.1, triggerOnce: true })
  const [, inView4]    = useInView({ threshold: 0.1, triggerOnce: true })
  const isVisible = inView || inView1 || inView2 || inView3 || inView4

  const items = [
    {
      icon: <Server className="h-5 w-5 text-blue-600 dark:text-purple-300" />,
      title: "On‑Premises Deployment",
      text: "Sensitive data never leaves your environment. No cloud dependency, no vendor lock‑in.",
    },
    {
      icon: <FileKey className="h-5 w-5 text-blue-600 dark:text-purple-300" />,
      title: "Advanced KYC",
      text: "Passport/VNeID validation with encrypted local processing and audit logs.",
    },
    {
      icon: <Eye className="h-5 w-5 text-blue-600 dark:text-purple-300" />,
      title: "Facial Verification",
      text: "Real‑time face match and anti‑spoofing to prevent badge sharing and tailgating.",
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-600 dark:text-purple-300" />,
      title: "Privacy by Design",
      text: "Configurable retention; easy data export & purge to meet org policies.",
    },
  ]

  return (
    <section
      ref={ref1}
      className={`py-20 bg-transparent transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0 translate-y-10"}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* summary ribbon */}
        <div className="mx-auto mb-10 max-w-3xl overflow-hidden rounded-full border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-white/10 backdrop-blur">
          <div className="flex items-center justify-center gap-4 px-5 py-2 text-xs text-blue-800 dark:text-white/85">
            <Lock className="h-4 w-4 text-blue-600 dark:text-purple-300" />
            <span className="text-sm">Encrypted locally</span>
            <span className="opacity-30">•</span>
            <span className="text-sm">Offline‑ready</span>
            <span className="opacity-30">•</span>
            <span className="text-sm">Zero PII to cloud</span>
          </div>
        </div>

        <header className="text-center mb-14">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-blue-900 dark:text-white">
            Enterprise‑Grade{" "}
            <span className="bg-clip-text text-transparent border-blue-600 dark:border-white/10 bg-gradient-to-r from-blue-400 to-purple-400">
              Security
            </span>
          </h2>
          <p className="mt-6 text-2xl text-blue-800/90 dark:text-purple-100/90 max-w-2xl mx-auto ">
            Built to satisfy strict facilities and regulated environments.
          </p>
        </header>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {items.map((it) => (
            <div
              key={it.title}
              className="group relative rounded-2xl border border-blue-300/20 dark:border-white/10 bg-gradient-to-br from-blue-100/50 to-blue-200/40 dark:from-blue-950/60 dark:via-black/50 dark:to-purple-950/60 backdrop-blur-xl p-6 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_60px_-20px_rgba(147,51,234,.25)]"
            >
              <div className="mb-4 flex items-center gap-3 p-3 mr-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl
                                bg-gradient-to-br from-blue-600/25 to-purple-600/25 border border-white/15 text-blue-200">
                  {it.icon}
                </div>
                <h3 className="text-xl font-semibold text-blue-900 dark:text-white mb-1">{it.title}</h3>
              </div>
              <p className="text-blue-800 dark:text-purple-100 ">{it.text}</p>
            </div>
          ))}
        </div>

        {/* compliance & diagram hint */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-blue-300/20 dark:border-white/10 bg-blue-50/50 dark:bg-black/40 backdrop-blur-xl p-6">
            <h4 className="mb-4 text-xl font-semibold text-blue-900 dark:text-white">Compliance readiness</h4>
            <ul className="space-y-2 text-base">
              {[
                "GDPR‑aligned data handling",
                "Configurable retention & export",
                "Admin‑only security controls",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 text-blue-800 dark:text-slate-200/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-blue-300/20 dark:border-white/10 bg-blue-50/50 dark:bg-gradient-to-br dark:from-blue-950/50 dark:via-black/40 dark:to-purple-950/50 backdrop-blur-xl p-6">
            <h4 className="mb-4 text-xl font-semibold text-blue-900 dark:text-white">On-prem architecture</h4>
            <div className="grid grid-cols-3 gap-3 text-sm text-blue-900 dark:text-slate-200/85">
              {[
                "Visitor Device",
                "Edge Cam/Mic",
                "Eye-Tracking WS",
                "Realtime STT/TTS",
                "LLM (Ollama/ChatGPT)",
                "RAG (ChromaDB)",
                "Face Match + Liveness",
                "ID OCR",
                "Access Control + Printer"
              ].map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-black/40 px-3 py-2"
                >
                  {b}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-blue-800/90 dark:text-slate-300/75">
              All critical processing runs inside your network. Internet is optional and only used when the admin selects cloud LLM.
            </p>
          </div>
        </div>
      </div>
    </section>
=======
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

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  )
}
