import React, { useState } from 'react';
import { ShaderProps } from '../../core/types';
import { ShaderCanvas } from '../../core/ShaderCanvas';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps extends ShaderProps {
  tabs: TabItem[];
  activeId?: string;
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId: controlledActiveId,
  defaultActiveId,
  onChange,
  shader = 'liquid-glass',
  customFragmentShader,
  uniforms,
  disableShader,
  className = '',
}) => {
  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId || tabs[0]?.id);

  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;

  const handleSelect = (id: string) => {
    setInternalActiveId(id);
    onChange?.(id);
  };

  const hasShader = Boolean(shader && !disableShader);

  return (
    <div className={`inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1 relative ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={`
              relative isolate px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-150 flex items-center gap-2 select-none
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            {/* Active Shader Indicator */}
            {isActive && hasShader && (
              <ShaderCanvas
                shader={shader}
                customFragmentShader={customFragmentShader}
                uniforms={uniforms}
                cornerRadius={8}
                className="z-0"
              />
            )}

            {isActive && !hasShader && (
              <div className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-lg -z-10" />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
