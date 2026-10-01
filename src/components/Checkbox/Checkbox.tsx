import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface CheckboxProps extends ShaderProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  description,
  shader = 'electric-border',
  customFragmentShader,
  uniforms,
  disableShader,
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

  const hasShader = Boolean(shader && !disableShader && !disabled && (isChecked || isHovered));

  return (
    <label
      className={`inline-flex items-start gap-2.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={toggle}
        className={`
          relative isolate mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all duration-150
          ${isChecked ? 'bg-cyan-500/30 border border-cyan-400' : 'bg-slate-900 border border-slate-700 hover:border-slate-500'}
        `}
      >
        {/* Shader Aura */}
        {hasShader && (
          <ShaderCanvas
            shader={shader}
            customFragmentShader={customFragmentShader}
            uniforms={uniforms}
            cornerRadius={4}
            isHovered={isHovered}
            className="z-0"
          />
        )}

        {/* Checkmark icon */}
        {isChecked && (
          <svg className="w-3.5 h-3.5 text-cyan-300 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-sm font-medium text-slate-200">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
    </label>
  );
};
