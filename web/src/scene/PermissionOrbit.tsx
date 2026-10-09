import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbitNodeData {
  name: string;
  angle: number;
  radius: number;
  speed: number;
  yOffset: number;
  tiltAngle: number;
  color: string;
}

const NODES_CONFIG: OrbitNodeData[] = [
  { name: 'Camera', angle: 0, radius: 3.2, speed: 0.18, yOffset: 0.4, tiltAngle: 0.2, color: '#06b6d4' },
  { name: 'Microphone', angle: (Math.PI * 1) / 3, radius: 3.5, speed: 0.22, yOffset: -0.5, tiltAngle: -0.15, color: '#8b5cf6' },
  { name: 'Location', angle: (Math.PI * 2) / 3, radius: 3.1, speed: 0.16, yOffset: 0.7, tiltAngle: 0.3, color: '#f59e0b' },
  { name: 'Contacts', angle: Math.PI, radius: 3.4, speed: 0.19, yOffset: -0.3, tiltAngle: -0.2, color: '#3b82f6' },
  { name: 'Storage', angle: (Math.PI * 4) / 3, radius: 3.3, speed: 0.17, yOffset: 0.5, tiltAngle: 0.25, color: '#10b981' },
  { name: 'SMS', angle: (Math.PI * 5) / 3, radius: 3.6, speed: 0.21, yOffset: -0.6, tiltAngle: -0.1, color: '#ec4899' },
];

export const PermissionOrbit: React.FC<{ isAuditing?: boolean }> = ({ isAuditing = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const speedMult = isAuditing ? 2.5 : 1.0;

    NODES_CONFIG.forEach((cfg, idx) => {
      const node = nodeRefs.current[idx];
      if (node) {
        const currentAngle = cfg.angle + (time * cfg.speed * speedMult);
        const x = Math.cos(currentAngle) * cfg.radius;
        const z = Math.sin(currentAngle) * (cfg.radius * 0.75); // slight elliptical squish
        const y = cfg.yOffset + Math.sin(time * 1.5 + idx) * 0.25;

        node.position.set(x, y, z);
        node.rotation.y = -currentAngle + Math.PI / 2;
        node.rotation.x = Math.sin(time + idx) * 0.15;
      }
    });

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.05 * speedMult;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Subtle orbital path guide line */}
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[3.3, 0.008, 16, 100]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.12} />
      </mesh>

      {NODES_CONFIG.map((cfg, idx) => (
        <group
          key={cfg.name}
          ref={(el) => {
            nodeRefs.current[idx] = el;
          }}
        >
          {/* Glass Disc */}
          <mesh>
            <cylinderGeometry args={[0.34, 0.34, 0.06, 28]} />
            <meshPhysicalMaterial
              color="#0f172a"
              emissive={cfg.color}
              emissiveIntensity={0.35}
              roughness={0.2}
              transmission={0.8}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Glowing Outer Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.02, 16, 32]} />
            <meshStandardMaterial
              color={cfg.color}
              emissive={cfg.color}
              emissiveIntensity={1.2}
            />
          </mesh>

          {/* Internal floating indicator gem */}
          <mesh position={[0, 0, 0.04]}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial
              color={cfg.color}
              emissive={cfg.color}
              emissiveIntensity={1.8}
              roughness={0.1}
            />
          </mesh>

          {/* Mini local light for each orb */}
          <pointLight color={cfg.color} intensity={0.5} distance={1.5} />
        </group>
      ))}
    </group>
  );
};
