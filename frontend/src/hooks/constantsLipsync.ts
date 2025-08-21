import { RefObject } from "react";

export type VisemeEvent = { 
    at: number;
    name: string; 
    duration: number; 
    peak?: number     // 0..1 intensity
    attack?: number;  // optional ms/s; small fade-in
    decay?: number    // optional ms/s; small fade-out
};

export type ActiveEnv = { 
  name: string; 
  timeLeft: number;   // counts down
  total: number;      // original duration (needed to compute elapsed)
  peak: number;
  attack: number;     // small fade-in
  decay: number;      // small fade-out
};

export type WordTiming = { word: string; phoneme: string; start: number; end: number };

// lipsync clock + queues

export const audioCtxRef = { current: null as AudioContext | null };
export const t0Ref       = { current: null as number | null };
export const outputLatencySec = 0;

export const segStateRef = { current: { segOffset: 0, lastAbsEnd: 0 } };
export const wordQueueRef = { current: [] as WordTiming[] };
export const pendingEventsRef = { current: [] as VisemeEvent[] };
export const activeEnvelopesRef = { current: [] as ActiveEnv[] };
export const seenEventsRef = { current: new Set<string>() };



