import React from 'react';
import { useShaderSystem } from '../core/ShaderContext';
import { Palette, Cpu, Sliders, ShieldCheck } from 'lucide-react';
import { Slider } from '../components/Slider/Slider';
import { Switch } from '../components/Switch/Switch';

export const SystemTokens: React.FC = () => {
  const { tokens, setTokens, shadersEnabled, setShadersEnabled, activeContextCount } = useShaderSystem();

  const handleColorChange = (key: keyof typeof tokens.colors, hex: string) => {
    setTokens((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: hex,
      },
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-16">
      {/* Overview & Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Cpu className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-wider">Active WebGL Contexts</span>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{activeContextCount}</div>
          <p className="text-xs text-slate-400">
            Automatic RAF lifecycle pausing offscreen. Zero memory leakage.
          </p>
        </div>

        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-wider">A11y & Motion Guard</span>
          </div>
          <div className="text-xl font-bold text-white">
            {tokens.reducedMotion ? 'Reduced Motion (Active)' : 'Standard Motion (60 FPS)'}
          </div>
          <p className="text-xs text-slate-400">
            Synchronized with user OS media preferences.
          </p>
        </div>

        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-pink-400">
            <Sliders className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-wider">Global Shader Master</span>
          </div>
          <div className="text-xl font-bold text-white">
            {shadersEnabled ? 'GPU Shaders Enabled' : 'Pure CSS Fallback'}
          </div>
          <p className="text-xs text-slate-400">
            Toggle hardware acceleration or instant CSS tokens fallback.
          </p>
        </div>
      </div>

      {/* Live Color Tokens Palette */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-cyan-400" /> Live Design System Color Tokens
            </h3>
            <p className="text-xs text-slate-400">
              Modifying these tokens instantly updates uniforms (<code className="font-mono text-cyan-300">u_color_primary</code>, <code className="font-mono text-cyan-300">u_color_accent</code>, etc.) across all active shaders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(tokens.colors).map(([key, hex]) => (
            <div key={key} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase">{key}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => handleColorChange(key as any, e.target.value)}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-slate-200">{hex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-base font-semibold text-white">System Dynamics & Accessibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Switch
            label="Master Shader Toggle"
            description="Enable or disable GPU shader rendering globally"
            checked={shadersEnabled}
            onChange={setShadersEnabled}
            disableShader
          />
          <Switch
            label="Prefers Reduced Motion"
            description="Forces static states and halts animation time loop"
            checked={tokens.reducedMotion}
            onChange={(val) => setTokens((p) => ({ ...p, reducedMotion: val }))}
            disableShader
          />
          <Slider
            label="Global Animation Speed"
            min={0}
            max={3}
            step={0.1}
            value={tokens.globalSpeed}
            onChange={(val) => setTokens((p) => ({ ...p, globalSpeed: val }))}
            disableShader
          />
        </div>
      </div>

      {/* Uniform Protocol Reference */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">GLSL Uniform Protocol Contract</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Uniform Name</th>
                <th className="py-2 px-3">GLSL Type</th>
                <th className="py-2 px-3">Value Range</th>
                <th className="py-2 px-3">Semantic Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_time</td>
                <td className="py-2.5 px-3">float</td>
                <td className="py-2.5 px-3">0.0 &rarr; &infin;</td>
                <td className="py-2.5 px-3 font-sans">Continuous elapsed animation clock in seconds.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_resolution</td>
                <td className="py-2.5 px-3">vec2</td>
                <td className="py-2.5 px-3">[w, h] px</td>
                <td className="py-2.5 px-3 font-sans">Physical pixel resolution with device pixel ratio scaling.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_mouse</td>
                <td className="py-2.5 px-3">vec2</td>
                <td className="py-2.5 px-3">[0.0, 1.0]</td>
                <td className="py-2.5 px-3 font-sans">Normalized mouse position relative to component bounding box.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_hover</td>
                <td className="py-2.5 px-3">float</td>
                <td className="py-2.5 px-3">0.0 &rarr; 1.0</td>
                <td className="py-2.5 px-3 font-sans">Smoothly lerped hover factor (0.0 idle, 1.0 hovered).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_active</td>
                <td className="py-2.5 px-3">float</td>
                <td className="py-2.5 px-3">0.0 &rarr; 1.0</td>
                <td className="py-2.5 px-3 font-sans">Click / pointerdown interaction factor.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_color_primary</td>
                <td className="py-2.5 px-3">vec4</td>
                <td className="py-2.5 px-3">[r, g, b, a]</td>
                <td className="py-2.5 px-3 font-sans">Brand primary design token color.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_color_accent</td>
                <td className="py-2.5 px-3">vec4</td>
                <td className="py-2.5 px-3">[r, g, b, a]</td>
                <td className="py-2.5 px-3 font-sans">Neon accent glow design token color.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-400">u_corner_radius</td>
                <td className="py-2.5 px-3">float</td>
                <td className="py-2.5 px-3">0.0 &rarr; N px</td>
                <td className="py-2.5 px-3 font-sans">Pixel corner radius for Signed Distance Field (SDF) bounds clipping.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
