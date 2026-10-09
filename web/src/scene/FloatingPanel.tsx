import React, { useRef, useState, useEffect, useCallback } from 'react';
import { prefersReducedMotion, isMobileScreen } from '../lib/device';

interface FloatingPanelProps {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  children,
  className = '',
  enableTilt = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMotionReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return prefersReducedMotion() || isMobileScreen();
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enableTilt || isMotionReduced || !panelRef.current) return;

    const rect = panelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate normalized offset [-1, 1]
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    // Max 6 degrees tilt
    const maxDeg = 6.0;
    const rotateY = Math.max(-maxDeg, Math.min(maxDeg, normX * maxDeg));
    const rotateX = Math.max(-maxDeg, Math.min(maxDeg, -normY * maxDeg));

    setTransform(`perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`);
  }, [enableTilt, isMotionReduced]);

  const handleMouseLeave = useCallback(() => {
    if (isMotionReduced) return;
    setIsHovered(false);
    setTransform('perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  }, [isMotionReduced]);

  const handleMouseEnter = useCallback(() => {
    if (isMotionReduced) return;
    setIsHovered(true);
  }, [isMotionReduced]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || isMotionReduced) return;

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, isMotionReduced]);

  return (
    <div
      ref={panelRef}
      style={{
        transform: isMotionReduced ? 'none' : transform,
        transition: isHovered ? 'transform 0.12s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        transformStyle: 'preserve-3d',
      }}
      className={`relative rounded-3xl glass-panel p-6 sm:p-8 md:p-10 border border-cyan-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_35px_rgba(6,182,212,0.12)] transition-shadow duration-300 ${className}`}
    >
      {/* Subtle edge top light highlight */}
      <div 
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-40 bg-gradient-to-b from-cyan-400/30 via-transparent to-violet-500/10" 
        aria-hidden="true" 
      />
      {children}
    </div>
  );
};
