import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { UnifiedShaderEngine } from './UnifiedShaderEngine';

interface UnifiedContextValue {
  engine: UnifiedShaderEngine | null;
  isSupported: boolean;
}

const UnifiedContext = createContext<UnifiedContextValue>({ engine: null, isSupported: false });

export const UnifiedCanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<UnifiedShaderEngine | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const eng = new UnifiedShaderEngine(canvas);
      eng.resize();

      const handleResize = () => eng.resize();
      window.addEventListener('resize', handleResize);

      setEngine(eng);

      return () => {
        window.removeEventListener('resize', handleResize);
        eng.destroy();
      };
    } catch (e) {
      console.warn('Unified canvas initialization failed:', e);
      setIsSupported(false);
    }
  }, []);

  return (
    <UnifiedContext.Provider value={{ engine, isSupported }}>
      {/* Exactly ONE global canvas covering the screen */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 block w-full h-full"
      />
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </UnifiedContext.Provider>
  );
};

export const useUnifiedContext = () => useContext(UnifiedContext);
