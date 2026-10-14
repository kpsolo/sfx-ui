import React, { useEffect, useRef, useState } from 'react';
import { Renderer, Quality } from '../gpu/Renderer';
import { detectSupport, SupportReport } from '../gpu/support';
import { DRAWABLE_CANVAS_ATTRS } from '../gpu/htmlInCanvas';
import { createHtmlContentSource } from './htmlContentSource';
import { StageContext } from './context';
import { UnsupportedGate } from './UnsupportedGate';
import type { ThemeName } from '../theme';

export interface StageProps {
  /** Must be <Layer> elements: only direct canvas children are drawable. */
  children: React.ReactNode;
  theme?: ThemeName;
  /** Rendering quality (text stays sharp in 'auto'; see Quality). Default 'auto'. */
  quality?: Quality;
  /** Global post-processing on the final image. */
  post?: Partial<Renderer['post']>;
  onReady?: (renderer: Renderer) => void;
  /** Force simplified CSS fallback mode (for testing or cross-browser preview). */
  fallback?: boolean;
}

/**
 * The root of an SFX app: one full-viewport WebGPU canvas whose children are real, laid-out,
 * accessible HTML drawn by the GPU via HTML-in-Canvas.
 * Includes a simplified CSS Glassmorphism fallback for Safari and browsers without WebGPU.
 */
export function Stage({ children, theme = 'neon', quality = 'auto', post, onReady, fallback = false }: StageProps) {
  const [support, setSupport] = useState<SupportReport | null>(null);
  const [userFallback, setUserFallback] = useState(fallback);

  useEffect(() => {
    setUserFallback(fallback);
  }, [fallback]);

  useEffect(() => {
    detectSupport().then(setSupport);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!support) return null;

  if (userFallback || (!support.ready && userFallback)) {
    return (
      <StageFallback onExit={support.ready ? () => setUserFallback(false) : undefined}>
        {children}
      </StageFallback>
    );
  }

  if (!support.ready) {
    return <UnsupportedGate report={support} onFallback={() => setUserFallback(true)} />;
  }

  return (
    <StageCanvas post={post} quality={quality} onReady={onReady}>
      {children}
    </StageCanvas>
  );
}

function StageFallback({ children, onExit }: { children: React.ReactNode; onExit?: () => void }) {
  return (
    <div className="sfx-fallback sfx-fallback-bg fixed inset-0 flex flex-col overflow-hidden bg-[rgb(var(--sfx-bg))] text-sfx-text">
      {/* Top Banner explaining the Safari / WebGPU-less simplified fallback */}
      <div className="relative z-50 flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-2 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-medium text-amber-200">
            Simplified CSS Fallback Mode (Safari &amp; Non-WebGPU Compatible)
          </span>
          <span className="hidden text-sfx-text/60 sm:inline">
            · Real HTML markup with CSS glassmorphism &amp; backdrop filters
          </span>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-200 hover:bg-amber-500/20"
          >
            Switch to WebGPU
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <StageContext.Provider value={{ renderer: null, canvas: null }}>{children}</StageContext.Provider>
      </div>
    </div>
  );
}

function StageCanvas({ children, post, quality = 'auto', onReady }: Omit<StageProps, 'theme'>) {
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let created: Renderer | null = null;
    Renderer.create({
      canvas,
      loop: 'paint',
      quality: qualityRef.current,
      contentSource: createHtmlContentSource(),
      onDeviceLost: (info) => {
        console.warn('SFX: GPU device lost, rebuilding stage', info.message);
        if (alive) setGeneration((g) => g + 1);
      },
    })
      .then((r) => {
        if (!alive) {
          r.destroy();
          return;
        }
        created = r;
        setRenderer(r);
        if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sfxRenderer = r;
        onReadyRef.current?.(r);
      })
      .catch((e) => setError(String(e?.message ?? e)));
    // Stop the paint loop before unload: the tab crashed twice while reloading mid-frame in
    // Chrome 154 (cause unconfirmed; releasing the device first is a cheap precaution).
    const onPageHide = () => created?.destroy();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      alive = false;
      window.removeEventListener('pagehide', onPageHide);
      created?.destroy();
      setRenderer(null);
    };
  }, [generation]);

  useEffect(() => {
    if (renderer && post) Object.assign(renderer.post, post);
  }, [renderer, post]);

  useEffect(() => {
    if (renderer && renderer.getQuality() !== quality) renderer.setQuality(quality);
  }, [renderer, quality]);

  return (
    <>
      <canvas ref={canvasRef} {...DRAWABLE_CANVAS_ATTRS} className="fixed inset-0 block h-screen w-screen">
        <StageContext.Provider value={{ renderer, canvas: canvasRef.current }}>{renderer && children}</StageContext.Provider>
      </canvas>
      {error && (
        <div role="alert" className="fixed inset-x-4 bottom-4 rounded-lg bg-red-950 p-4 font-mono text-sm text-red-200">
          SFX renderer failed: {error}
        </div>
      )}
    </>
  );
}
