import React from 'react';
import { Group } from 'three';
import { GLTFResult } from '@/types/GLTFtypes';
<<<<<<< HEAD
import type { SkinnedMesh } from 'three';
=======
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

interface AvatarRendererProps {
  group: React.RefObject<Group | null>;
  nodes: GLTFResult['nodes'];
  materials: GLTFResult['materials'];
}

export function AvatarRenderer({ group, nodes, materials }: AvatarRendererProps) {
  return (
    <group dispose={null} ref={group} position={[0, -1.4, 0.1]}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
<<<<<<< HEAD
        skeleton={(nodes.EyeLeft as SkinnedMesh).skeleton}
=======
        skeleton={nodes.EyeLeft.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
<<<<<<< HEAD
        skeleton={(nodes.EyeRight as SkinnedMesh).skeleton}
=======
        skeleton={nodes.EyeRight.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
<<<<<<< HEAD
        skeleton={(nodes.Wolf3D_Head as SkinnedMesh).skeleton}
=======
        skeleton={nodes.Wolf3D_Head.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
<<<<<<< HEAD
        skeleton={(nodes.Wolf3D_Teeth as SkinnedMesh).skeleton}
=======
        skeleton={nodes.Wolf3D_Teeth.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
<<<<<<< HEAD
        geometry={(nodes.Wolf3D_Hair as SkinnedMesh).geometry}
        material={materials.Wolf3D_Hair}
        skeleton={(nodes.Wolf3D_Hair as SkinnedMesh).skeleton}
=======
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
<<<<<<< HEAD
        skeleton={(nodes.Wolf3D_Body as SkinnedMesh).skeleton}
      />
      <skinnedMesh
        geometry={(nodes.Wolf3D_Outfit_Bottom as SkinnedMesh).geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={(nodes.Wolf3D_Outfit_Bottom as SkinnedMesh).skeleton}
      />
      <skinnedMesh
        geometry={(nodes.Wolf3D_Outfit_Footwear as SkinnedMesh).geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={(nodes.Wolf3D_Outfit_Footwear as SkinnedMesh).skeleton}
      />
      <skinnedMesh
        geometry={(nodes.Wolf3D_Outfit_Top as SkinnedMesh).geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={(nodes.Wolf3D_Outfit_Top as SkinnedMesh).skeleton}
=======
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      />
    </group>
  )
}
