import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface SliderProps extends ShaderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (val: number) => void;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value: controlledValue,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  showValue = true,
  disabled = false,
  shader = 'aurora-waves',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isHovered, setIsHovered] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setInternalValue(val);
    onChange?.(val);
  };

  const hasShader = Boolean(shader && !disableShader && !disabled);

  return (
    <div
      className={`flex flex-col gap-2 w-full select-none ${disabled ? 'opacity-50' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          {label && <span>{label}</span>}
          {showValue && <span className="font-mono text-cyan-400">{value}</span>}
        </div>
      )}

      <div className="relative h-6 flex items-center">
        {/* Background track */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 relative">
          {/* Active fill portion with shader */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-cyan-500 rounded-full overflow-hidden transition-[width] duration-75 relative isolate"
            style={{ width: `${percentage}%` }}
          >
            {hasShader && (
              <ShaderCanvas
                shader={shader}
                customFragmentShader={customFragmentShader}
                uniforms={uniforms}
                speed={shaderSpeed}
                cornerRadius={4}
                isHovered={isHovered}
                className="z-0"
              />
            )}
          </div>
        </div>

        {/* Real HTML range input for full accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Visual Thumb knob */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] pointer-events-none transform -translate-x-1/2 transition-[left] duration-75"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
