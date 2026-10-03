import { Card, BuiltinMaterial } from '../../kit';
import { Section } from './shared';

const GALLERY: { material: BuiltinMaterial; title: string; note: string }[] = [
  { material: 'glass', title: 'Glass', note: 'Refracts and blurs the real scene behind it, with chromatic rim dispersion.' },
  { material: 'aurora', title: 'Aurora', note: 'Fractal noise curtains in the theme colors.' },
  { material: 'plasma', title: 'Plasma', note: 'Interference field that bends toward the pointer.' },
  { material: 'grid', title: 'Grid', note: 'Perspective synthwave floor; hover to steer.' },
  { material: 'electric', title: 'Electric', note: 'Crackling border arc with sparks.' },
  { material: 'hologram', title: 'Hologram', note: 'Scanlines, sweep and flicker.' },
  { material: 'dither', title: 'Dither', note: 'Ordered Bayer dithering on device pixels.' },
  { material: 'starfield', title: 'Starfield', note: 'Parallax warp; speeds up on hover and press.' },
  { material: 'ripple', title: 'Ripple', note: 'Rings from the pointer and a shockwave per click.' },
  { material: 'solid', title: 'Solid', note: 'The quiet one: surface color, border and press state.' },
];

export function MaterialsSection() {
  return (
    <Section
      id="materials"
      eyebrow="Materials"
      title="Surface materials"
      description="Materials are WGSL functions. Every one gets the element's shape, pointer, hover, press and focus, and the theme colors."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERY.map((m) => (
          <Card key={m.material} material={m.material} className="flex min-h-[180px] cursor-crosshair flex-col justify-end">
            <h3 className="text-base font-semibold">
              {m.title} <span className="font-mono text-xs font-normal text-sfx-text/50">'{m.material}'</span>
            </h3>
            <p className="mt-1 text-sm text-sfx-text/70">{m.note}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
