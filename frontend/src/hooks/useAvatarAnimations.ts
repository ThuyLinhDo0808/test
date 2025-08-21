import { useAnimations, useGLTF } from '@react-three/drei';
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
}
