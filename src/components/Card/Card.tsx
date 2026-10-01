import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, ShaderProps {
  variant?: 'glass' | 'panel' | 'cyber' | 'flat';
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  isInteractive = false,
  shader,
  shaderTarget = 'background',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 0.85,
  cornerRadius = 12,
  className = '',
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Pick shader default based on variant
  const effectiveShader = shader ?? (
    variant === 'glass' ? 'liquid-glass' :
    variant === 'cyber' ? 'cyber-grid' :
    undefined
  );

  const hasShader = Boolean(effectiveShader && !disableShader);

  const variantStyles = {
    glass: 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-black/40',
    panel: 'bg-slate-900/90 border border-slate-800 shadow-lg',
    cyber: 'bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    flat: 'bg-slate-900 border border-slate-800',
  }[variant];

  return (
    <div
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      className={`
        relative isolate overflow-hidden transition-all duration-200
        ${variantStyles}
        ${isInteractive ? 'cursor-pointer hover:border-cyan-400/80 hover:-translate-y-0.5' : ''}
        ${className}
      `}
      style={{
        borderRadius: `${cornerRadius}px`,
      }}
      {...props}
    >
      {/* Background or Border Shader */}
      {hasShader && (shaderTarget === 'background' || shaderTarget === 'border') && (
        <ShaderCanvas
          shader={effectiveShader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={cornerRadius}
          isHovered={isHovered}
          className={`z-0 ${shaderTarget === 'border' ? 'pointer-events-none' : ''}`}
        />
      )}

      {/* Semantic Content */}
      <div className="relative z-10 w-full h-full p-6 text-slate-100">
        {children}
      </div>

      {/* Overlay Shader */}
      {hasShader && shaderTarget === 'overlay' && (
        <ShaderCanvas
          shader={effectiveShader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={cornerRadius}
          isHovered={isHovered}
          className="z-20 pointer-events-none mix-blend-screen"
        />
      )}
    </div>
  );
};
