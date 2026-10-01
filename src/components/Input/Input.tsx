import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    ShaderProps {
  label?: string;
  helperText?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  iconLeft,
  iconRight,
  inputSize = 'md',
  shader = 'electric-border',
  shaderTarget = 'border',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 0.85,
  cornerRadius = 8,
  disabled,
  className = '',
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  }[inputSize];

  const hasShader = Boolean(shader && !disableShader && !disabled);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide flex items-center justify-between">
          <span>{label}</span>
          {error && <span className="text-red-400 text-[11px]">{error}</span>}
        </label>
      )}

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative isolate w-full flex items-center"
        style={{ borderRadius: `${cornerRadius}px` }}
      >
        {/* Background / Border Shader */}
        {hasShader && (
          <ShaderCanvas
            shader={shader}
            customFragmentShader={customFragmentShader}
            uniforms={uniforms}
            speed={shaderSpeed}
            opacity={isFocused ? shaderOpacity : shaderOpacity * 0.4}
            cornerRadius={cornerRadius}
            isHovered={isHovered || isFocused}
            isActive={isFocused}
            className={`z-0 ${shaderTarget === 'border' ? 'pointer-events-none' : ''}`}
          />
        )}

        {/* Input container styling */}
        <div
          className={`
            relative z-10 w-full flex items-center bg-slate-900/80 border
            ${error ? 'border-red-500/80' : isFocused ? 'border-cyan-400' : 'border-slate-800'}
            text-slate-100 transition-colors duration-150
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          {iconLeft && <span className="pl-3 text-slate-400 pointer-events-none">{iconLeft}</span>}
          <input
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            className={`
              w-full bg-transparent focus:outline-none placeholder:text-slate-500 font-sans
              ${sizeClasses}
              ${iconLeft ? 'pl-2' : ''}
              ${iconRight ? 'pr-2' : ''}
            `}
            {...props}
          />
          {iconRight && <span className="pr-3 text-slate-400">{iconRight}</span>}
        </div>
      </div>

      {helperText && !error && (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      )}
    </div>
  );
};
