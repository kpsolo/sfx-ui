import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { DesignTokens } from './types';
import { hexToRgba } from './utils';

interface ShaderContextValue {
  tokens: DesignTokens;
  setTokens: React.Dispatch<React.SetStateAction<DesignTokens>>;
  shadersEnabled: boolean;
  setShadersEnabled: (enabled: boolean) => void;
  activeContextCount: number;
  incrementContextCount: () => void;
  decrementContextCount: () => void;
  primaryVec4: [number, number, number, number];
  secondaryVec4: [number, number, number, number];
  accentVec4: [number, number, number, number];
  bgVec4: [number, number, number, number];
  surfaceVec4: [number, number, number, number];
  borderVec4: [number, number, number, number];
}

const defaultTokens: DesignTokens = {
  colors: {
    primary: '#38bdf8',   // Sky blue
    secondary: '#818cf8', // Indigo
    accent: '#f43f5e',    // Rose glow / neon
    bg: '#090d16',        // Deep cyber slate
    surface: '#111827',   // Slate panel
    border: '#1f293d',    // Border line
  },
  reducedMotion: false,
  globalSpeed: 1.0,
};

const ShaderContext = createContext<ShaderContextValue | null>(null);

export const ShaderProvider: React.FC<{ children: React.ReactNode; initialTokens?: Partial<DesignTokens> }> = ({
  children,
  initialTokens,
}) => {
  const [tokens, setTokens] = useState<DesignTokens>({
    ...defaultTokens,
    ...initialTokens,
  });
  const [shadersEnabled, setShadersEnabled] = useState(true);
  const [activeContextCount, setActiveContextCount] = useState(0);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setTokens(prev => ({ ...prev, reducedMotion: true }));
      }
      const listener = (e: MediaQueryListEvent) => {
        setTokens(prev => ({ ...prev, reducedMotion: e.matches }));
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const incrementContextCount = () => setActiveContextCount(c => c + 1);
  const decrementContextCount = () => setActiveContextCount(c => Math.max(0, c - 1));

  const primaryVec4 = useMemo(() => hexToRgba(tokens.colors.primary), [tokens.colors.primary]);
  const secondaryVec4 = useMemo(() => hexToRgba(tokens.colors.secondary), [tokens.colors.secondary]);
  const accentVec4 = useMemo(() => hexToRgba(tokens.colors.accent), [tokens.colors.accent]);
  const bgVec4 = useMemo(() => hexToRgba(tokens.colors.bg), [tokens.colors.bg]);
  const surfaceVec4 = useMemo(() => hexToRgba(tokens.colors.surface), [tokens.colors.surface]);
  const borderVec4 = useMemo(() => hexToRgba(tokens.colors.border), [tokens.colors.border]);

  return (
    <ShaderContext.Provider
      value={{
        tokens,
        setTokens,
        shadersEnabled,
        setShadersEnabled,
        activeContextCount,
        incrementContextCount,
        decrementContextCount,
        primaryVec4,
        secondaryVec4,
        accentVec4,
        bgVec4,
        surfaceVec4,
        borderVec4,
      }}
    >
      {children}
    </ShaderContext.Provider>
  );
};

export const useShaderSystem = () => {
  const ctx = useContext(ShaderContext);
  if (!ctx) {
    throw new Error('useShaderSystem must be used within a ShaderProvider');
  }
  return ctx;
};
