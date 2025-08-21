import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar } from "@/components/aura/avatarFeature/avatar"; // adjust path as needed
import type { AvatarMessage } from "@/types/avatar"

interface Props {
  message: AvatarMessage | null;
}

export function RotatableAvatar({ message }: Props) {
  const avatarRef = useRef<THREE.Group>(null!);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const startX = useRef(0);
  const url = "/models/68937656275d5cb37247aceb.glb"; // replace with your avatar model URL
  // Handle rotation and dragging
  useFrame(() => {
    if (!avatarRef.current) return;

    if (!isDragging) {
      // Smooth return to center
      avatarRef.current.rotation.y += (-avatarRef.current.rotation.y) * 0.1;
    } else {
      avatarRef.current.rotation.y = rotation;
    }
  });

  // Handle pointer events for dragging
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      setIsDragging(true);
      startX.current = e.clientX;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX.current;
      setRotation(deltaX * 0.005); // adjust sensitivity if needed
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  return (
    <Avatar
      avatarUrl={url}
      message={message}
      groupRef={avatarRef}
    />
  );

}
