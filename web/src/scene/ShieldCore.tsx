import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShieldCoreProps {
  isAuditing?: boolean;
  isReport?: boolean;
  score?: number;
  riskColor?: string;
}

export const ShieldCore: React.FC<ShieldCoreProps> = ({
  isAuditing = false,
  isReport = false,
  score = 0,
  riskColor = '#06b6d4',
}) => {
  const outerGroupRef = useRef<THREE.Group>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const scoreRingRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<number>(0);

  // Custom shield shape
  const shieldShape = React.useMemo(() => {
    const s = new THREE.Shape();
    // Symmetric shield outline
    s.moveTo(0, 1.3);
    s.bezierCurveTo(0.9, 1.25, 1.1, 0.6, 1.1, 0.1);
    s.bezierCurveTo(1.1, -0.7, 0.5, -1.2, 0, -1.5);
    s.bezierCurveTo(-0.5, -1.2, -1.1, -0.7, -1.1, 0.1);
    s.bezierCurveTo(-1.1, 0.6, -0.9, 1.25, 0, 1.3);
    return s;
  }, []);

  const extrudeSettings = React.useMemo(() => ({
    depth: 0.35,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  }), []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (outerGroupRef.current) {
      // Base gentle idle float
      outerGroupRef.current.position.y = Math.sin(time * 1.2) * 0.1;
      
      if (isAuditing) {
        // Spins up faster and pulses during audit
        outerGroupRef.current.rotation.y += delta * 2.8;
        pulseRef.current += delta * 5.0;
        const scalePulse = 1.0 + Math.sin(pulseRef.current) * 0.08;
        outerGroupRef.current.scale.set(scalePulse, scalePulse, scalePulse);
      } else {
        outerGroupRef.current.rotation.y = Math.sin(time * 0.4) * 0.25;
        outerGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }

    if (wireframeRef.current) {
      wireframeRef.current.rotation.z = Math.sin(time * 0.8) * 0.05;
    }

    if (scoreRingRef.current && isReport) {
      scoreRingRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <group ref={outerGroupRef} position={[0, 0, 0]}>
      {/* Outer translucent glass shield */}
      <mesh ref={innerCoreRef}>
        <extrudeGeometry args={[shieldShape, extrudeSettings]} />
        <meshPhysicalMaterial
          color={isAuditing ? '#38bdf8' : '#082f49'}
          emissive={isAuditing ? '#06b6d4' : '#0c4a6e'}
          emissiveIntensity={isAuditing ? 0.8 : 0.25}
          roughness={0.15}
          metalness={0.1}
          transmission={0.8}
          transparent
          opacity={0.85}
          ior={1.5}
        />
      </mesh>

      {/* Wireframe geometric cage */}
      <mesh ref={wireframeRef}>
        <extrudeGeometry args={[shieldShape, { ...extrudeSettings, depth: 0.38 }]} />
        <meshStandardMaterial
          wireframe
          color={isAuditing ? '#38bdf8' : '#38bdf8'}
          emissive="#0284c7"
          emissiveIntensity={isAuditing ? 1.2 : 0.4}
        />
      </mesh>

      {/* Internal glowing lock core element */}
      <mesh position={[0, -0.05, 0.2]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#06b6d4"
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>

      {/* Shackle arc for lock icon inside */}
      <mesh position={[0, 0.22, 0.2]}>
        <torusGeometry args={[0.18, 0.045, 16, 24, Math.PI]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#8b5cf6"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* 3D Score Ring around the shield core (Visible in Report mode) */}
      {isReport && (
        <group position={[0, 0, 0]}>
          <mesh ref={scoreRingRef} rotation={[Math.PI / 2.6, 0, 0]}>
            <torusGeometry args={[1.9, 0.055, 24, 64, (Math.PI * 2 * Math.min(score, 100)) / 100]} />
            <meshStandardMaterial
              color={riskColor}
              emissive={riskColor}
              emissiveIntensity={1.4}
              roughness={0.1}
            />
          </mesh>
          {/* Subtle faint background orbit ring */}
          <mesh rotation={[Math.PI / 2.6, 0, 0]}>
            <torusGeometry args={[1.9, 0.015, 16, 64]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Central glow point light */}
      <pointLight
        color={isAuditing ? '#38bdf8' : isReport ? riskColor : '#06b6d4'}
        intensity={isAuditing ? 4.5 : 2.0}
        distance={6}
      />
    </group>
  );
};
