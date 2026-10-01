import React, { useEffect } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface ModalProps extends ShaderProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backdropShader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  backdropShader = true,
  shader = 'electric-border',
  customFragmentShader,
  uniforms,
  disableShader,
  shaderSpeed = 1.0,
  cornerRadius = 16,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      >
        {backdropShader && !disableShader && (
          <ShaderCanvas
            shader="cyber-grid"
            speed={0.4}
            opacity={0.3}
            cornerRadius={0}
            className="z-0"
          />
        )}
      </div>

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl shadow-cyan-950/50 overflow-hidden"
        style={{ borderRadius: `${cornerRadius}px` }}
      >
        {/* Frame Shader */}
        {hasShader && (
          <ShaderCanvas
            shader={shader}
            customFragmentShader={customFragmentShader}
            uniforms={uniforms}
            speed={shaderSpeed}
            opacity={0.9}
            cornerRadius={cornerRadius}
            className="z-0 pointer-events-none"
          />
        )}

        {/* Content */}
        <div className="relative z-10 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              {title && <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>}
              {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-sm text-slate-200">
            {children}
          </div>

          {footer && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
