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
}

import { useAvatarLipSync } from "./AvatarLipSync";

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
  const group = groupRef ?? internalRef; // Use external ref if provided
  const {
    scene,
    nodes,
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

  return (
    <AvatarRenderer
      group={group}
      nodes={nodes}
      materials={materials}
    />
  );
}