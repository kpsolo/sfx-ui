import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Surface, ThemeName, Quality } from '../kit';
import { NavBar } from './NavBar';
import { Hero } from './sections/Hero';
import { ButtonsSection } from './sections/ButtonsSection';
import { FormsSection } from './sections/FormsSection';
import { MaterialsSection } from './sections/MaterialsSection';
import { EffectsSection } from './sections/EffectsSection';
import { DataSection } from './sections/DataSection';
import { StudioSection } from './sections/StudioSection';

const QUALITY_KEY = 'sfx-quality';
const QUALITIES: Quality[] = ['sharp', 'auto', 'fast'];

// Per-viewer preference; storage can be unavailable (private mode, blocked site data).
function loadQuality(): Quality {
  try {
    const v = localStorage.getItem(QUALITY_KEY);
    if (v && (QUALITIES as string[]).includes(v)) return v as Quality;
  } catch {
    /* ignore */
  }
  return 'auto';
}

export function App() {
  const [theme, setTheme] = useState<ThemeName>('neon');
  const [quality, setQuality] = useState<Quality>(loadQuality);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(QUALITY_KEY, quality);
    } catch {
      /* ignore */
    }
  }, [quality]);

  const scrollTo = (id: string) => {
    page.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Stage theme={theme} quality={quality} post={{ vignette: 0.3, grain: 0.02 }}>
      {/* Pure-shader background: no HTML, never hit-tested. */}
      <Layer z={-10} content={false} aria-hidden>
        <Surface className="h-full w-full" surface={{ material: 'starfield', intensity: 0.5, margin: 0 }} />
      </Layer>

      {/* The scrolling page. */}
      <Layer ref={page} z={0} className="sfx-scroll overflow-y-auto">
        <main className="mx-auto max-w-6xl space-y-24 px-5 pb-32 pt-28 sm:px-8">
          <Hero onExplore={() => scrollTo('components')} onStudio={() => scrollTo('studio')} />
          <ButtonsSection />
          <FormsSection />
          <MaterialsSection />
          <EffectsSection />
          <DataSection />
          <StudioSection />
          <footer className="pt-8 text-center font-mono text-xs text-sfx-text/40">
            SFX UI · HTML-in-Canvas × WebGPU · every pixel on this page came from a shader
          </footer>
        </main>
      </Layer>

      {/* Navigation floats on its own layer, so its glass refracts the page scrolling beneath. */}
      <Layer z={10} fill={false} className="w-full p-3">
        <NavBar theme={theme} onTheme={setTheme} quality={quality} onQuality={setQuality} onNavigate={scrollTo} />
      </Layer>
    </Stage>
  );
}
