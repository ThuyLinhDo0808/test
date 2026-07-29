import { useGLTF } from '@react-three/drei';
import { useGraph } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';
import { useMemo } from 'react';
import { Object3D, SkinnedMesh } from 'three';
import { GLTFResult } from '@/types/GLTFtypes';

export function useAvatarLoader(url: string) {
  const { scene, materials } = useGLTF(url);
  // critical for skinned avatars
  const clone = useMemo(() => SkeletonUtils.clone(scene) as Object3D, [scene]);
  // Indexes the cloned scene into nodes and materials 
  // so we can grab parts by name
  const { nodes } = useGraph(clone);

  const skinnedMeshes = Object.values(nodes).filter(
    (node): node is SkinnedMesh => node instanceof SkinnedMesh
  );

  const morphTargets = skinnedMeshes.filter(
    (mesh) => Array.isArray(mesh.morphTargetInfluences)
  );

  return {
    scene: clone,
    nodes: nodes as GLTFResult['nodes'],
    materials: materials as GLTFResult['materials'],
    skinnedMeshes,
    morphTargets, // These are the skinned meshes that actually have blendshapes
    eyes: {
      left: nodes.EyeLeft as SkinnedMesh,
      right: nodes.EyeRight as SkinnedMesh,
    },
    head: nodes.Wolf3D_Head as SkinnedMesh,
    teeth: nodes.Wolf3D_Teeth as SkinnedMesh,
  };
}

