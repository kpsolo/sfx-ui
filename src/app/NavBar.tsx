import { useEffect, useState } from 'react';
import { Badge, Button, Quality, Select, Surface, THEMES, ThemeName, useStage } from '../kit';
import { SECTIONS } from './sections/shared';

interface NavBarProps {
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  quality: Quality;
  onQuality: (q: Quality) => void;
  onNavigate: (id: string) => void;
}

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'auto', label: 'Auto' },
  { value: 'fast', label: 'Fast' },
];

function useFrameStats() {
  const { renderer } = useStage();
  const [stats, setStats] = useState({ fps: 0, text: 1, shaders: 1, surfaces: 0, layers: 0 });
  useEffect(() => {
    if (!renderer) return;
    const timer = setInterval(() => {
      const s = renderer.getStats();
      setStats({ fps: s.fps, text: s.contentScale, shaders: s.materialScale, surfaces: s.drawn, layers: s.layers });
    }, 1000);
    return () => clearInterval(timer);
  }, [renderer]);
  return stats;
}

export function NavBar({ theme, onTheme, quality, onQuality, onNavigate }: NavBarProps) {
  const stats = useFrameStats();
  return (
    <Surface
      as="nav"
      aria-label="Main"
      className="relative mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-2xl px-3 text-sfx-text"
      surface={{ material: 'glass', params: [14, 18, 0.12, 20], margin: 14 }}
    >
      <span className="flex items-center gap-2.5 pl-1 pr-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg font-mono text-xs font-bold text-sfx-primary ring-1 ring-sfx-primary/50">
          SFX
        </span>
        <span className="hidden text-sm font-semibold tracking-wide sm:inline">SFX UI</span>
      </span>
      <ul className="hidden flex-1 items-center gap-0.5 xl:flex">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <Button variant="ghost" size="sm" onClick={() => onNavigate(s.id)}>
              {s.label}
            </Button>
          </li>
        ))}
      </ul>
      <span className="ml-auto hidden md:inline-flex">
        <Badge
          tone={stats.fps >= 48 ? 'success' : 'accent'}
          dot
          title={`${stats.surfaces} surfaces, ${stats.layers} layers. Text ${stats.text}×, shaders ${stats.shaders}× (device px per CSS px).`}
        >
          {stats.fps} fps · text {stats.text}× · fx {stats.shaders}×
        </Badge>
      </span>
      <Select className="w-28" label="Quality" hideLabel value={quality} onChange={onQuality} options={QUALITY_OPTIONS} />
      <Select
        className="w-28"
        label="Theme"
        hideLabel
        value={theme}
        onChange={onTheme}
        options={THEMES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
      />
    </Surface>
  );
}
