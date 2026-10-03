import { useEffect, useState } from 'react';
import { Badge, Button, Card, CompileMessage, Input, Select, Textarea, useStage } from '../../kit';
import { Section } from './shared';

const STARTERS = {
  gradient: `// Tip: hover and press the previews.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let d = sdRoundBox(p, s.rect.zw * 0.5, s.shape.x);
  let t = s.anim.x;
  let c = mix(frame.primary.rgb, frame.accent.rgb, uv.x + 0.25 * sin(t + uv.y * 4.0));
  let rim = stroke(d + 1.0, 1.5) * (0.3 + 0.7 * s.state.x);
  let glowOut = (1.0 - fill(d)) * glow(d, 8.0) * s.state.x;
  return premul(c * (0.45 + 0.35 * s.state.x) + vec3f(rim), fill(d)) + premul(c, glowOut);
}`,
  voronoi: `fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let d = sdRoundBox(p, s.rect.zw * 0.5, s.shape.x);
  let q = p / 38.0;
  let cell = floor(q);
  var best = 9.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let n = cell + vec2f(f32(x), f32(y));
      let o = 0.5 + 0.5 * sin(s.anim.x + TAU * hash22(n));
      best = min(best, length(n + o - q));
    }
  }
  var c = mix(frame.primary.rgb, frame.secondary.rgb, best) * (0.35 + best * 0.6);
  c += vec3f(1.0) * smoothstep(0.08, 0.0, best) * 0.6;
  c += frame.accent.rgb * s.anim.w * 0.4;
  return premul(c, fill(d));
}`,
  lens: `// Reading backdropAt() makes this a backdrop material: it sees the scene behind it.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let half = s.rect.zw * 0.5;
  let d = sdRoundBox(p, half, s.shape.x);
  let lp = s.pointer.xy - half;
  let k = exp(-length(p - lp) / 140.0) * (0.25 + s.state.x);
  var c = backdropAt(frag - (p - lp) * k * 0.45).rgb;
  c = mix(c, frame.primary.rgb, 0.1);
  c += vec3f(1.0) * stroke(d + 1.0, 1.0) * 0.35;
  return premul(c, fill(d));
}`,
};

type Starter = keyof typeof STARTERS;

export function StudioSection() {
  const { renderer } = useStage();
  const [starter, setStarter] = useState<Starter>('gradient');
  const [code, setCode] = useState(STARTERS.gradient);
  const [messages, setMessages] = useState<CompileMessage[]>([]);
  const [status, setStatus] = useState<'compiling' | 'ok' | 'error'>('compiling');

  useEffect(() => {
    if (!renderer) return;
    setStatus('compiling');
    const t = setTimeout(async () => {
      const r = await renderer.setMaterial('studio', code);
      setMessages(r.messages);
      setStatus(r.ok ? 'ok' : 'error');
    }, 250);
    return () => clearTimeout(t);
  }, [renderer, code]);

  return (
    <Section
      id="studio"
      eyebrow="Studio"
      title="Write a material"
      description={
        <>
          Define <code className="text-sfx-primary">fn material(s, p, uv, frag) -&gt; vec4f</code> returning premultiplied color. It compiles on
          the GPU as you type and is applied to the real components on the right.
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Select
              label="Starter"
              className="w-44"
              value={starter}
              onChange={(v) => {
                setStarter(v);
                setCode(STARTERS[v]);
              }}
              options={[
                { value: 'gradient', label: 'Gradient' },
                { value: 'voronoi', label: 'Voronoi' },
                { value: 'lens', label: 'Backdrop lens' },
              ]}
            />
            <Badge tone={status === 'ok' ? 'success' : status === 'error' ? 'danger' : 'neutral'} dot>
              {status === 'ok' ? 'Compiled' : status === 'error' ? 'Error' : 'Compiling'}
            </Badge>
          </div>
          <Textarea
            aria-label="WGSL material source"
            className="font-mono text-[12.5px] leading-relaxed"
            rows={16}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {messages.length > 0 && (
            <ul className="space-y-1 font-mono text-xs" aria-live="polite">
              {messages.map((m, i) => (
                <li key={i} className={m.type === 'error' ? 'text-sfx-danger' : 'text-sfx-text/50'}>
                  {m.line}:{m.column} {m.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-5">
          <Card material="studio" className="flex min-h-[220px] flex-col justify-end">
            <h3 className="text-lg font-semibold">Preview card</h3>
            <p className="text-sm text-sfx-text/70">material = 'studio'</p>
          </Card>
          <div className="flex gap-3">
            <Button surface={{ material: 'studio' }} className="flex-1">
              Button
            </Button>
            <Button surface={{ material: 'studio' }} size="icon" aria-label="Icon button">
              ✦
            </Button>
          </div>
          <Card padding="sm" material="solid" className="font-mono text-[11px] leading-relaxed text-sfx-text/60">
            s.rect, s.shape.x (radius), s.state (hover, active, focus, value), s.anim (time, seed, intensity, press),
            s.pointer.xy, frame.primary / secondary / accent / bg / surface. Helpers: sdRoundBox, fill, stroke, glow, fbm,
            vnoise, hash21, hash22, premul, over, backdropAt, backdropBlur.
          </Card>
          <Input label="Try typing over a custom material" placeholder="…" />
        </div>
      </div>
    </Section>
  );
}
