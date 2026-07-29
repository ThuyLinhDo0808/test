// import { useFrame } from '@react-three/fiber';
// import { useState } from 'react';
// import { corresponding } from './constantsLipsync';
// import { lerpMorphTarget } from '@/utils/lerpMorphTarget';
// import * as THREE from 'three';

// interface MouthCue {
//     start: number;
//     end: number;
//     value: string;
// }

// interface LipsyncData {
//     mouthCues: MouthCue[];
// }

// interface UseLipsyncControllerReturn {
//     setLipsyncData: (data: LipsyncData, audioElem: HTMLAudioElement) => void;
// }

// export function useLipsyncController(scene: THREE.Object3D): UseLipsyncControllerReturn {
//     const [lipsync, setLipsync] = useState<LipsyncData | null>(null);
//     const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

//     useFrame(() => {
//         if (!lipsync || !audio) return;

//         const currentTime = audio.currentTime;
//         let activeCue: MouthCue | null = null;

//         for (const cue of lipsync.mouthCues) {
//             if (currentTime >= cue.start && currentTime <= cue.end) {
//                 activeCue = cue;
//                 break;
//             }
//         }
//         scene.traverse((child) => {
//             if (
//                 child instanceof THREE.SkinnedMesh &&
//                 child.morphTargetDictionary &&
//                 child.morphTargetInfluences
//             ) {
//                 Object.values(corresponding).forEach((target) => {
//                 const isActive =
//                     activeCue &&
//                     activeCue.value in corresponding &&
//                     corresponding[activeCue.value as keyof typeof corresponding] === target;
//                 lerpMorphTarget(child, target, isActive ? 1 : 0, isActive ? 0.2 : 0.1);
//                 });
//             }
//             });

//     });

//     return {
//         setLipsyncData: (data: LipsyncData, audioElem: HTMLAudioElement) => {
//             setLipsync(data);
//             setAudio(audioElem);
//         },
//     };
// }
