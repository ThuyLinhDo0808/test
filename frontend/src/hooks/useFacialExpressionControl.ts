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