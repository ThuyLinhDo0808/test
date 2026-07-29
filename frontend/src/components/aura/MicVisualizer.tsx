"use client";
import { useEffect, useRef } from "react";
import AudioMotionAnalyzer from "audiomotion-analyzer";

type Props = {
  ctx: AudioContext | null;
  stream: MediaStream | null;
  width?: number;
  height?: number;   // total height for both halves
  mode?: 0 | 1;      // 0=bars, 1=waveform
};

export default function MicVisualizerMirrored({
  ctx,
  stream,
  width = 100,
  height = 50,
  mode = 1,
}: Props) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const botRef = useRef<HTMLDivElement | null>(null);
  const topAM = useRef<AudioMotionAnalyzer | null>(null);
  const botAM = useRef<AudioMotionAnalyzer | null>(null);

  // 🔎 Effect 1: props readiness debug
  useEffect(() => {
    console.debug("[MICDBG] Visualizer props", {
      hasCtx: !!ctx,
      hasStream: !!stream,
      ctxState: ctx?.state,
      mountedTop: !!topRef.current,
      mountedBot: !!botRef.current,
    });
  }, [ctx, stream]);

  // 🎛️ Effect 2: init/destroy analyzers when ready
  useEffect(() => {
    // guard: wait for all inputs and DOM nodes
    if (!ctx || !stream || !topRef.current || !botRef.current) {
      console.debug("[MICDBG] Visualizer waiting for ctx/stream/refs…");
      return;
    }
    // prevent double init
    if (topAM.current || botAM.current) {
      console.debug("[MICDBG] Visualizer already initialized — skipping");
      return;
    }

    (async () => {
      try {
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
            console.debug("[MICDBG] AudioContext resumed:", ctx.state);
          } catch (e) {
            console.warn("[MICDBG] AudioContext resume failed", e);
          }
        }

        const src = ctx.createMediaStreamSource(stream);

        const commonOpts = {
          audioCtx: ctx,
          height: Math.max(10, Math.floor(height / 2)),
          mode,
          overlay: true,
          showBgColor: false,
          bgAlpha: 0,
          showScaleX: false,
          showScaleY: false,
          gradient: "classic" as const,
        };

        if (!topRef.current || !botRef.current) return;

        const amTop = new AudioMotionAnalyzer(topRef.current, commonOpts);
        const amBot = new AudioMotionAnalyzer(botRef.current, commonOpts);

        topAM.current = amTop;
        botAM.current = amBot;

        const isDark = document.documentElement.classList.contains("dark");
        const gradientDef = {
          bgColor: "transparent",
          colorStops: isDark
            ? [{ pos: 0, color: "rgba(180,180,255,0.9)" }]
            : [{ pos: 0, color: "rgba(50,50,50,0.9)" }],
        };

        amTop.registerGradient("whiteGray", gradientDef);
        amBot.registerGradient("whiteGray", gradientDef);
        amTop.setOptions({ gradient: "whiteGray" });
        amBot.setOptions({ gradient: "whiteGray" });

        // connect input (muted so no feedback)
        amTop.connectInput(src);
        amBot.connectInput(src);
        amTop.volume = 0;
        amBot.volume = 0;

        console.debug("[MICDBG] Visualizer initialized", {
          containerTop: !!topRef.current,
          containerBot: !!(botRef.current),
          mode,
          hEach: Math.max(10, Math.floor(height / 2)),
        });
      } catch (err) {
        console.error("[MICDBG] Visualizer init failed", err);
        // roll back partial init
        try { topAM.current?.destroy(); } catch {}
        try { botAM.current?.destroy(); } catch {}
        topAM.current = null;
        botAM.current = null;
      }
    })();

    // cleanup on unmount / prop change
    return () => {
      console.debug("[MICDBG] Visualizer cleanup");
      try { topAM.current?.destroy(); } catch {}
      try { botAM.current?.destroy(); } catch {}
      topAM.current = null;
      botAM.current = null;
    };
  }, [ctx, stream, height, mode]);

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div ref={topRef} style={{ width: "100%", height: height / 2 }} />
      <div
        ref={botRef}
        style={{
          width: "100%",
          height: height / 2,
          transform: "scaleY(-1)",
          transformOrigin: "center",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
