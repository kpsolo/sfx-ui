import { useEffect, useId, useRef } from 'react';
import { useUnifiedContext } from './UnifiedContext';
import { ShaderPreset } from '../types';

interface UseUnifiedShaderOptions {
  shader?: ShaderPreset | 'custom';
  customFragmentShader?: string;
  uniforms?: Record<string, number | number[]>;
  cornerRadius?: number;
  speed?: number;
  opacity?: number;
  isHovered?: boolean;
  isActive?: boolean;
  mousePos?: [number, number];
  enabled?: boolean;
}

export function useUnifiedShader(
  elementRef: React.RefObject<HTMLElement>,
  options: UseUnifiedShaderOptions
) {
  const { engine, isSupported } = useUnifiedContext();
  const id = useId();
  const isRegisteredRef = useRef(false);

  const {
    shader,
    customFragmentShader,
    uniforms,
    cornerRadius = 8,
    speed = 1.0,
    opacity = 1.0,
    isHovered = false,
    isActive = false,
    mousePos = [0.5, 0.5],
    enabled = true,
  } = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!engine || !el || !shader || !enabled) {
      if (isRegisteredRef.current) {
        engine?.unregister(id);
        isRegisteredRef.current = false;
      }
      return;
    }

    if (!isRegisteredRef.current) {
      engine.register({
        id,
        element: el,
        shader,
        customFragmentShader,
        uniforms,
        cornerRadius,
        speed,
        opacity,
        isHovered,
        isActive,
        mousePos,
      });
      isRegisteredRef.current = true;
    } else {
      engine.update(id, {
        shader,
        customFragmentShader,
        uniforms,
        cornerRadius,
        speed,
        opacity,
        isHovered,
        isActive,
        mousePos,
      });
    }

    return () => {
      if (isRegisteredRef.current) {
        engine.unregister(id);
        isRegisteredRef.current = false;
      }
    };
  }, [
    engine,
    id,
    shader,
    customFragmentShader,
    uniforms,
    cornerRadius,
    speed,
    opacity,
    isHovered,
    isActive,
    mousePos,
    enabled,
    elementRef,
  ]);

  return {
    isUnifiedActive: Boolean(engine && isSupported && shader && enabled),
  };
}
