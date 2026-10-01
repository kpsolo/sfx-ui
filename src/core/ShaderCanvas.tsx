import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ShaderPreset } from './types';
import { SHADER_PRESETS } from '../shaders/presets';
import { ShaderEngine } from './ShaderEngine';
import { useShaderSystem } from './ShaderContext';
import { lerp } from './utils';

export interface ShaderCanvasProps {
  shader?: ShaderPreset | 'custom';
  customFragmentShader?: string;
  uniforms?: Record<string, number | number[]>;
  speed?: number;
  opacity?: number;
  cornerRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  onError?: (err: string | null) => void;
  // External interaction overrides (e.g. parent button hovered)
  isHovered?: boolean;
  isActive?: boolean;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  shader = 'liquid-glass',
  customFragmentShader,
  uniforms = {},
  speed = 1.0,
  opacity = 1.0,
  cornerRadius = 8,
  className = '',
  style,
  onError,
  isHovered: externalHovered,
  isActive: externalActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    tokens,
    shadersEnabled,
    incrementContextCount,
    decrementContextCount,
    primaryVec4,
    secondaryVec4,
    accentVec4,
    bgVec4,
    borderVec4,
  } = useShaderSystem();

  // Internal interaction state
  const mousePosRef = useRef<[number, number]>([0.5, 0.5]);
  const isHoveredRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(false);

  // Lerped uniforms
  const hoverLerpRef = useRef<number>(0.0);
  const activeLerpRef = useRef<number>(0.0);
  const timeRef = useRef<number>(0.0);

  const isVisibleRef = useRef<boolean>(true);
  const [glError, setGlError] = useState<string | null>(null);

  // Sync external hover/active props
  useEffect(() => {
    if (externalHovered !== undefined) {
      isHoveredRef.current = externalHovered;
    }
  }, [externalHovered]);

  useEffect(() => {
    if (externalActive !== undefined) {
      isActiveRef.current = externalActive;
    }
  }, [externalActive]);

  // Determine active fragment shader source
  const fragmentSource = shader === 'custom' && customFragmentShader
    ? customFragmentShader
    : (shader !== 'custom' && SHADER_PRESETS[shader])
      ? SHADER_PRESETS[shader]
      : SHADER_PRESETS['liquid-glass'];

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // WebGL UV Y is inverted
      mousePosRef.current = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    isHoveredRef.current = true;
  }, []);

  const handlePointerLeave = useCallback(() => {
    isHoveredRef.current = false;
  }, []);

  const handlePointerDown = useCallback(() => {
    isActiveRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    isActiveRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !shadersEnabled) return;

    // IntersectionObserver to pause rendering when offscreen
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(container);

    // Initialize WebGL context
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    }) || canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });

    if (!gl) {
      const err = 'WebGL is not supported in this environment.';
      setGlError(err);
      onError?.(err);
      observer.disconnect();
      return;
    }

    incrementContextCount();

    const engine = new ShaderEngine(gl);
    const compileRes = engine.getOrCreateProgram(fragmentSource);

    if (compileRes.error) {
      setGlError(compileRes.error);
      onError?.(compileRes.error);
    } else {
      setGlError(null);
      onError?.(null);
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      const width = Math.floor(container.clientWidth * dpr);
      const height = Math.floor(container.clientHeight * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width || 1;
        canvas.height = height || 1;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    handleResize();

    const renderLoop = (now: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);

      if (!isVisibleRef.current) return;

      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Update animation time (paused if reducedMotion)
      if (!tokens.reducedMotion) {
        timeRef.current += delta * speed * tokens.globalSpeed;
      }

      // Smooth lerp interactions
      const targetHover = isHoveredRef.current ? 1.0 : 0.0;
      const targetActive = isActiveRef.current ? 1.0 : 0.0;
      hoverLerpRef.current = lerp(hoverLerpRef.current, targetHover, 0.15);
      activeLerpRef.current = lerp(activeLerpRef.current, targetActive, 0.25);

      if (compileRes.program) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        engine.bindUniforms(compileRes.program, {
          u_time: timeRef.current,
          u_resolution: [canvas.width, canvas.height],
          u_mouse: mousePosRef.current,
          u_hover: hoverLerpRef.current,
          u_active: activeLerpRef.current,
          u_color_primary: primaryVec4,
          u_color_secondary: secondaryVec4,
          u_color_accent: accentVec4,
          u_color_bg: bgVec4,
          u_border_color: borderVec4,
          u_corner_radius: cornerRadius * dpr,
          u_pixel_ratio: dpr,
          ...uniforms,
        });

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        engine.render(compileRes.program);
      }
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      observer.disconnect();
      decrementContextCount();
      engine.destroy();
    };
  }, [
    fragmentSource,
    shadersEnabled,
    tokens.reducedMotion,
    tokens.globalSpeed,
    speed,
    cornerRadius,
    primaryVec4,
    secondaryVec4,
    accentVec4,
    bgVec4,
    borderVec4,
    onError,
    incrementContextCount,
    decrementContextCount,
  ]);

  if (!shadersEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{
        borderRadius: `${cornerRadius}px`,
        opacity,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {glError && (
        <div className="absolute inset-0 bg-red-950/80 p-2 text-red-200 text-xs overflow-auto font-mono pointer-events-auto">
          Shader Error: {glError}
        </div>
      )}
    </div>
  );
};
