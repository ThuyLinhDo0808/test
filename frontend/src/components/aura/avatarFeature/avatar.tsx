<<<<<<< HEAD
"use client";
import React, { useRef } from 'react';

import { useAvatarAnimations } from '@/hooks/useAvatarAnimations';
import { useOccasionalExpressionSimple } from '@/hooks/useFacialExpressionControl';
import { useAvatarAnimator } from '@/hooks/useAvatarBehavior';
//import { useLipsyncController } from '@/hooks/useLipsyncController';
import { useBlinkWinkController } from '@/hooks/useBlinkWinkController';
import { AvatarRenderer } from './AvatarRenderer';
import * as THREE from 'three';

import { isTTSPlayingRef } from '../hooksChat/useWebsocket'


import { GreetingRef } from '../hooksChat/useEyeTracking';
import { useAvatarLoader } from './AvatarLoader';
interface AvatarProps {
  avatarUrl: string;
  
  groupRef?: React.RefObject<THREE.Group>;
  isThinking: boolean;
=======
import React, { useEffect, useRef } from 'react';

import { useAvatarAnimations } from '@/hooks/useAvatarAnimations';
import { useFacialExpressionControl } from '@/hooks/useFacialExpressionControl';
//import { useLipsyncController } from '@/hooks/useLipsyncController';
import { useBlinkWinkController } from '@/hooks/useBlinkWinkController';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarMessage} from '@/types/avatar';
import * as THREE from 'three';

// import { GLTF } from 'three-stdlib';
import { useAvatarLoader } from './AvatarLoader';
interface AvatarProps {
  avatarUrl: string;
  message: AvatarMessage | null;
  groupRef?: React.RefObject<THREE.Group>;
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
}

import { useAvatarLipSync } from "./AvatarLipSync";

<<<<<<< HEAD
export function Avatar({ avatarUrl, groupRef, isThinking }: AvatarProps) {
  const internalRef = useRef<THREE.Group>(null!);
=======
// interface GLTFWithAnimations extends GLTF {
//   animations: THREE.AnimationClip[];
// }
// export function Avatar({ message, onMessagePlayed }: AvatarProps) {
//   const group = useRef<THREE.Group>(null);
//   const { nodes, materials, scene } = useGLTF('/models/68904821e9fd634bec11abae.glb') as unknown as GLTFResult;
//   const { animations } = useGLTF('/models/animations.glb') as unknown as GLTFWithAnimations;

//   const { actions } = useAnimations(animations, group);
//   const [, setAudio] = useState<HTMLAudioElement | null>(null);

//   const [expression, setExpression] = useState<string>('default');

//   // Hooks
//   useBlinkWinkController(scene);
//   useFacialExpressionControl(scene, expression);
//   const { setLipsyncData } = useLipsyncController(scene);
//   useAvatarAnimations(group);

//   // Message-driven lipsync (AvatarMessage)
//   useEffect(() => {
//     if (!message) return;

//     const audioEl = new Audio(`data:audio/mp3;base64,${message.audio}`);
//     audioEl.play();
//     setAudio(audioEl);
//     setExpression(message.facialExpression);
//     setLipsyncData(message.lipsync, audioEl);

//     const clip = actions?.[message.animation];
//     if (clip) {
//       clip.reset().fadeIn(0.2).play();
//     }

//     audioEl.onended = () => {
//       onMessagePlayed();
//     };
//   }, [message, actions, setLipsyncData, onMessagePlayed]); 


//   return (
//     <AvatarRenderer group={group} nodes={nodes} materials={materials} />
//   );
// }

export function Avatar({ avatarUrl, message, groupRef }: AvatarProps) {
  const internalRef = useRef<THREE.Group | null>(null);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  const group = groupRef ?? internalRef; // Use external ref if provided
  const {
    scene,
    nodes,
<<<<<<< HEAD
    materials
  } = useAvatarLoader(avatarUrl);

  useBlinkWinkController(scene, {
    minIntervalSec: 1.2,
    maxIntervalSec: 4.5,
    blinkDurationSec: 0.16,
  });
  
  useOccasionalExpressionSimple(scene, 'smile');

  // Animation
  const { actions } = useAvatarAnimations(group, '/models/animations.glb', 'Idle');

  useAvatarAnimator({
    actions,                // your AnimationAction map
    idleClip: "Idle",
    idleUnderlay: 0.2,      // global default underlay while any state is active
    defaultFade: 0.3,
    states: {
      Thinking:  { clip: "Thinking",  priority: 80, loop: "once",  fadeIn: 0.25, fadeOut: 0.35, keepLastFrame: true, speed: 0.6 },
      Speaking:  { clip: "Talking_1",   priority: 90, loop: "once", fadeIn: 0.2,  fadeOut: 0.1,  speed: 0.6, },
      Greeting:  { clip: "QuickFormalBow",   priority: 70, loop: "once", fadeIn: 0.2,  fadeOut: 0.4,  speed: 0.6 },
      },
    activeFlags: {
      Thinking: isThinking,
      Speaking: isTTSPlayingRef.current,
      Greeting: GreetingRef.current,
    },
  });

  useAvatarLipSync(nodes);

  // Debug: log morph target names
  // useEffect(() => { 
  //   console.log(nodes.Wolf3D_Head.morphTargetDictionary)
  // }, [])
=======
    materials,
    // morphTargets,
    // eyes,
    // head,
    // teeth,
  } = useAvatarLoader(avatarUrl);

  useBlinkWinkController(scene);
  //useFacialExpressionControl(scene, message?.facialExpression ?? "default");
  //const { setLipsyncData } = useLipsyncController(scene);
  useAvatarAnimations(group,'/models/animations.glb');
  useAvatarLipSync(nodes);

  // useEffect(() => {
  //   if (!message) return;

  //   const audio = new Audio(`data:audio/mp3;base64,${message.audio}`);
  //   audio.play();
  //   setLipsyncData(message.lipsync, audio);
  //   audio.onended = () => onMessagePlayed?.();
  // }, [message]);

  useEffect(() => { 
    console.log(nodes.Wolf3D_Head.morphTargetDictionary)
  }, [])
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

  return (
    <AvatarRenderer
      group={group}
      nodes={nodes}
      materials={materials}
    />
  );
}