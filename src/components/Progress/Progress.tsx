import React from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface ProgressProps extends ShaderProps {
  value?: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 50,
  max = 100,
  label,
  showValue = false,
  size = 'md',
  shader = 'aurora-waves',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.2,
  className = '',
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-3',
    lg: 'h-5',
  }[size];

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          {label && <span>{label}</span>}
          {showValue && <span className="font-mono text-cyan-400">{Math.round(percentage)}%</span>}
        </div>
      )}

      <div className={`w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden relative ${heightClasses}`}>
        <div
          className="h-full bg-cyan-500 rounded-full overflow-hidden transition-[width] duration-300 relative isolate"
          style={{ width: `${percentage}%` }}
        >
          {hasShader && (
            <ShaderCanvas
              shader={shader}
              customFragmentShader={customFragmentShader}
              uniforms={uniforms}
              speed={shaderSpeed}
              cornerRadius={9999}
              className="z-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};
