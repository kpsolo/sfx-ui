import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ShaderProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  isLoading = false,
  shader,
  shaderTarget = 'background',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 1.0,
  cornerRadius = 8,
  disabled,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Pick sensible default shader if variant suggests it and none specified
  const effectiveShader = shader ?? (
    variant === 'neon' ? 'electric-border' :
    variant === 'primary' ? 'liquid-glass' :
    undefined
  );

  const hasShader = Boolean(effectiveShader && !disableShader && !disabled);

  // Base sizing
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  }[size];

  // Fallback CSS styling for when shader is disabled or as foundation
  const variantClasses = {
    primary: 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/30',
    secondary: 'bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-750 hover:border-slate-600',
    outline: 'bg-transparent text-slate-200 border border-slate-600 hover:border-cyan-400 hover:text-cyan-300',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent',
    danger: 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 hover:border-red-400',
    neon: 'bg-fuchsia-950/40 text-fuchsia-200 border border-fuchsia-500/60 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.25)]',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        setIsActive(false);
        onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        setIsActive(true);
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setIsActive(false);
        onMouseUp?.(e);
      }}
      className={`
        relative isolate inline-flex items-center justify-center font-medium
        transition-all duration-200 select-none overflow-hidden cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
        ${sizeClasses}
        ${variantClasses}
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
          isActive={isActive}
          className={`z-0 ${shaderTarget === 'border' ? 'pointer-events-none' : ''}`}
        />
      )}

      {/* Button Content */}
      <span className="relative z-10 flex items-center gap-2 font-medium tracking-wide">
        {isLoading && (
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {!isLoading && iconLeft}
        <span>{children}</span>
        {!isLoading && iconRight}
      </span>

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
          isActive={isActive}
          className="z-20 pointer-events-none mix-blend-screen"
        />
      )}
    </button>
  );
};
