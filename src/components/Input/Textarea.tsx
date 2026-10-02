import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    ShaderProps {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  helperText,
  error,
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
  rows = 4,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasShader = Boolean(shader && !disableShader && !disabled && (isFocused || isHovered));

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
        className="relative isolate w-full"
        style={{ borderRadius: `${cornerRadius}px` }}
      >
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

        <textarea
          rows={rows}
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
            relative z-10 w-full bg-slate-900/80 border p-3 text-sm text-slate-100 font-sans
            focus:outline-none placeholder:text-slate-500 transition-colors duration-150 resize-y
            ${error ? 'border-red-500/80' : isFocused ? 'border-cyan-400' : 'border-slate-800'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ borderRadius: `${cornerRadius}px` }}
          {...props}
        />
      </div>

      {helperText && !error && (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      )}
    </div>
  );
};
