import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface AvatarProps extends ShaderProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback = 'SF',
  size = 'md',
  status,
  shader = 'electric-border',
  customFragmentShader,
  uniforms,
  disableShader,
  className = '',
}) => {
  const [hasError, setHasError] = useState(!src);
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  const statusColors = {
    online: 'bg-emerald-400',
    busy: 'bg-rose-400',
    away: 'bg-amber-400',
    offline: 'bg-slate-500',
  };

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div
      className={`relative inline-flex shrink-0 ${sizeClasses} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative w-full h-full rounded-full overflow-hidden isolate p-0.5 bg-slate-800 flex items-center justify-center"
        style={{ borderRadius: '9999px' }}
      >
        {/* Orbiting Aura Shader Ring */}
        {hasShader && (
          <ShaderCanvas
            shader={shader}
            customFragmentShader={customFragmentShader}
            uniforms={uniforms}
            cornerRadius={9999}
            isHovered={isHovered}
            className="z-0"
          />
        )}

        <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center font-medium text-slate-300">
          {!hasError && src ? (
            <img
              src={src}
              alt={alt}
              onError={() => setHasError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{fallback}</span>
          )}
        </div>
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${statusColors[status]}`}
        />
      )}
    </div>
  );
};
