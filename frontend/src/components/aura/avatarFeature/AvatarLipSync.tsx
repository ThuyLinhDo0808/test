import { useFrame } from "@react-three/fiber";
import { SkinnedMesh } from "three";
import {
  audioCtxRef, t0Ref, pendingEventsRef, activeEnvelopesRef, ActiveEnv
} from "../../../hooks/constantsLipsync";

import { useMemo } from "react";
import { GLTFResult } from "@/types/GLTFtypes";
import * as THREE from "three";

// Accept only what we need: head + teeth skinned meshes
type AvatarNodes = Pick<GLTFResult["nodes"], "Wolf3D_Head" | "Wolf3D_Teeth">;

type MorphDict = Record<string, number>;

function setMorph(mesh: THREE.SkinnedMesh | undefined, idx: number | undefined, value: number) {
  if (!mesh || idx === undefined) return;
  const infl = mesh.morphTargetInfluences;
  if (!infl) return;
  infl[idx] = value;
}

function decayMesh(mesh: THREE.SkinnedMesh | undefined, factor: number) {
  if (!mesh?.morphTargetInfluences) return;
  const infl = mesh.morphTargetInfluences;
  for (let i = 0; i < infl.length; i++) infl[i] *= factor;
}

export function useAvatarLipSync(nodes: AvatarNodes, decayFactor = 0.85) {
  // Build quick lookups once
  const lookups = useMemo(() => {
    const head = nodes.Wolf3D_Head;
    const teeth = nodes.Wolf3D_Teeth;

    const headDict: MorphDict = head?.morphTargetDictionary ?? {};
    const teethDict: MorphDict = teeth?.morphTargetDictionary ?? {};

    // Accessors: name -> index for each mesh
    const getHead = (name: string) => headDict[name];
    const getTeeth = (name: string) => teethDict[name];

    return {
      head,
      teeth,
      getHead,
      getTeeth,
    };
  }, [nodes.Wolf3D_Head, nodes.Wolf3D_Teeth]);

  const setViseme = (name: string, value: number) => {
    setMorph(lookups.head, lookups.getHead(name), value);
    setMorph(lookups.teeth, lookups.getTeeth(name), value);
  };

  const decayVisemes = (factor: number) => {
    decayMesh(lookups.head, factor);
    decayMesh(lookups.teeth, factor);
  };

  const DEF_ATTACK = 0.03;     // 30ms
  const DEF_DECAY  = 0.04;     // 40ms
  const MORPH_CAP  = 0.9;      // safety clamp

  // Optional per-viseme tuning. Omitted keys default to 1.0
  const perVisemeGain: Record<string, number> = {
    // Labials: usually need full strength for clear closures
    viseme_PP: 1.0,   // p/b/m

    // Vowels: often strong but keep under cap
    viseme_aa: 0.95,
    viseme_I:  0.95,
    viseme_O:  0.95,
    viseme_U:  0.95,
    viseme_E:  0.95,

    // Sibilants/fricatives can look harsh
    viseme_SS: 0.8,   // s/z/ʃ/ʒ
    viseme_FF: 0.8,   // f/v

    // Rhotic curl tends to overshoot on some rigs
    viseme_RR: 0.6,   // r/ɹ/l (if you mapped l→RR)

    // Stops
    viseme_DD: 0.9,   // t/d/ɾ/ʔ
    viseme_kk: 0.9,   // k/g

    // Affricates
    viseme_CH: 0.85,  // tʃ/dʒ

    // Nasals
    viseme_nn: 0.9,   // n/ŋ
  };

  // ---- helpers
  function fitRamps(duration: number, attack?: number, decay?: number) {
    const a0 = Math.max(0, attack ?? DEF_ATTACK);
    const d0 = Math.max(0, decay  ?? DEF_DECAY);
    // keep ramps <= 40% each of total; then ensure a+d <= duration (triangle if needed)
    const a = Math.min(a0, duration * 0.4);
    const d = Math.min(d0, duration * 0.4);
    if (a + d <= duration || duration <= 0) return { a, d };
    const scale = duration / (a + d); // triangle fix
    return { a: a * scale, d: d * scale };
  }

  function envValueFromCountdown(env: ActiveEnv) {
    const elapsed = env.total - env.timeLeft;         // seconds since start
    if (elapsed <= 0 || env.total <= 0) return 0;

    const hold = Math.max(0, env.total - env.attack - env.decay);
    if (elapsed < env.attack) {
      // attack
      return (elapsed / Math.max(1e-6, env.attack)) * env.peak;
    }
    if (elapsed < env.attack + hold) {
      // sustain
      return env.peak;
    }
    // decay
    const td = elapsed - (env.attack + hold);
    return Math.max(0, env.peak * (1 - td / Math.max(1e-6, env.decay)));
  }

  // ---- promotion from pending → active (call inside useFrame when due)
  function promoteDueEvents(now: number) {
    while (pendingEventsRef.current.length && pendingEventsRef.current[0].at <= now) {
      const ev = pendingEventsRef.current.shift()!;
      const { a, d } = fitRamps(ev.duration, ev.attack, ev.decay);
      activeEnvelopesRef.current.push({
        name: ev.name,
        timeLeft: ev.duration,
        total: ev.duration,
        peak: Math.min(1, Math.max(0, ev.peak ?? 1)),
        attack: a,
        decay: d,
      });

      // Test the envelope
      //console.log(`[Lipsync] Promoted ${ev.name} at ${ev.at.toFixed(3)}s, dur=${ev.duration.toFixed(3)}s, peak=${ev.peak ?? 1}, attack=${a.toFixed(3)}, decay=${d.toFixed(3)}`);
    }
  }

  // ---- main render loop (uses your ActiveEnv shape)
  useFrame((_, rawDt) => {
    const ctx = audioCtxRef.current;
    const t0  = t0Ref.current;
    if (!ctx || t0 == null) return;

    // clamp dt to avoid big jumps on tab switches, etc.
    const dt = Math.min(Math.max(rawDt, 0), 0.1); // ≤100ms

    const now = ctx.currentTime - t0;

    // 1) Promote due viseme events
    promoteDueEvents(now);

    // 2) Aggregate MAX per viseme (prevents last-write-wins)
    const byName = new Map<string, number>();
    for (const env of activeEnvelopesRef.current) {
      const v = envValueFromCountdown(env); // 0..peak (ADSR shape)
      if (v <= 0) continue;
      const gain = perVisemeGain[env.name] ?? 1;
      const val = Math.min(MORPH_CAP, v * gain);
      if (val > (byName.get(env.name) ?? 0)) byName.set(env.name, val);
    }

    // 3) Apply once per viseme
    for (const [name, val] of byName) setViseme(name, val);

    // 4) Countdown & prune finished envelopes
    for (const env of activeEnvelopesRef.current) env.timeLeft -= dt;
    activeEnvelopesRef.current = activeEnvelopesRef.current.filter(e => e.timeLeft > 0);

    // 5) Global relax toward neutral
    decayVisemes(decayFactor);
  });
}
