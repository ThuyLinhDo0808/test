import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { lerpMorphTarget } from '@/utils/lerpMorphTarget';
import * as THREE from 'three';

interface BlinkWinkController {
    blink: boolean;
    winkLeft: boolean;
    winkRight: boolean;
    setWinkLeft: React.Dispatch<React.SetStateAction<boolean>>;
    setWinkRight: React.Dispatch<React.SetStateAction<boolean>>;
}

interface BlinkWinkControllerProps {
    scene: THREE.Object3D;
}

export function useBlinkWinkController(scene: BlinkWinkControllerProps['scene']): BlinkWinkController {
    const [blink, setBlink] = useState<boolean>(false);
    const [winkLeft, setWinkLeft] = useState<boolean>(false);
    const [winkRight, setWinkRight] = useState<boolean>(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const scheduleBlink = () => {
            timeout = setTimeout(() => {
                setBlink(true);
                setTimeout(() => {
                    setBlink(false);
                    scheduleBlink();
                }, 200);
            }, Math.random() * 4000 + 1000);
        };
        scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    useFrame(() => {
        scene.traverse((child: THREE.Object3D) => {
            // @ts-expect-error: Custom properties on child
            if (!child.isSkinnedMesh || !child.morphTargetDictionary) return;
            // @ts-expect-error: Custom morph target function
            lerpMorphTarget(child, 'eyeBlinkLeft', blink || winkLeft ? 1 : 0, 0.5);
            // @ts-expect-error: Custom morph target function
            lerpMorphTarget(child, 'eyeBlinkRight', blink || winkRight ? 1 : 0, 0.5);
        });
    });

    return { blink, winkLeft, winkRight, setWinkLeft, setWinkRight };
}
