<<<<<<< HEAD
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { facialExpressions } from '@/utils/facialExpressions';
import { lerpMorphTarget } from '@/utils/lerpMorphTarget';

type Morphable = THREE.Mesh & {
  morphTargetInfluences: number[];
  morphTargetDictionary: Record<string, number>;
};

// Runtime type guard (no `any`)
function isMorphable(o: THREE.Object3D): o is Morphable {
  if (!(o instanceof THREE.Mesh)) return false;
  const inf  = (o as { morphTargetInfluences?: unknown }).morphTargetInfluences;
  const dict = (o as { morphTargetDictionary?: unknown }).morphTargetDictionary;
  return Array.isArray(inf) && typeof dict === "object" && dict !== null;
}

type Opts = {
  minIntervalSec?: number;   // random wait before each activation
  maxIntervalSec?: number;
  durationSec?: number;      // full in+out duration
  strength?: number;         // overall intensity 0..1
};

export function useOccasionalExpressionSimple(
  scene: THREE.Object3D,
  expression: keyof typeof facialExpressions,
  {
    minIntervalSec = 3,
    maxIntervalSec = 7,
    durationSec = 0.9,
    strength = 1,
  }: Opts = {}
) {
  const meshesRef = useRef<Morphable[]>([]);
  const keysRef = useRef<string[]>([]);
  const activeRef = useRef(false);
  const tRef = useRef(0);
  const nextAtRef = useRef(0);

  // Cache meshes and morph keys once
  useEffect(() => {
    const meshes: Morphable[] = [];
    scene.traverse((obj) => {
      if (isMorphable(obj)) meshes.push(obj);
    });
    meshesRef.current = meshes;

    const map = facialExpressions[expression] ?? {};
    keysRef.current = Object.keys(map);

    const jitter =
      minIntervalSec + Math.random() * (maxIntervalSec - minIntervalSec);
    nextAtRef.current = performance.now() + jitter * 1000;
  }, [scene, expression, minIntervalSec, maxIntervalSec]);

  useFrame((_, delta) => {
    const targets = facialExpressions[expression] ?? {};
    const meshes = meshesRef.current;
    const rate = Math.min(1, delta * 16); // simple FPS-stable damping

    // Start a new pulse when it's time
    if (!activeRef.current && performance.now() >= nextAtRef.current) {
      activeRef.current = true;
      tRef.current = 0;
    }

    if (activeRef.current) {
      tRef.current += delta;
      const u = Math.min(1, tRef.current / Math.max(0.001, durationSec));
      // triangle shape 0→1→0
      const alpha = 1 - Math.abs(1 - 2 * u);

      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary;
        for (const key of keysRef.current) {
          if (dict[key] === undefined) continue;
          const target = (targets[key] ?? 0) * strength * alpha;
          lerpMorphTarget(mesh, key, target, rate);
        }
      }

      if (u >= 1) {
        activeRef.current = false;
        const jitter = minIntervalSec + Math.random() * (maxIntervalSec - minIntervalSec);
        nextAtRef.current = performance.now() + jitter * 1000;
      }
    } else {
      // relax controlled keys to 0 while idle
      for (const mesh of meshes) {
        const dict = mesh.morphTargetDictionary;
        for (const key of keysRef.current) {
          if (dict[key] === undefined) continue;
          lerpMorphTarget(mesh, key, 0, rate);
        }
      }
    }
  });
}
=======
import { useFrame } from '@react-three/fiber';
import { facialExpressions, FacialExpressionMap } from '@/utils/facialExpressions';
import { lerpMorphTarget } from '@/utils/lerpMorphTarget';
import * as THREE from 'three';

interface MorphMesh extends THREE.Mesh {
  morphTargetInfluences: number[];
  morphTargetDictionary: { [key: string]: number };
  isSkinnedMesh?: boolean;
}

export function useFacialExpressionControl(
  scene: THREE.Object3D,
  expression: keyof FacialExpressionMap
) {
    useFrame(
        () => {
            scene.traverse(
                (child) => {
                    if (
                        (child as MorphMesh).isSkinnedMesh &&
                        (child as MorphMesh).morphTargetDictionary
                    ) {
                        const mesh = child as MorphMesh;
                        const targets = facialExpressions[expression] || {};

                    Object.keys(mesh.morphTargetDictionary!).forEach((key) => {
                        const targetValue = targets[key] ?? 0;
                        lerpMorphTarget(mesh, key, targetValue, 0.1);
                    });
                }
            });
        }
    );
}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
