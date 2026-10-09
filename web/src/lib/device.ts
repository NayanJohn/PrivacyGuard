/**
 * Device, Browser, and Accessibility Detection Utilities
 */

export type PlatformType = 'android' | 'ios' | 'desktop';

export function getPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'desktop';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMobileScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Returns whether the high-fidelity 3D scene should be rendered.
 * Degrades to static or lightweight CSS gradient when:
 * 1. prefers-reduced-motion is enabled
 * 2. WebGL is unavailable or fails
 * 3. Screen width is below mobile threshold (< 768px)
 */
export function shouldEnable3D(): boolean {
  if (prefersReducedMotion()) return false;
  if (isMobileScreen()) return false;
  return isWebGLAvailable();
}
