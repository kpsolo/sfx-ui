import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, ShaderProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neon' | 'neutral';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  dot = false,
  shader = 'plasma-flow',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 0.8,
  cornerRadius = 9999,
  className = '',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variantStyles = {
    primary: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    neon: 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.3)]',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  }[variant];

  const dotColors = {
    primary: 'bg-cyan-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    neon: 'bg-fuchsia-400',
    neutral: 'bg-slate-400',
  }[variant];

  const hasShader = Boolean(shader && !disableShader);

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative isolate inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-full overflow-hidden select-none
        ${variantStyles}
        ${className}
      `}
      style={{ borderRadius: `${cornerRadius}px` }}
      {...props}
    >
      {/* Background Shader */}
      {hasShader && (
        <ShaderCanvas
          shader={shader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={cornerRadius}
          isHovered={isHovered}
          className="z-0"
        />
      )}

      {dot && (
        <span className={`relative z-10 w-1.5 h-1.5 rounded-full ${dotColors} animate-pulse`} />
      )}

      <span className="relative z-10">{children}</span>
    </span>
  );
};
