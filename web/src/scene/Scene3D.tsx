import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ShieldCore } from './ShieldCore';
import { PermissionOrbit } from './PermissionOrbit';
import { CameraRig } from './CameraRig';
import { shouldEnable3D } from '../lib/device';
import * as THREE from 'three';

interface Scene3DProps {
  mode?: 'home' | 'auditing' | 'report';
  score?: number;
  riskColor?: string;
  isModalOpen?: boolean;
}

// Deterministic Star/Particle field positions
const COUNT = 120;
const STAR_POSITIONS = (() => {
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // Deterministic pseudo-random distribution
    const s1 = Math.sin((i + 1) * 12.9898) * 43758.5453;
    const s2 = Math.sin((i + 2) * 78.233) * 43758.5453;
    const s3 = Math.sin((i + 3) * 45.164) * 43758.5453;
    pos[i * 3] = ((s1 - Math.floor(s1)) - 0.5) * 25;
    pos[i * 3 + 1] = ((s2 - Math.floor(s2)) - 0.5) * 20;
    pos[i * 3 + 2] = ((s3 - Math.floor(s3)) - 0.5) * 15 - 2;
  }
  return pos;
})();

const StarField: React.FC = () => {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[STAR_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#38bdf8"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('Canvas 3D WebGL fallback caught error:', err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const Scene3D: React.FC<Scene3DProps> = ({
  mode = 'home',
  score = 0,
  riskColor = '#06b6d4',
  isModalOpen = false,
}) => {
  const [canRender3D, setCanRender3D] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return shouldEnable3D();
  });

  useEffect(() => {
    const handleResize = () => {
      setCanRender3D(shouldEnable3D());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ambientFallback = (
    <div 
      className="fixed inset-0 pointer-events-none -z-10 bg-radial from-[#08182b] via-[#050b16] to-[#030712] opacity-90 transition-opacity duration-700" 
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(6,182,212,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.08),transparent_50%)]" />
    </div>
  );

  // Gradient Fallback for Reduced-Motion, Mobile, or unsupported WebGL
  if (!canRender3D) {
    return ambientFallback;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" 
      aria-hidden="true"
    >
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-radial from-[#0b1528] via-[#060b17] to-[#030712] opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(6,182,212,0.15),transparent_60%)]" />

      <CanvasErrorBoundary fallback={ambientFallback}>
        <Suspense fallback={
          <div className="absolute inset-0 bg-radial from-[#08182b] via-[#050b16] to-[#030712]" />
        }>
          <Canvas
            dpr={[1, 2]} // Cap DPR at 2 for performance
            camera={{ position: [0, 0, 7.5], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            {/* Ambient & directional lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 6, 4]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-4, -3, 2]} intensity={0.8} color="#8b5cf6" />
            <pointLight position={[4, -2, 2]} intensity={0.8} color="#06b6d4" />

            {/* Camera movement and parallax */}
            <CameraRig mode={mode} isModalOpen={isModalOpen} />

            {/* Drifting star dust */}
            <StarField />

            {/* Orbiting translucent permission badges */}
            <PermissionOrbit isAuditing={mode === 'auditing'} />

            {/* 3D Wireframe + Glass Shield Core & Score Ring */}
            <ShieldCore
              isAuditing={mode === 'auditing'}
              isReport={mode === 'report'}
              score={score}
              riskColor={riskColor}
            />
          </Canvas>
        </Suspense>
      </CanvasErrorBoundary>
    </div>
  );
};
