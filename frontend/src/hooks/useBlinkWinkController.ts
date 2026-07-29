<<<<<<< HEAD
import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lerpMorphTarget } from '@/utils/lerpMorphTarget';

type Morphable = THREE.Mesh & {
  morphTargetInfluences: number[];
  morphTargetDictionary: Record<string, number>;
};

type BlinkOpts = {
  minIntervalSec?: number;   // random blink interval range
  maxIntervalSec?: number;
  blinkDurationSec?: number; // full close-open cycle time
  winkDurationSec?: number;
  strength?: number;         // 0..1 lid closure
  leftKey?: string;          // morph names
  rightKey?: string;
};

export function useBlinkWinkController(
  scene: THREE.Object3D,
  {
    minIntervalSec = 1.0,
    maxIntervalSec = 4.0,
    blinkDurationSec = 0.16,
    winkDurationSec = 0.18,
    strength = 1,
    leftKey = 'eyeBlinkLeft',
    rightKey = 'eyeBlinkRight',
  }: BlinkOpts = {}
) {
    const meshesRef = useRef<Morphable[]>([]);
    const nextBlinkAtRef = useRef<number>(0);
    const tRef = useRef(0);                  // elapsed time in current action
    const modeRef = useRef<'idle'|'blink'|'winkL'|'winkR'>('idle');
    // Narrow Object3D -> Morphable without `any`
    function isMorphable(o: THREE.Object3D): o is Morphable {
      // prefer runtime checks over `as any`
      if (!(o instanceof THREE.Mesh)) return false;
      const inf = (o as { morphTargetInfluences?: unknown }).morphTargetInfluences;
      const dict = (o as { morphTargetDictionary?: unknown }).morphTargetDictionary;
      return Array.isArray(inf) && typeof dict === "object" && dict !== null;
    }
    // Cache morphable meshes once
    useEffect(() => {
        const list: Morphable[] = [];
        scene.traverse((obj) => {
            if (isMorphable(obj)) list.push(obj);
        });
        meshesRef.current = list;

        const now = performance.now();
        const jitter = minIntervalSec + Math.random() * (maxIntervalSec - minIntervalSec);
        nextBlinkAtRef.current = now + jitter * 1000;
    }, [scene, minIntervalSec, maxIntervalSec]);

    // public triggers
    const blinkNow = useCallback(() => {
        modeRef.current = 'blink';
        tRef.current = 0;
    }, []);
    const winkLeftOnce = useCallback(() => {
        modeRef.current = 'winkL';
        tRef.current = 0;
    }, []);
    const winkRightOnce = useCallback(() => {
        modeRef.current = 'winkR';
        tRef.current = 0;
    }, []);

    // cosine ease 0..1
    const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

    useFrame((_, delta) => {
        const meshes = meshesRef.current;
        if (meshes.length === 0) return;

        // schedule random blink if idle
        if (modeRef.current === 'idle') {
        if (performance.now() >= nextBlinkAtRef.current) {
            modeRef.current = 'blink';
            tRef.current = 0;
        }
       }

        // choose current action
        let dur = blinkDurationSec;
        let closeL = 0, closeR = 0;

        if (modeRef.current === 'blink') {
        dur = blinkDurationSec;
        tRef.current += delta;
        const u = Math.min(1, tRef.current / dur);
        const k = ease(u) * strength;
        closeL = k; closeR = k;
        if (u >= 1) {
            modeRef.current = 'idle';
            tRef.current = 0;
            const jitter = minIntervalSec + Math.random() * (maxIntervalSec - minIntervalSec);
            nextBlinkAtRef.current = performance.now() + jitter * 1000;
        }
        } else if (modeRef.current === 'winkL' || modeRef.current === 'winkR') {
        dur = winkDurationSec;
        tRef.current += delta;
        const u = Math.min(1, tRef.current / dur);
        const k = ease(u) * strength;
        if (modeRef.current === 'winkL') closeL = k; else closeR = k;
        if (u >= 1) {
            modeRef.current = 'idle';
            tRef.current = 0;
        }
        }

        // Apply to meshes with damped lerp. Use a rate scaled by delta for stability.
        const lerpRate = Math.min(1, delta * 18); // ~0.18s time-constant
        for (const mesh of meshes) {
        if (mesh.morphTargetDictionary[leftKey] !== undefined) {
            lerpMorphTarget(mesh, leftKey, closeL, lerpRate);
        }
        if (mesh.morphTargetDictionary[rightKey] !== undefined) {
            lerpMorphTarget(mesh, rightKey, closeR, lerpRate);
        }
        // gently relax to 0 when idle
        if (modeRef.current === 'idle') {
            if (mesh.morphTargetDictionary[leftKey] !== undefined) {
            lerpMorphTarget(mesh, leftKey, 0, lerpRate);
            }
            if (mesh.morphTargetDictionary[rightKey] !== undefined) {
            lerpMorphTarget(mesh, rightKey, 0, lerpRate);
            }
        }
        }
    });

    return { blinkNow, winkLeftOnce, winkRightOnce };
=======
import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { lerpMorphTarget } from '@/utils/lerpMorphTarget';
import * as THREE from 'three';

interface BlinkWinkController {
    blink: boolean;
    winkLeft: boolean;
    winkRight: boolean;
    setWinkLeft: React.Dispatch<React.SetStateAction<boolean>>;
    setWinkRight: React.Dispatch<React.SetStateAction<boolean>>;
}

interface BlinkWinkControllerProps {
    scene: THREE.Object3D;
}

export function useBlinkWinkController(scene: BlinkWinkControllerProps['scene']): BlinkWinkController {
    const [blink, setBlink] = useState<boolean>(false);
    const [winkLeft, setWinkLeft] = useState<boolean>(false);
    const [winkRight, setWinkRight] = useState<boolean>(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const scheduleBlink = () => {
            timeout = setTimeout(() => {
                setBlink(true);
                setTimeout(() => {
                    setBlink(false);
                    scheduleBlink();
                }, 200);
            }, Math.random() * 4000 + 1000);
        };
        scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    useFrame(() => {
        scene.traverse((child: THREE.Object3D) => {
            // @ts-expect-error: Custom properties on child
            if (!child.isSkinnedMesh || !child.morphTargetDictionary) return;
            // @ts-expect-error: Custom morph target function
            lerpMorphTarget(child, 'eyeBlinkLeft', blink || winkLeft ? 1 : 0, 0.5);
            // @ts-expect-error: Custom morph target function
            lerpMorphTarget(child, 'eyeBlinkRight', blink || winkRight ? 1 : 0, 0.5);
        });
    });

    return { blink, winkLeft, winkRight, setWinkLeft, setWinkRight };
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}
