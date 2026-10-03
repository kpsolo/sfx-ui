import { useState } from 'react';
import { Badge, Button, Card, ContentFx, Input, Slider, Tabs } from '../../kit';
import { Section } from './shared';

const FX: { id: ContentFx; label: string; note: string; amount: number }[] = [
  { id: 'liquid', label: 'Liquid', note: 'fbm warp of the content', amount: 45 },
  { id: 'ripple', label: 'Ripple', note: 'waves around the pointer, shockwave per click', amount: 70 },
  { id: 'chroma', label: 'Chroma', note: 'RGB channel split', amount: 40 },
  { id: 'glitch', label: 'Glitch', note: 'tearing scanline bands', amount: 50 },
  { id: 'pixelate', label: 'Pixelate', note: 'quantized sampling', amount: 35 },
  { id: 'hologram', label: 'Hologram', note: 'tint, scanlines, flicker', amount: 85 },
  { id: 'dissolve', label: 'Dissolve', note: 'noise burn-out with glowing edge', amount: 40 },
];

export function EffectsSection() {
  const [fx, setFx] = useState<ContentFx>('liquid');
  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(FX.map((f) => [f.id, f.amount])));
  const current = FX.find((f) => f.id === fx)!;
  const amount = amounts[fx];

  return (
    <Section
      id="effects"
      eyebrow="Live HTML FX"
      title="Shaders on the content itself"
      description="The card below is ordinary HTML: select the text, type in the field, press the button. The effect runs on its live snapshot every frame."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-6">
          <Tabs label="Content effect" items={FX.map((f) => ({ id: f.id, label: f.label }))} value={fx} onChange={(id) => setFx(id as ContentFx)} />
          <Slider
            className="w-64"
            label={`Amount · ${current.note}`}
            value={amount}
            onChange={(v) => setAmounts((a) => ({ ...a, [fx]: v }))}
            format={(v) => `${v}%`}
          />
        </div>
        <Card material="solid" fx={fx} fxAmount={amount / 100} padding="lg" className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <article className="space-y-4">
            <Badge tone="primary">Interactive while distorted</Badge>
            <h3 className="text-2xl font-semibold tracking-tight">The browser still owns this text.</h3>
            <p className="leading-relaxed text-sfx-text/70">
              HTML-in-Canvas keeps these elements in the layout and accessibility trees and hit-tests them where they
              are drawn. The shader only changes how the snapshot is sampled, so links, selection and screen readers
              behave exactly as before.
            </p>
            <p className="font-mono text-xs text-sfx-text/45">fx = '{fx}' · amount = {(amount / 100).toFixed(2)}</p>
          </article>
          <div className="space-y-4 self-center">
            <Input label="Type here" placeholder="Still a real <input>" />
            <Button variant="neon" className="w-full">
              Press me
            </Button>
          </div>
        </Card>
      </div>
    </Section>
  );
}
