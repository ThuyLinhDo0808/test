"use client"

<<<<<<< HEAD
import { User, Building2, Headphones, Mic, QrCode, FileText, ShieldCheck, LucideWorkflow, Webhook, ServerIcon } from "lucide-react"
import { useInView } from "react-intersection-observer"

export default function HowItWorksSection() {
  const [ref, inView] = useInView({ threshold: 0.15, triggerOnce: true })

  const visitorSteps = [
    { icon: <Headphones className="w-4 h-4" />, title: "Greet Aura", text: "Walk up and speak naturally or tap to start." },
    { icon: <Mic className="w-4 h-4" />,         title: "Ask or Request", text: "Find rooms, people, or request building entry." },
    { icon: <QrCode className="w-4 h-4" />,       title: "Verify & Go", text: "Scan ID / VNeID and receive a temporary QR." },
  ]

  const adminSteps = [
    { icon: <FileText className="w-4 h-4" />, title: "Upload Content", text: "Docs & FAQs power precise answers." },
    { icon: <ShieldCheck className="w-4 h-4" />, title: "Set Policies", text: "Tune workflow, security rules, and access." },
    { icon: <Building2 className="w-4 h-4" />, title: "Monitor", text: "Review logs and iterate without redeploys." },
    { icon: <LucideWorkflow className="w-4 h-4" />, title: "Edit Workflow", text: "Edit flows without coding." },
    { icon: <Webhook className="w-4 h-4" />, title: "Integrate Webhook", text: "Receive real-time updates and events." },
    { icon: <ServerIcon className="w-4 h-4" />, title: "Adjust provider", text: "Change the model settings based on environment." },
  ]

  return (
    <section
      ref={ref}
      className={`relative py-24 transition-all duration-1000 ${inView ? "opacity-100" : "opacity-0 translate-y-8"}`}
    >
      {/* subtle ambient glows: light blue / dark purple */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-20 left-60 h-62 w-50 rounded-full bg-blue-300/50 dark:bg-purple-500/30 blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-14">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-blue-900 dark:text-white">
            How <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 dark:from-purple-400 dark:to-purple-600">Aura</span> Works
          </h2>
          <p className="mt-6 text-2xl text-blue-800/90 dark:text-purple-100/90 max-w-2xl mx-auto">
            A guided flow for visitors and a no‑code setup for building admins.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-3">
          {/* Steps */}
          <div className="space-y-10">
            {/* Visitors */}
            <Card>
              <CardHeader icon={<User className="h-5 w-5" />} title="For Visitors" subtitle="Smooth, human‑like reception" />
              <StepList steps={visitorSteps} />
            </Card>

            {/* Admins */}
            <Card>
              <CardHeader icon={<Building2 className="h-5 w-5" />} title="For Building Admins" subtitle="Control content, policies & flows" />
              <StepList steps={adminSteps} />
            </Card>
          </div>

          {/* Illustration / sticky panel */}
          <div className="lg:sticky lg:top-28">
            <div className="relative mx-auto max-w-lg rounded-3xl border border-blue-300/20 dark:border-white/10 bg-blue-50/40 dark:bg-white/5 backdrop-blur-xl p-6 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.35)] overflow-x-clip">
              {/* background glow */}
              <div className="absolute inset-0 -z-10 rounded-[2.2rem] bg-[radial-gradient(closest-side,rgba(59,130,246,.14),transparent_65%)] dark:bg-[radial-gradient(closest-side,rgba(168,85,247,.14),transparent_65%)]" />

              <div className="mb-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100/60 dark:bg-white/10 grid place-items-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600 dark:text-violet-300"><path fill="currentColor" d="M12 2l7 4v6c0 5-7 10-7 10S5 17 5 12V6l7-4z"/></svg>
                </div>
                <div className="text-xl font-medium text-blue-900 dark:text-white/80">Aura Realtime Pipeline</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* KPI: STT Accuracy */}
                <div className="rounded-2xl border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-white/5 p-4">
                  <div className="text-sm uppercase tracking-wide text-blue-700 dark:text-white/60">Speech Recognition</div>
                  <div className="mt-1 text-2xl font-extrabold text-blue-900 dark:text-white">High Accuracy</div>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-blue-400/40 to-transparent dark:via-white/10" />
                  <div className="mt-3 text-sm text-blue-800/80 dark:text-white/70">
                    Faster-Whisper + tuned VAD provide robust transcription in noisy lobbies with domain-specific prompts.
                  </div>
                </div>

                {/* KPI: TTS Latency */}
                <div className="rounded-2xl border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-white/5 p-4">
                  <div className="text-sm uppercase tracking-wide text-blue-700 dark:text-white/60">Text-to-Speech</div>
                  <div className="mt-1 text-2xl font-extrabold text-blue-900 dark:text-white">≤ 150 ms</div>
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-blue-400/40 to-transparent dark:via-white/10" />
                  <div className="mt-3 text-sm text-blue-800/80 dark:text-white/70">
                    Realtime TTS streams first audio in under 150 ms, delivering natural voice with low jitter.
                  </div>
                </div>
              </div>

              {/* Pill highlights */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Accurate recognition with STT model",
                  "Noise-robust VAD gating for clarity",
                  "Streaming decode with partial transcripts",
                  "Overlap-add TTS for smooth continuous speech",
                ].map((t) => (
                  <div
                    key={t}
                    className="rounded-xl border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-white/5 px-3 py-2 text-sm text-blue-900 dark:text-white/80"
                  >
                    {t}
                  </div>
                ))}
              </div>

              {/* Chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Domain-tuned STT",
                  "Streaming STT partials",
                  "Realtime TTS (RTF < 1)",
                  "First audio ≤ 150 ms",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-blue-300/20 dark:border-white/10 bg-blue-100/50 dark:bg-white/6 px-3 py-1 text-[12px] text-blue-800 dark:text-white/80"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-blue-300/20 dark:border-white/10 bg-blue-50/50 dark:bg-white/5 backdrop-blur-xl p-6">
      {children}
    </div>
  )
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-200/70 to-purple-200/70 dark:from-blue-500/20 dark:to-purple-500/20">
        <span className="text-blue-700 dark:text-blue-300">{icon}</span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-blue-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-blue-800/80 dark:text-white/60">{subtitle}</p>}
      </div>
    </div>
  )
}

function StepList({ steps }: { steps: { icon: React.ReactNode; title: string; text: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="group relative rounded-xl border border-blue-300/20 dark:border-white/10 bg-blue-50/40 dark:bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-200/60 dark:bg-white/10">
              <span className="text-xs text-blue-800 dark:text-white/80">{i + 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 dark:text-white/80">{s.icon}</span>
                <h4 className="font-medium text-blue-900 dark:text-white">{s.title}</h4>
              </div>
              <p className="mt-1 text-sm text-blue-800/80 dark:text-white/70">{s.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
=======
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
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
