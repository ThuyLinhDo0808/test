import { useAnimations, useGLTF } from '@react-three/drei';
<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
import { LoopRepeat, AnimationAction } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from "three";
import type { GLTF } from 'three-stdlib';

export type ActionsMap = Record<string, AnimationAction>;

export function useAvatarAnimations<T extends THREE.Object3D>(
  group: T | React.RefObject<T>,
  animationsUrl: string,
  defaultAnim = 'Idle'
) {
  const gltf = useGLTF(animationsUrl) as unknown as GLTF;
  const root = group as unknown as THREE.Object3D | React.RefObject<THREE.Object3D>;
  const { actions, mixer } = useAnimations(gltf.animations, root);
  const [current, setCurrent] = useState(defaultAnim);
  const prev = useRef<AnimationAction | null>(null);

  useFrame((_, dt) => mixer?.update(dt));

  const play = (name: string, fade = 0.3) => {
    if (!actions) return;
    const next = actions[name];
    if (!next) return;

    if (prev.current && prev.current !== next) prev.current.fadeOut(fade);
    next.reset().fadeIn(fade).setLoop(LoopRepeat, Infinity).play();
    prev.current = next;
    setCurrent(name);
  };

  useEffect(() => () => {
    if (!actions) return;
    Object.values(actions).forEach(a => a?.stop());
  }, [actions]);

  return { 
    actions: actions as ActionsMap | undefined, 
    mixer, 
    current, 
    play };
=======
import { useEffect, useState } from 'react';
import { Group } from 'three';
import { AnimationAction, AnimationMixer } from 'three';
import { GLTF } from 'three-stdlib';

interface UseAvatarAnimationsResult {
    animation: string;
    setAnimation: React.Dispatch<React.SetStateAction<string>>;
    actions: Record<string, AnimationAction | null> | undefined;
    mixer: AnimationMixer | undefined;
}

// export function useAvatarAnimations(group: Group | React.RefObject<Group | null> | undefined): UseAvatarAnimationsResult {
//     const { animations }: GLTF = useGLTF('/models/animations.glb') as GLTF;
//     const { actions, mixer } = useAnimations(animations, group);
//     const [animation, setAnimation] = useState<string>('Idle');

//     useEffect(() => {
//         const action = actions?.[animation];
//         if (!action) return;

//         action.reset().fadeIn(0.5).play();

//         return () => {
//             const cleanupAction = actions?.[animation];
//             if (cleanupAction) cleanupAction.fadeOut(0.5);
//         };
//     }, [animation, actions]);

//     return { animation, setAnimation, actions, mixer };
// }

export function useAvatarAnimations(
  group: Group | React.RefObject<Group | null> | undefined,
  animationUrl: string,
  defaultAnim: string = 'Idle'
): UseAvatarAnimationsResult {
  const { animations }: GLTF = useGLTF(animationUrl) as GLTF;
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState<string>(defaultAnim);

  useEffect(() => {
    const action = actions?.[animation];
    if (!action) return;

    action.reset().fadeIn(0.5).play();

    return () => {
      const cleanup = actions?.[animation];
      if (cleanup) cleanup.fadeOut(0.5);
    };
  }, [animation, actions]);

  return { animation, setAnimation, actions, mixer };
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}
