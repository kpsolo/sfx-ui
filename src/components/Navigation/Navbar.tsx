import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface NavbarProps extends ShaderProps {
  brand?: React.ReactNode;
  navLinks?: { label: string; href?: string; onClick?: () => void; active?: boolean }[];
  actions?: React.ReactNode;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  brand,
  navLinks = [],
  actions,
  shader = 'liquid-glass',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 0.8,
  shaderOpacity = 0.7,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const hasShader = Boolean(shader && !disableShader);

  return (
    <header
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative isolate w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between ${className}`}
    >
      {/* Background Shader */}
      {hasShader && (
        <ShaderCanvas
          shader={shader}
          customFragmentShader={customFragmentShader}
          uniforms={uniforms}
          speed={shaderSpeed}
          opacity={shaderOpacity}
          cornerRadius={0}
          isHovered={isHovered}
          className="z-0"
        />
      )}

      {/* Brand */}
      <div className="relative z-10 flex items-center gap-3">
        {brand}
      </div>

      {/* Navigation Links */}
      {navLinks.length > 0 && (
        <nav className="relative z-10 hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          {navLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={link.onClick}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                ${link.active ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
              `}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}

      {/* Actions */}
      <div className="relative z-10 flex items-center gap-3">
        {actions}
      </div>
    </header>
  );
};
