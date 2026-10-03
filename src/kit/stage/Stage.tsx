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
}

/**
 * The root of an SFX app: one full-viewport WebGPU canvas whose children are real, laid-out,
 * accessible HTML drawn by the GPU via HTML-in-Canvas. Canvas-only: browsers without the API
 * get a gate screen explaining how to enable it.
 */
export function Stage({ children, theme = 'neon', quality = 'auto', post, onReady }: StageProps) {
  const [support, setSupport] = useState<SupportReport | null>(null);

  useEffect(() => {
    detectSupport().then(setSupport);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!support) return null;
  if (!support.ready) return <UnsupportedGate report={support} />;
  return (
    <StageCanvas post={post} quality={quality} onReady={onReady}>
      {children}
    </StageCanvas>
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
