import { useState } from 'react';
import { Droplet, Sparkles, Sliders, ShieldCheck, Zap, RefreshCw, Cpu, Laptop } from 'lucide-react';
import { Badge, Button, Card, Checkbox, Input, Select, Slider, Switch, Tabs } from '../../kit';
import { Section } from './shared';

const PRESETS = [
  { id: 'optics', label: 'Optics & Fluidity' },
  { id: 'system', label: 'Engine & Haptics' },
  { id: 'architecture', label: 'DOM Glass Architecture' },
];

export function LiquidSettingsSection() {
  const [tab, setTab] = useState('optics');
  const [fluidAmount, setFluidAmount] = useState(65);
  const [refractionIndex, setRefractionIndex] = useState(24);
  const [glassBlur, setGlassBlur] = useState(14);
  const [bevelWidth, setBevelWidth] = useState(26);

  // Settings state
  const [profileName, setProfileName] = useState('Liquid-Vitreous-P3');
  const [lensEdgeBending, setLensEdgeBending] = useState(true);
  const [pointerWake, setPointerWake] = useState(true);
  const [caustics, setCaustics] = useState(true);
  const [vramBudget, setVramBudget] = useState(80);
  const [hapticInertia, setHapticInertia] = useState(true);
  const [pipelineMode, setPipelineMode] = useState<'webgpu-native' | 'css-fallback'>('webgpu-native');
  const [simulateFallback, setSimulateFallback] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  const triggerPulse = () => {
    setPulseCount((c) => c + 1);
    setFluidAmount((prev) => Math.min(100, prev + 20));
    setTimeout(() => {
      setFluidAmount((prev) => Math.max(30, prev - 20));
    }, 800);
  };

  const resetDefaults = () => {
    setFluidAmount(65);
    setRefractionIndex(24);
    setGlassBlur(14);
    setBevelWidth(26);
    setLensEdgeBending(true);
    setPointerWake(true);
    setCaustics(true);
    setSimulateFallback(false);
  };

  return (
    <Section
      id="liquid-dom"
      eyebrow="Liquid DOM · Andrew Prifer Inspiration"
      title="Where Real HTML Bends Light"
      description={
        <span>
          Inspired by{' '}
          <a
            href="https://aiuxplayground.com/inspirations/liquid-dom-showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sfx-primary underline underline-offset-4"
          >
            Liquid DOM Showcase
          </a>
          . Andrew Prifer built a liquid-glass scene where markup, CSS, and interaction stay real while the GPU shell
          bends light around them. The settings panel below keeps real HTML controls inside the effect, composited live
          via WebGPU HTML-in-Canvas, with a simplified CSS fallback for Safari.
        </span>
      }
    >
      <div className="space-y-6">
        {/* Real-time optical physics controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-sfx-text/80">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary" dot>
              WebGPU HTML-in-Canvas
            </Badge>
            <Badge tone="accent">
              Live DOM Nodes Inside Shader
            </Badge>
            {simulateFallback && (
              <Badge tone="danger">
                CSS Fallback Simulation Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={resetDefaults}>
              <RefreshCw className="h-3.5 w-3.5" /> Reset Optics
            </Button>
            <Button size="sm" variant="neon" onClick={triggerPulse}>
              <Zap className="h-3.5 w-3.5" /> Fluid Shockwave {pulseCount > 0 && `(${pulseCount})`}
            </Button>
          </div>
        </div>

        {/* Physics tuning toolbar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Slider
              label="Wave Warp (fx:liquid)"
              value={fluidAmount}
              onChange={setFluidAmount}
              format={(v) => `${v}%`}
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Slider
              label="Refraction Offset"
              value={refractionIndex}
              onChange={setRefractionIndex}
              min={8}
              max={48}
              format={(v) => `${v}px`}
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Slider
              label="Backdrop Blur"
              value={glassBlur}
              onChange={setGlassBlur}
              min={4}
              max={32}
              format={(v) => `${v}px`}
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Slider
              label="Lens Bevel Curvature"
              value={bevelWidth}
              onChange={setBevelWidth}
              min={10}
              max={44}
              format={(v) => `${v}px`}
            />
          </div>
        </div>

        {/* The Liquid Glass Settings Panel */}
        <Card
          material={simulateFallback ? 'solid' : 'liquid-glass'}
          surface={{
            params: [glassBlur, refractionIndex, 0.14, bevelWidth],
          }}
          fx={simulateFallback ? undefined : 'liquid'}
          fxAmount={simulateFallback ? 0 : fluidAmount / 100}
          padding="lg"
          className={`space-y-8 rounded-3xl ${simulateFallback ? 'sfx-fallback' : ''}`}
        >
          {/* Header inside the liquid glass */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sfx-primary/20 text-sfx-primary ring-1 ring-sfx-primary/40">
                <Droplet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">Liquid Core Settings</h3>
                <p className="text-xs text-sfx-text/60">
                  Every button, slider, and text caret below is live HTML rendered through GPU glass refraction
                </p>
              </div>
            </div>
            <Tabs
              label="Settings Category"
              items={PRESETS}
              value={tab}
              onChange={setTab}
            />
          </div>

          {/* Tab 1: Optics & Fluidity */}
          {tab === 'optics' && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <Input
                  label="Display Profile Nickname"
                  icon={<Sparkles className="h-4 w-4 text-sfx-primary" />}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  hint="Real text cursor and IME selection inside the liquid refraction field."
                />
                <Slider
                  label="Fluid Viscosity Factor"
                  defaultValue={72}
                  format={(v) => `${v} cP`}
                />
                <Slider
                  label="Surface Meniscus Tension"
                  defaultValue={58}
                  format={(v) => `${v} mN/m`}
                />
              </div>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <Switch
                  label="Lens Edge Light Bending"
                  description="Bends text and controls around the perimeter using SDF normal vectors"
                  checked={lensEdgeBending}
                  onChange={setLensEdgeBending}
                />
                <Switch
                  label="Dynamic Pointer Wake"
                  description="Creates a physical fluid swell and depression following the mouse"
                  checked={pointerWake}
                  onChange={setPointerWake}
                />
                <Switch
                  label="Subsurface Caustics"
                  description="Simulates photon concentration along high-refraction glass rims"
                  checked={caustics}
                  onChange={setCaustics}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Engine & Haptics */}
          {tab === 'system' && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <Input
                  label="Cluster Node Address"
                  defaultValue="sfx-liquid-01.local"
                  icon={<Cpu className="h-4 w-4" />}
                />
                <Select
                  label="Target Pipeline Architecture"
                  value={pipelineMode}
                  onChange={setPipelineMode}
                  options={[
                    { value: 'webgpu-native', label: 'WebGPU + HTML-in-Canvas (Native)' },
                    { value: 'css-fallback', label: 'Simplified CSS Glassmorphism (Safari)' },
                  ]}
                />
                <Slider
                  label="VRAM Allocation Budget"
                  value={vramBudget}
                  onChange={setVramBudget}
                  format={(v) => `${v}%`}
                />
              </div>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <Switch
                  label="Haptic Cursor Inertia"
                  description="Spring-based physical inertia for liquid displacement vectors"
                  checked={hapticInertia}
                  onChange={setHapticInertia}
                />
                <Switch
                  label="Auto Quality Adaptation"
                  description="Steps down shader resolution on low-fps devices while keeping HTML crisp"
                  defaultChecked
                />
                <div className="space-y-2 pt-1">
                  <span className="block text-xs font-medium text-sfx-text/70">Engine Flags</span>
                  <div className="space-y-2">
                    <Checkbox label="Synchronous Paint Event Queue" defaultChecked />
                    <Checkbox label="Double-Buffered Frame Atlas" defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: DOM Glass Architecture & Safari Fallback */}
          {tab === 'architecture' && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sfx-primary font-medium text-sm">
                    <Laptop className="h-4 w-4" />
                    <span>How Liquid DOM Works</span>
                  </div>
                  <p className="text-xs leading-relaxed text-sfx-text/70">
                    Unlike standard CSS glass which only blurs whatever is behind an element,{' '}
                    <strong className="text-white">Liquid DOM</strong> composites the live HTML element snapshot into a WebGPU texture via{' '}
                    <code className="text-sfx-primary">drawElementImageToTexture()</code>.
                  </p>
                  <p className="text-xs leading-relaxed text-sfx-text/70">
                    The GPU fragment shader calculates SDF normals, refraction vectors, chromatic dispersion, and fluid noise to bend the live text, buttons, and caret itself.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Safari &amp; Non-WebGPU Fallback Strategy</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-200/80">
                    For Safari, Firefox, or Chrome without the experimental flag, SFX-UI provides an immediate, zero-JS-overhead CSS fallback using{' '}
                    <code className="text-amber-100">backdrop-filter: blur()</code>, specular gradient borders, and native HTML controls without crashing.
                  </p>
                </div>
              </div>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <Switch
                  label="Simulate Safari CSS Fallback on this Card"
                  description="Toggle off WebGPU liquid shader and inspect the CSS backdrop-filter fallback mode"
                  checked={simulateFallback}
                  onChange={setSimulateFallback}
                />
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2 font-mono text-xs">
                  <p className="text-sfx-primary font-semibold">Active Pipeline Diagnostics:</p>
                  <p className="text-sfx-text/60">Mode: {simulateFallback ? 'CSS Backdrop Filter (Safari Mode)' : 'WebGPU HTML-in-Canvas (Liquid DOM)'}</p>
                  <p className="text-sfx-text/60">Warp Displacement: {simulateFallback ? '0px (Flat CSS)' : `${(fluidAmount * 0.26).toFixed(1)}px (Active)`}</p>
                  <p className="text-sfx-text/60">Backdrop Refraction: {simulateFallback ? 'None (Gaussian Blur)' : `${refractionIndex}px (Chromatic)`}</p>
                  <p className="text-sfx-text/60">DOM Tree: 100% Native HTML &amp; Accessible</p>
                </div>
              </div>
            </div>
          )}

          {/* Real interactive footer buttons inside the liquid glass */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 text-xs text-sfx-text/50">
              <Sliders className="h-3.5 w-3.5" />
              <span>Real accessible controls inside GPU liquid shell</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="md" variant="ghost" onClick={resetDefaults}>
                Reset
              </Button>
              <Button size="md" variant="liquid-glass" onClick={triggerPulse}>
                Submerged Action
              </Button>
              <Button size="md" variant="neon" onClick={() => alert('Settings configuration saved!')}>
                Save Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}
