import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
  mode: 'home' | 'auditing' | 'report';
  isModalOpen?: boolean;
}

export const CameraRig: React.FC<CameraRigProps> = ({ mode, isModalOpen = false }) => {
  const { camera, pointer } = useThree();
  const targetPos = React.useRef(new THREE.Vector3(0, 0, 7.5));
  const lookTarget = React.useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    // Choreograph based on state
    if (isModalOpen) {
      // Pull back when install modal is active
      targetPos.current.set(0, 0, 9.5);
      lookTarget.current.set(0, 0, 0);
    } else if (mode === 'auditing') {
      // Camera pushes in close as shield core accelerates and pulses
      targetPos.current.set(0, 0, 5.4);
      lookTarget.current.set(0, 0.1, 0);
    } else if (mode === 'report') {
      // Report mode: camera frames the 3D core & ring
      targetPos.current.set(0, 0.2, 7.8);
      lookTarget.current.set(0, 0, 0);
    } else {
      // Home mode: standard cinematic framing
      targetPos.current.set(0, 0, 7.2);
      lookTarget.current.set(0, 0, 0);
    }

    // Parallax mouse offset (subtle, smooth)
    const parallaxX = pointer.x * 0.45;
    const parallaxY = pointer.y * 0.35;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x + parallaxX, 3.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y + parallaxY, 3.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, 3.5, delta);

    camera.lookAt(lookTarget.current);
  });

  return null;
};
