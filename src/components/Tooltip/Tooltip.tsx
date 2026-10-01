import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface TooltipProps extends ShaderProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  shader = 'hologram-scan',
  customFragmentShader,
  uniforms,
  disableShader,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute z-50 whitespace-nowrap px-2.5 py-1 text-xs text-slate-100 bg-slate-900 border border-slate-700/80 rounded-md shadow-lg pointer-events-none isolate overflow-hidden
            ${positionClasses}
          `}
          style={{ borderRadius: '6px' }}
        >
          {hasShader && (
            <ShaderCanvas
              shader={shader}
              customFragmentShader={customFragmentShader}
              uniforms={uniforms}
              opacity={0.8}
              cornerRadius={6}
              className="z-0"
            />
          )}
          <span className="relative z-10">{content}</span>
        </div>
      )}
    </div>
  );
};
