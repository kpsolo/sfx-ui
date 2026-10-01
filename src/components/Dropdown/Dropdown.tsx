import React, { useState, useRef, useEffect } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DropdownProps extends ShaderProps {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value: controlledValue,
  defaultValue,
  placeholder = 'Select an option...',
  onChange,
  label,
  shader = 'liquid-glass',
  customFragmentShader,
  uniforms,
  disableShader,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = options.find((o) => o.value === selectedValue);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    onChange?.(val);
    setIsOpen(false);
  };

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div className={`flex flex-col gap-1.5 relative w-full ${className}`} ref={dropdownRef}>
      {label && <span className="text-xs font-medium text-slate-300">{label}</span>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-200 hover:border-slate-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          {selectedOption ? selectedOption.label : <span className="text-slate-500">{placeholder}</span>}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden isolate"
          style={{ borderRadius: '12px' }}
        >
          {hasShader && (
            <ShaderCanvas
              shader={shader}
              customFragmentShader={customFragmentShader}
              uniforms={uniforms}
              opacity={0.7}
              cornerRadius={12}
              className="z-0"
            />
          )}

          <div className="relative z-10 p-1.5 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors
                  ${option.value === selectedValue ? 'bg-cyan-500/20 text-cyan-200 font-medium' : 'text-slate-200 hover:bg-slate-800/80'}
                `}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
