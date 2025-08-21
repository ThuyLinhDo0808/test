import * as THREE from 'three';

export function lerpMorphTarget(
  mesh: THREE.Mesh,
  target: string,
  value: number,
  speed: number
): void {
  const index = mesh.morphTargetDictionary?.[target];
  if (index !== undefined && mesh.morphTargetInfluences) {
    mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
      mesh.morphTargetInfluences[index],
      value,
      speed
    );
  }
}
