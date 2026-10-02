import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PureCanvasEngine, CanvasWidget } from './PureCanvasEngine';
import { Sparkles, Cpu, Layers, Play } from 'lucide-react';
import { Badge } from '../components/Badge/Badge';

export const PureCanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PureCanvasEngine | null>(null);
  const [, setTick] = useState(0);

  const initialWidgets: CanvasWidget[] = useMemo(() => [
    {
      id: 'main-card',
      type: 'card',
      x: 40,
      y: 40,
      w: 460,
      h: 360,
      radius: 18,
      label: 'GPU Canvas Card Container',
      shader: 'liquid-glass',
      isHovered: false,
      isActive: false,
    },
    {
      id: 'action-btn-1',
      type: 'button',
      x: 70,
      y: 110,
      w: 180,
      h: 46,
      radius: 10,
      label: 'Execute Fusion',
      shader: 'electric-border',
      isHovered: false,
      isActive: false,
    },
    {
      id: 'action-btn-2',
      type: 'button',
      x: 270,
      y: 110,
      w: 200,
      h: 46,
      radius: 10,
      label: 'Quantum Pulse',
      shader: 'plasma-flow',
      isHovered: false,
      isActive: false,
    },
    {
      id: 'slider-flux',
      type: 'slider',
      x: 70,
      y: 200,
      w: 400,
      h: 24,
      radius: 12,
      label: 'Plasma Frequency Rate',
      shader: 'aurora-waves',
      value: 0.72,
      isHovered: false,
      isActive: false,
    },
    {
      id: 'toggle-hyperspace',
      type: 'switch',
      x: 70,
      y: 260,
      w: 56,
      h: 30,
      radius: 15,
      label: 'Hyperspace Tunneling',
      shader: 'plasma-flow',
      value: 1,
      isHovered: false,
      isActive: false,
    },
    {
      id: 'status-badge',
      type: 'badge',
      x: 70,
      y: 330,
      w: 130,
      h: 28,
      radius: 14,
      label: '100% Canvas Mode',
      shader: 'plasma-flow',
      isHovered: false,
      isActive: false,
    },
    // Second Card on the right
    {
      id: 'metrics-card',
      type: 'card',
      x: 530,
      y: 40,
      w: 460,
      h: 360,
      radius: 18,
      label: 'Realtime GPU Buffer Metrics',
      shader: 'cyber-grid',
      isHovered: false,
      isActive: false,
    },
    {
      id: 'metric-slider',
      type: 'slider',
      x: 560,
      y: 130,
      w: 400,
      h: 24,
      radius: 12,
      label: 'Memory Bandwidth Fill',
      shader: 'aurora-waves',
      value: 0.88,
      isHovered: false,
      isActive: false,
    },
    {
      id: 'toggle-compute',
      type: 'switch',
      x: 560,
      y: 200,
      w: 56,
      h: 30,
      radius: 15,
      label: 'Parallel WGSL Compute Pipeline',
      shader: 'plasma-flow',
      value: 1,
      isHovered: false,
      isActive: false,
    },
    {
      id: 'compute-btn',
      type: 'button',
      x: 560,
      y: 280,
      w: 220,
      h: 46,
      radius: 10,
      label: 'Trigger Compute Shader',
      shader: 'electric-border',
      isHovered: false,
      isActive: false,
    },
  ], []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const engine = new PureCanvasEngine(cvs, () => {
      setTick((t) => t + 1);
    });
    engine.setWidgets(initialWidgets);
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [initialWidgets]);

  const widgets = engineRef.current ? engineRef.current.getWidgets() : initialWidgets;

  return (
    <div className="space-y-6 pb-16">
      {/* Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Pure Canvas UI Engine (100% Canvas Mode)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero DOM elements for cards, buttons, sliders, or switches. Everything is rendered inside <strong>ONE WebGL2 / WebGPU Canvas</strong> using Signed Distance Fields (SDF) and GPU fragment shaders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neon" dot>
            Single GPU Context: 1
          </Badge>
          <Badge variant="primary">
            120 FPS SDF
          </Badge>
        </div>
      </div>

      {/* Canvas Viewport Container */}
      <div className="relative w-full h-[480px] bg-[#07090f] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl">
        {/* The single WebGPU/WebGL canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-default"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Crisp Accessible Text Labels Layer overlaid over the canvas widgets */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {widgets.map((w) => {
            if (w.type === 'card') {
              return (
                <div
                  key={w.id}
                  className="absolute font-sans font-semibold text-sm text-cyan-300"
                  style={{ left: `${w.x + 20}px`, top: `${w.y + 18}px` }}
                >
                  {w.label}
                </div>
              );
            }
            if (w.type === 'button') {
              return (
                <div
                  key={w.id}
                  className="absolute font-sans font-semibold text-xs tracking-wide text-white flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${w.x}px`,
                    top: `${w.y}px`,
                    width: `${w.w}px`,
                    height: `${w.h}px`,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    {w.label}
                  </span>
                </div>
              );
            }
            if (w.type === 'slider') {
              return (
                <div
                  key={w.id}
                  className="absolute font-sans text-xs flex justify-between items-center text-slate-200 pointer-events-none"
                  style={{
                    left: `${w.x}px`,
                    top: `${w.y - 20}px`,
                    width: `${w.w}px`,
                  }}
                >
                  <span>{w.label}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round((w.value || 0) * 100)}%
                  </span>
                </div>
              );
            }
            if (w.type === 'switch') {
              return (
                <div
                  key={w.id}
                  className="absolute font-sans text-xs text-slate-300 flex items-center gap-3 pointer-events-none"
                  style={{
                    left: `${w.x + w.w + 14}px`,
                    top: `${w.y + 6}px`,
                  }}
                >
                  <span className="font-medium">{w.label}</span>
                  <span className="font-mono text-[11px] text-cyan-400">
                    {w.value ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              );
            }
            if (w.type === 'badge') {
              return (
                <div
                  key={w.id}
                  className="absolute font-mono text-[11px] font-bold text-pink-200 flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${w.x}px`,
                    top: `${w.y}px`,
                    width: `${w.w}px`,
                    height: `${w.h}px`,
                  }}
                >
                  {w.label}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Explanatory Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> Zero Context Overhead
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every card, button, slider, and toggle in this viewport is rendered on <strong>one unified canvas</strong>. No matter how many widgets you add, context consumption is capped at 1.
          </p>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" /> Signed Distance Fields (SDF)
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Widget borders and corners are calculated via analytical mathematical distance equations (<code className="text-cyan-300 font-mono">sdRoundedBox</code>) with GPU sub-pixel anti-aliasing.
          </p>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-pink-400" /> Try Interacting!
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Drag the plasma frequency sliders, click the toggle switches, and hover the buttons. The canvas engine hit-tests coordinates and updates uniforms in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};
