import * as THREE from "three";
import { useEffect, useMemo, useRef, useCallback } from "react";

type LoopKind = "once" | "repeat";

export type AvatarStateConfig = {
  clip: string;              // name in `actions`
  priority: number;          // larger wins
  loop?: LoopKind;           // default: "once" for gestures, "repeat" for idles/talking
  speed?: number;            // 1 = normal
  fadeIn?: number;           // seconds
  fadeOut?: number;          // seconds
  keepLastFrame?: boolean;   // clamp when finished (for once)
  idleUnderlay?: number;     // override global idle underlay while this state is on
  retriggerWhileHeld?: boolean; // if activeFlags[state] stays true, should "once" retrigger on finish?
};

type Options = {
  actions?: Record<string, THREE.AnimationAction | undefined>;

  // Core
  idleClip?: string;         // default "Idle"
  states?: Record<string, AvatarStateConfig>;
  activeFlags?: Record<string, boolean>; // e.g., { Thinking: isThinking, Speaking: isSpeaking }

  // Defaults
  defaultFade?: number;      // default crossfade seconds (both directions)
  idleUnderlay?: number;     // default Idle weight while a foreground state is active
};

export function useAvatarAnimator({
  actions,
  idleClip = "Idle",
  states = {},
  activeFlags = {},
  defaultFade = 0.3,
  idleUnderlay = 0.25,
}: Options) {
  const mixerRef  = useRef<THREE.AnimationMixer | null>(null);
  const idleRef   = useRef<THREE.AnimationAction | null>(null);
  const currentRef= useRef<{ name: string | null; action: THREE.AnimationAction | null }>({ name: null, action: null });

  // tween token per action to prevent cross-cancellation
  const tweenTokens = useRef<WeakMap<THREE.AnimationAction, number>>(new WeakMap());
  const rafRef      = useRef<number>(0);
  const runIdRef    = useRef<number>(0);

  const resolvedStates = useMemo(() => {
    // normalize with defaults
    const out: Record<string, Required<AvatarStateConfig>> = {};
    for (const [name, cfg] of Object.entries(states)) {
      out[name] = {
        clip: cfg.clip,
        priority: cfg.priority,
        loop: cfg.loop ?? "once",
        speed: cfg.speed ?? 1,
        fadeIn: cfg.fadeIn ?? defaultFade,
        fadeOut: cfg.fadeOut ?? defaultFade,
        keepLastFrame: cfg.keepLastFrame ?? (cfg.loop ?? "once") === "once",
        idleUnderlay: cfg.idleUnderlay ?? idleUnderlay,
        retriggerWhileHeld: cfg.retriggerWhileHeld ?? false, 
      };
    }
    return out;
  }, [states, defaultFade, idleUnderlay]);

  const ensureAction = useCallback((clip?: string | null) => {
    if (!clip || !actions) return null;
    const a = actions[clip];
    if (!a) return null;
    if (!mixerRef.current) mixerRef.current = a.getMixer();
    a.enabled = true;
    a.setEffectiveWeight(a.getEffectiveWeight() || 0);
    a.setEffectiveTimeScale(a.getEffectiveTimeScale() || 1);
    return a;
  },[actions]);

  const tweenWeight = useCallback((
    act: THREE.AnimationAction | null | undefined,
    target: number,
    secs: number,
    onDone?: () => void
  ) => {
    if (!act) return;
    const tokens = tweenTokens.current;
    const myTok = (tokens.get(act) ?? 0) + 1;
    tokens.set(act, myTok);

    const t0 = performance.now();
    const from = act.getEffectiveWeight();
    const to = Math.max(0, Math.min(1, target));
    const dur = Math.max(0.01, secs) * 1000;

    const step = (now: number) => {
      if ((tokens.get(act) ?? 0) !== myTok) return; // superseded
      const u = Math.min(1, (now - t0) / dur);
      const k = u * u * (3 - 2 * u); // smoothstep
      act.setEffectiveWeight(from + (to - from) * k);
      if (u < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  },[]);

  const playLoopMode = useCallback((act: THREE.AnimationAction, loop: LoopKind, keepLast: boolean) => {
    act.reset();
    if (loop === "once") {
      act.setLoop(THREE.LoopOnce, 0);
      act.clampWhenFinished = !!keepLast;
    } else {
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.clampWhenFinished = false;
    }
    if (!act.isRunning()) act.play();
  },[]);

  const settleIdleHard = useCallback(() => {
    const idle = idleRef.current;
    if (!idle) return;
    idle.enabled = true;
    idle.setEffectiveTimeScale(1);
    idle.setEffectiveWeight(1);
    if (!idle.isRunning()) idle.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    // reinforce next frame against float rounding
    requestAnimationFrame(() => idle.setEffectiveWeight(1));
  },[]);

  // Initialize Idle and mixer
  useEffect(() => {
    if (!actions) return;
    const idle = ensureAction(idleClip);
    idleRef.current = idle;
    mixerRef.current = idle?.getMixer() ?? mixerRef.current;
    if (idle) {
      idle.setEffectiveWeight(1);
      idle.setEffectiveTimeScale(1);
      if (!idle.isRunning()) idle.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [actions, idleClip, ensureAction]);

  // Select highest-priority active state (or null for Idle)
  const pickTopState = useCallback(() => {
    let winner: { name: string; cfg: Required<AvatarStateConfig> } | null = null;
    for (const [name, on] of Object.entries(activeFlags)) {
      if (!on) continue;
      const cfg = resolvedStates[name];
      if (!cfg) continue;
      if (!winner || cfg.priority > winner.cfg.priority) {
        winner = { name, cfg };
      }
    }
    return winner;
  },[activeFlags, resolvedStates]);

  const startState = useCallback((name: string, cfg: Required<AvatarStateConfig>) => {
    const action = ensureAction(cfg.clip);
    if (!action) return { action: null };

    action.enabled = true;
    action.setEffectiveTimeScale(cfg.speed);
    action.setEffectiveWeight(0);
    playLoopMode(action, cfg.loop, cfg.keepLastFrame);

    // Dim idle to underlay while this state is foreground
    const idle = idleRef.current;
    if (idle) tweenWeight(idle, cfg.idleUnderlay, cfg.fadeIn);

    tweenWeight(action, 1, cfg.fadeIn);
    currentRef.current = { name, action };
    return { action };
  },[ensureAction, tweenWeight, playLoopMode]);

  const stopState = useCallback((
    prev: THREE.AnimationAction | null | undefined,
    fadeOut: number,
    onAfter?: () => void
  ) => {
    if (!prev) {
      onAfter?.();
      return;
    }
    tweenWeight(prev, 0, fadeOut, () => {
      if (prev.isRunning()) prev.stop();
      prev.enabled = false;
      onAfter?.();
    });
  }, [tweenWeight]);
  // put this near your other refs
  const cleanupRef = useRef<(() => void) | null>(null);

  // helpful event type for three.js "finished"
  type FinishedEvent = THREE.Event & {
    type: 'finished';
    action: THREE.AnimationAction;
  };

  const transitionTo = useCallback(
    (next: { name: string; cfg: Required<AvatarStateConfig> } | null) => {
      const runId = ++runIdRef.current;

      const prevName = currentRef.current.name;
      const prevAct  = currentRef.current.action;

      if (!next) {
        // Fade back to Idle only
        const idle = idleRef.current;
        stopState(prevAct, defaultFade, () => {
          if (runId !== runIdRef.current) return;
        });
        if (idle) tweenWeight(idle, 1, defaultFade, settleIdleHard);
        currentRef.current = { name: null, action: null };
        return;
      }

      // If already on same state, do nothing
      if (prevName === next.name) return;

      // Start next
      const { action: nextAct } = startState(next.name, next.cfg);

      // Fade out previous foreground
      stopState(prevAct, next.cfg.fadeOut);

      const mixer = mixerRef.current;
      if (!mixer || !nextAct) return;

      // remove any previous listener for a superseded transition
      cleanupRef.current?.();
      cleanupRef.current = null;

      const onFinished = (e: FinishedEvent) => {
        if (runId !== runIdRef.current) return;
        if (e.action !== nextAct) return;

        const stillHeld = !!activeFlags[next.name];
        if (next.cfg.loop === 'once' && next.cfg.retriggerWhileHeld && stillHeld) {
          nextAct.reset().play(); // retrigger without changing fades
          return;
        }

        const winner = pickTopState();
        if (!winner) {
          const idle = idleRef.current;
          tweenWeight(nextAct, 0, next.cfg.fadeOut, () => {
            if (nextAct.isRunning()) nextAct.stop();
            nextAct.enabled = false;
          });
          if (idle) tweenWeight(idle, 1, next.cfg.fadeOut, settleIdleHard);
          currentRef.current = { name: null, action: null };
        } else {
          transitionTo(winner);
        }
      };

      mixer.addEventListener('finished', onFinished);
      cleanupRef.current = () => mixer.removeEventListener('finished', onFinished);
    },
    [
      activeFlags,
      defaultFade,
      mixerRef,
      startState,
      stopState,
      tweenWeight,
      settleIdleHard,
      pickTopState,
    ]
  );

  // Drive transitions when flags/config change
  useEffect(() => {
    const winner = pickTopState();
    transitionTo(winner ?? null);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [activeFlags, resolvedStates, pickTopState, transitionTo]);

  // Safety: if a consumer forcibly disables the current action externally,
  // re-settle to Idle to avoid being stuck with Idle dimmed.
  useEffect(() => {
    const tick = () => {
      const cur = currentRef.current.action;
      if (cur && !cur.enabled) {
        currentRef.current = { name: null, action: null };
        settleIdleHard();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
