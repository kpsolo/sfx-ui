import React, { useState } from 'react';
import { ShaderProps } from '../core/types';
import { ShaderCanvas } from '../core/ShaderCanvas';

export interface ShaderSurfaceProps extends ShaderProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  isHovered?: boolean;
  isActive?: boolean;
  onClick?: React.MouseEventHandler;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
}

export const ShaderSurface: React.FC<ShaderSurfaceProps> = ({
  children,
  shader,
  shaderTarget = 'background',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  shaderOpacity = 1.0,
  cornerRadius = 8,
  className = '',
  style,
  as: Component = 'div',
  isHovered: externalHovered,
  isActive: externalActive,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const [internalActive, setInternalActive] = useState(false);

  const hovered = externalHovered !== undefined ? externalHovered : internalHover;
  const active = externalActive !== undefined ? externalActive : internalActive;

  const handleMouseEnter = (e: React.MouseEvent) => {
    setInternalHover(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    setInternalHover(false);
    setInternalActive(false);
    onMouseLeave?.(e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setInternalActive(true);
    onMouseDown?.(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setInternalActive(false);
    onMouseUp?.(e);
  };

  const hasShader = Boolean(shader && !disableShader);

  return (
    <Component
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`relative isolate ${className}`}
      style={{
        borderRadius: `${cornerRadius}px`,
        ...style,
      }}
      {...rest}
    >
      {/* Background or Border Shader */}
      {hasShader && (shaderTarget === 'background' || shaderTarget === 'border') && (
        <ShaderCanvas
          shader={shader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={cornerRadius}
          isHovered={hovered}
          isActive={active}
          className={`z-0 ${shaderTarget === 'border' ? 'pointer-events-none' : ''}`}
        />
      )}

      {/* Semantic DOM Children */}
      <div className="relative z-10 w-full h-full flex flex-col justify-center">
        {children}
      </div>

      {/* Overlay Shader */}
      {hasShader && shaderTarget === 'overlay' && (
        <ShaderCanvas
          shader={shader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={cornerRadius}
          isHovered={hovered}
          isActive={active}
          className="z-20 pointer-events-none mix-blend-screen"
        />
      )}
    </Component>
  );
};
