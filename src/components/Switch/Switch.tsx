import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface SwitchProps extends ShaderProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  shader = 'plasma-flow',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 0.9,
  className = '',
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const [isHovered, setIsHovered] = useState(false);

  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setInternalChecked(next);
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  const dimensions = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4', radius: 8 },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5', radius: 12 },
    lg: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 'translate-x-6', radius: 16 },
  }[size];

  const hasShader = Boolean(shader && !disableShader && !disabled && isChecked);

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={toggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        role="switch"
        aria-checked={isChecked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`
          relative isolate inline-flex shrink-0 items-center p-0.5 rounded-full transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
          ${dimensions.track}
          ${isChecked ? 'bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-slate-800 border border-slate-700'}
        `}
      >
        {/* Track Shader when ON */}
        {hasShader && (
          <ShaderCanvas
            shader={shader}
            customFragmentShader={customFragmentShader}
            uniforms={uniforms}
            speed={shaderSpeed}
            opacity={shaderOpacity}
            cornerRadius={dimensions.radius}
            isHovered={isHovered}
            className="z-0"
          />
        )}

        {/* Thumb */}
        <span
          className={`
            relative z-10 block rounded-full bg-white shadow-md transform transition-transform duration-200 pointer-events-none
            ${dimensions.thumb}
            ${isChecked ? `${dimensions.translate} bg-cyan-100 shadow-[0_0_8px_rgba(255,255,255,0.8)]` : 'translate-x-0 bg-slate-300'}
          `}
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-slate-200">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
    </div>
  );
};
