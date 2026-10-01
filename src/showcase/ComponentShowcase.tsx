import React, { useState } from 'react';
import { ShaderPreset } from '../core/types';
import { SHADER_PRESET_NAMES } from '../shaders/presets';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Textarea } from '../components/Input/Textarea';
import { Card } from '../components/Card/Card';
import { Switch } from '../components/Switch/Switch';
import { Slider } from '../components/Slider/Slider';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { Badge } from '../components/Badge/Badge';
import { Progress } from '../components/Progress/Progress';
import { Modal } from '../components/Modal/Modal';
import { Tabs } from '../components/Tabs/Tabs';
import { Dropdown } from '../components/Dropdown/Dropdown';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { Avatar } from '../components/Avatar/Avatar';
import {
  Sparkles,
  Zap,
  Search,
  Lock,
  Layers,
  Send,
  Eye,
  Sliders,
  Settings,
  Bell,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const ComponentShowcase: React.FC = () => {
  // Global preset selector for the showcase demo
  const [globalPreset, setGlobalPreset] = useState<ShaderPreset>('liquid-glass');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sliderVal, setSliderVal] = useState(65);
  const [switchVal, setSwitchVal] = useState(true);
  const [checkVal, setCheckVal] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dropdownVal, setDropdownVal] = useState('opt-1');

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-16">
      {/* Preset Switcher Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Global Shader Preset Control</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test how standard components adapt when dynamically swapping GPU fragment shaders in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Active Preset:</label>
          <select
            value={globalPreset}
            onChange={(e) => setGlobalPreset(e.target.value as ShaderPreset)}
            className="bg-slate-950 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          >
            {SHADER_PRESET_NAMES.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} — {preset.description.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. BUTTONS SECTION */}
      <section className="space-y-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Buttons with Shader Surfaces & Borders
            </h3>
            <p className="text-xs text-slate-400">Buttons with liquid refraction, high-voltage plasma borders, or click-reactive shockwaves.</p>
          </div>
          <Badge variant="primary">Semantic &lt;button&gt;</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Primary (Liquid Glass)</span>
            <Button variant="primary" shader={globalPreset} iconLeft={<Sparkles className="w-4 h-4" />}>
              Shader Button
            </Button>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Neon Plasma Edge</span>
            <Button variant="neon" shader="electric-border" shaderTarget="border" iconRight={<Zap className="w-4 h-4" />}>
              Electric Trace
            </Button>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Hologram Scanline</span>
            <Button variant="outline" shader="hologram-scan" iconLeft={<Eye className="w-4 h-4" />}>
              Holo Button
            </Button>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Danger State</span>
            <Button variant="danger" shader="plasma-flow" iconRight={<AlertTriangle className="w-4 h-4" />}>
              Terminate Process
            </Button>
          </div>
        </div>
      </section>

      {/* 2. FORMS & INPUTS SECTION */}
      <section className="space-y-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" /> Inputs, Textarea & Form Controls
            </h3>
            <p className="text-xs text-slate-400">Full accessibility with keyboard focus triggers that illuminate GPU shader borders.</p>
          </div>
          <Badge variant="neon">Focus-Reactive</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" shader={globalPreset} shaderOpacity={0.4}>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-cyan-300">Form Input Suite</h4>
              <Input
                label="Search Vector Store"
                placeholder="Query neural embeddings..."
                iconLeft={<Search className="w-4 h-4" />}
                shader="electric-border"
                helperText="Click or focus to watch the border shader pulse."
              />
              <Input
                label="API Token Key"
                type="password"
                defaultValue="sk-antigravity-9941x"
                iconLeft={<Lock className="w-4 h-4" />}
                shader="hologram-scan"
              />
              <Dropdown
                label="Hardware Accelerator"
                options={[
                  { value: 'opt-1', label: 'WebGL 2.0 (High Performance)' },
                  { value: 'opt-2', label: 'WebGPU (Experimental Native)' },
                  { value: 'opt-3', label: 'CSS Canvas Fallback' },
                ]}
                value={dropdownVal}
                onChange={setDropdownVal}
                shader="liquid-glass"
              />
            </div>
          </Card>

          <Card variant="cyber" shader="cyber-grid" shaderOpacity={0.6}>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-pink-300">Prompt & Dispatch</h4>
              <Textarea
                label="Custom GLSL Specification"
                rows={3}
                placeholder="vec4 color = mix(u_color_primary, u_color_accent, sin(u_time));"
                shader="electric-border"
                helperText="Focus inside to trigger perimeter plasma current."
              />
              <div className="flex items-center justify-between pt-2">
                <Switch
                  label="Hardware Acceleration"
                  description="Offload shaders to dedicated GPU"
                  checked={switchVal}
                  onChange={setSwitchVal}
                  shader="plasma-flow"
                />
                <Button variant="neon" shader="aurora-waves" iconRight={<Send className="w-3.5 h-3.5" />}>
                  Dispatch
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. INTERACTIVE CONTROLS: SLIDERS, SWITCHES, CHECKBOXES */}
      <section className="space-y-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" /> Dynamic Value Controls
            </h3>
            <p className="text-xs text-slate-400">Sliders with live wave tracks, switches with plasma toggles, and reactive badges.</p>
          </div>
          <Badge variant="success">Interactive Lerp</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sliders Card */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Shader Wave Sliders</h4>
            <Slider
              label="Simulation Frequency"
              value={sliderVal}
              onChange={setSliderVal}
              shader="aurora-waves"
            />
            <Slider
              label="Photon Particle Density"
              defaultValue={82}
              shader="plasma-flow"
              shaderSpeed={1.8}
            />
          </div>

          {/* Toggles & Checkboxes Card */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Energy Toggles & Checks</h4>
            <div className="space-y-3">
              <Switch
                label="Chromatic Dispersion"
                description="Refract RGB channels"
                defaultChecked={true}
                shader="plasma-flow"
              />
              <Checkbox
                label="Multi-Scissor Batching"
                description="Zero WebGL context loss"
                checked={checkVal}
                onChange={setCheckVal}
                shader="electric-border"
              />
              <Checkbox
                label="Hardware Fallback Ready"
                description="Pure CSS fallback if unaccelerated"
                defaultChecked={true}
                shader="electric-border"
              />
            </div>
          </div>

          {/* Badges, Avatars & Tooltips */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Auras, Badges & Avatars</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" shader="plasma-flow" dot>Online</Badge>
              <Badge variant="neon" shader="aurora-waves">Quantum Active</Badge>
              <Badge variant="warning" shader="matrix-dither">Dithered</Badge>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Tooltip content="Lead Graphics Architect" position="top" shader="hologram-scan">
                <Avatar
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Architect"
                  status="online"
                  shader="electric-border"
                  size="lg"
                />
              </Tooltip>

              <Tooltip content="Autonomous Agent Unit" position="bottom" shader="hologram-scan">
                <Avatar
                  fallback="AGY"
                  status="busy"
                  shader="aurora-waves"
                  size="lg"
                />
              </Tooltip>

              <div className="text-xs text-slate-400">
                Hover over avatars & badges to inspect orbiting shader aura rings!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NAVIGATION, TABS & PROGRESS BARS */}
      <section className="space-y-4">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Navigation, Tabs & Progress Bars
            </h3>
            <p className="text-xs text-slate-400">Complex layouts with liquid active tab indicators and energy beam progress indicators.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Liquid Segmented Tabs</h4>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Architecture', icon: <Layers className="w-3.5 h-3.5" /> },
                { id: 'benchmarks', label: 'Performance', icon: <Zap className="w-3.5 h-3.5" /> },
                { id: 'diagnostics', label: 'Diagnostics', icon: <CheckCircle className="w-3.5 h-3.5" /> },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
              shader="liquid-glass"
            />
            <div className="p-3 bg-slate-950/60 rounded-lg text-xs text-slate-300 border border-slate-800/80 font-mono">
              Active View: <span className="text-cyan-400 font-semibold">{activeTab.toUpperCase()}</span> — indicator smoothly animates GPU refraction.
            </div>
          </div>

          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Liquid Energy Progress</h4>
            <Progress
              label="Shader Pipeline Buffer Fill"
              value={sliderVal}
              showValue
              shader="aurora-waves"
              size="md"
            />
            <Progress
              label="GPU Thread Utilization"
              value={92}
              showValue
              shader="plasma-flow"
              size="lg"
            />
          </div>
        </div>
      </section>

      {/* 5. MODAL DIALOG PREVIEW */}
      <section className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" /> Modal Dialog with Holographic Backdrop
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-screen reactive backdrop shader combined with an electric perimeter frame.
          </p>
        </div>
        <Button
          variant="primary"
          shader="electric-border"
          onClick={() => setIsModalOpen(true)}
          iconLeft={<Sparkles className="w-4 h-4" />}
        >
          Open Shader Modal
        </Button>
      </section>

      {/* The Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Shader-Driven Component Dialog"
        description="Every boundary and backdrop surface rendered via real-time WebGL GLSL."
        shader="electric-border"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="neon" shader="aurora-waves" onClick={() => setIsModalOpen(false)}>
              Confirm Execution
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-300 leading-relaxed">
            Notice how the backdrop features an interactive cyber grid perspective, while the dialog perimeter
            is traced with an animated electric plasma beam. The keyboard (<kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400 font-mono">Escape</kbd>)
            and focus traps remain completely intact!
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300">
            ✓ ARIA dialog role active<br/>
            ✓ GPU memory freed on unmount<br/>
            ✓ Zero WebGL context leaks
          </div>
        </div>
      </Modal>
    </div>
  );
};
