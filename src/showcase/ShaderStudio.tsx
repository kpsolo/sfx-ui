import React, { useState } from 'react';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { Input } from '../components/Input/Input';
import { Slider } from '../components/Slider/Slider';
import { Badge } from '../components/Badge/Badge';
import { Avatar } from '../components/Avatar/Avatar';
import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../shaders/common';
import { Code2, Play, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';

const STARTER_SHADERS = {
  voronoi: `// Voronoi Cellular Crystallography
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  if (sdRoundedBox(pixelPos, halfSize, radius) > 0.0) discard;
  
  vec2 p = uv * 6.0;
  vec2 i_st = floor(p);
  vec2 f_st = fract(p);
  
  float m_dist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash22(i_st + neighbor);
      point = 0.5 + 0.5 * sin(u_time * 2.0 + 6.2831 * point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      m_dist = min(m_dist, dist);
    }
  }
  
  vec3 col = mix(u_color_primary.rgb, u_color_accent.rgb, m_dist);
  col += vec3(smoothstep(0.08, 0.0, m_dist) * 0.8);
  col += u_color_accent.rgb * u_hover * 0.3;
  
  gl_FragColor = vec4(col, 0.95);
}`,

  hyperspace: `// Hyperspace Radial Tunnel
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  if (sdRoundedBox(pixelPos, halfSize, radius) > 0.0) discard;
  
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  
  // Interactive mouse center
  p -= (u_mouse - 0.5) * u_hover * 0.4;
  
  float r = length(p);
  float a = atan(p.y, p.x);
  
  float tunnel = 0.3 / max(r, 0.01) + u_time * 2.0;
  float rings = sin(tunnel * 6.0) * 0.5 + 0.5;
  float spokes = sin(a * 12.0) * 0.5 + 0.5;
  
  vec3 col = mix(u_color_primary.rgb, u_color_accent.rgb, sin(tunnel) * 0.5 + 0.5);
  col *= (rings * spokes * 1.5 + 0.2);
  col += u_color_accent.rgb * (0.05 / max(r, 0.02));
  
  gl_FragColor = vec4(col, 1.0);
}`,

  firePlasma: `// Solar Flame & Fluid Turbulance
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  if (sdRoundedBox(pixelPos, halfSize, radius) > 0.0) discard;
  
  vec2 q = uv;
  q.y += u_time * 0.8;
  
  float f = fbm(q * 4.0);
  f = fbm(uv * 3.0 + f * 2.0 - vec2(0.0, u_time * 0.5));
  
  vec3 col = mix(u_color_bg.rgb, u_color_accent.rgb, f * 1.2);
  col = mix(col, vec3(1.0, 0.9, 0.3), pow(f, 3.0));
  col += u_color_primary.rgb * u_hover * 0.35;
  
  gl_FragColor = vec4(col, 0.95);
}`,
};

export const ShaderStudio: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof STARTER_SHADERS>('voronoi');
  const [glslCode, setGlslCode] = useState(STARTER_SHADERS.voronoi);
  const [previewTarget, setPreviewTarget] = useState<'button' | 'card' | 'input' | 'slider' | 'badge' | 'avatar'>('card');
  const [shaderSpeed, setShaderSpeed] = useState(1.0);
  const [copied, setCopied] = useState(false);

  const handleTemplateChange = (tpl: keyof typeof STARTER_SHADERS) => {
    setSelectedTemplate(tpl);
    setGlslCode(STARTER_SHADERS[tpl]);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(glslCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Code2 className="w-6 h-6 text-cyan-400" /> Live Shader Studio & GLSL Editor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Write custom GLSL fragment code with instant hot-reload and bind it directly to any standard UI component.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyCode}
            iconLeft={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied GLSL!' : 'Copy Shader'}
          </Button>
          <Button
            variant="neon"
            size="sm"
            onClick={() => setGlslCode(STARTER_SHADERS[selectedTemplate])}
            iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Code Editor Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Starter Presets:
            </span>
            <div className="flex gap-2">
              {(['voronoi', 'hyperspace', 'firePlasma'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => handleTemplateChange(key)}
                  className={`
                    px-2.5 py-1 text-xs rounded-md font-mono transition-colors
                    ${selectedTemplate === key ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'}
                  `}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#070a10] shadow-2xl">
            <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>fragmentShader.glsl</span>
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Compiled
              </span>
            </div>
            <textarea
              value={glslCode}
              onChange={(e) => setGlslCode(e.target.value)}
              rows={22}
              className="w-full bg-transparent p-4 font-mono text-xs text-cyan-100 focus:outline-none resize-none leading-relaxed selection:bg-cyan-500/30"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400" /> Target Component Preview
              </h3>
              <select
                value={previewTarget}
                onChange={(e) => setPreviewTarget(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="button">Button Element</option>
                <option value="card">Card / Panel</option>
                <option value="input">Input Element</option>
                <option value="slider">Slider Track</option>
                <option value="badge">Badge Pill</option>
                <option value="avatar">Avatar Ring</option>
              </select>
            </div>

            {/* Component Mounting Stage */}
            <div className="min-h-[220px] bg-slate-950/80 rounded-xl border border-slate-800/80 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              {previewTarget === 'button' && (
                <Button
                  variant="primary"
                  size="lg"
                  shader="custom"
                  customFragmentShader={glslCode}
                  shaderSpeed={shaderSpeed}
                  iconLeft={<Sparkles className="w-4 h-4" />}
                >
                  Custom Shader Button
                </Button>
              )}

              {previewTarget === 'card' && (
                <Card
                  variant="glass"
                  shader="custom"
                  customFragmentShader={glslCode}
                  shaderSpeed={shaderSpeed}
                  className="w-full"
                >
                  <h4 className="text-sm font-bold text-white">Quantum Card Container</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Every fragment calculated on GPU with interactive cursor refraction and SDF corners.
                  </p>
                </Card>
              )}

              {previewTarget === 'input' && (
                <div className="w-full space-y-3">
                  <Input
                    label="Neural Field Input"
                    placeholder="Interact to see custom shader border..."
                    shader="custom"
                    customFragmentShader={glslCode}
                    shaderSpeed={shaderSpeed}
                    defaultValue="Interactive GLSL Binding"
                  />
                </div>
              )}

              {previewTarget === 'slider' && (
                <div className="w-full">
                  <Slider
                    label="Active Particle Wave"
                    defaultValue={70}
                    shader="custom"
                    customFragmentShader={glslCode}
                    shaderSpeed={shaderSpeed}
                  />
                </div>
              )}

              {previewTarget === 'badge' && (
                <Badge
                  variant="neon"
                  shader="custom"
                  customFragmentShader={glslCode}
                  shaderSpeed={shaderSpeed}
                  className="px-4 py-1 text-sm"
                  dot
                >
                  Custom Shader Aura
                </Badge>
              )}

              {previewTarget === 'avatar' && (
                <Avatar
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  size="xl"
                  shader="custom"
                  customFragmentShader={glslCode}
                  shaderSpeed={shaderSpeed}
                  status="online"
                />
              )}
            </div>

            {/* Live Tweak Sliders */}
            <div className="space-y-4 pt-2">
              <Slider
                label="Animation Speed Multiplier"
                min={0}
                max={3}
                step={0.1}
                value={shaderSpeed}
                onChange={setShaderSpeed}
                disableShader
              />
            </div>
          </div>

          {/* Usage Snippet Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-2">
            <span className="text-slate-400 block font-sans text-xs font-semibold">How to use in React:</span>
            <pre className="text-cyan-300 overflow-x-auto p-2 bg-slate-950 rounded-lg">
{`<${previewTarget.charAt(0).toUpperCase() + previewTarget.slice(1)}
  shader="custom"
  customFragmentShader={myGlslCode}
  shaderSpeed={${shaderSpeed}}
>
  ...
</${previewTarget.charAt(0).toUpperCase() + previewTarget.slice(1)}>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
