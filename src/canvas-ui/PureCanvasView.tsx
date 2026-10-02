import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PureCanvasEngine, CanvasWidget } from './PureCanvasEngine';
import { Sparkles, Cpu, Layers, Play, Zap, Activity, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/Badge/Badge';

export const PureCanvasView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PureCanvasEngine | null>(null);
  const [, setTick] = useState(0);

  // Live action feed & telemetry state
  const [telemetry, setTelemetry] = useState<{
    lastAction: string;
    actionTime: string;
    fusionClicks: number;
    pulseClicks: number;
    computePasses: number;
    plasmaFrequency: number;
    memoryBandwidth: number;
    hyperspaceEnabled: boolean;
    computeEnabled: boolean;
  }>({
    lastAction: 'Canvas Engine Initialized — 1 GPU Context Ready',
    actionTime: '00:00:00',
    fusionClicks: 0,
    pulseClicks: 0,
    computePasses: 0,
    plasmaFrequency: 0.72,
    memoryBandwidth: 0.88,
    hyperspaceEnabled: true,
    computeEnabled: true,
  });

  const getWidgetsForWidth = useCallback((width: number): CanvasWidget[] => {
    const isTwoCol = width >= 900;

    if (isTwoCol) {
      const cardW = Math.floor((width - 72) / 2);
      const cardH = 390;
      const card1X = 24;
      const card2X = 24 + cardW + 24;
      const cardY = 24;
      const btnW = Math.max(120, Math.floor((cardW - 60) / 2));

      return [
        // Card 1
        {
          id: 'main-card',
          type: 'card',
          x: card1X,
          y: cardY,
          w: cardW,
          h: cardH,
          radius: 18,
          label: 'GPU Canvas Card Container (Card 1)',
          shader: 'liquid-glass',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'action-btn-1',
          type: 'button',
          x: card1X + 24,
          y: cardY + 65,
          w: btnW,
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
          x: card1X + 24 + btnW + 12,
          y: cardY + 65,
          w: btnW,
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
          x: card1X + 24,
          y: cardY + 165,
          w: cardW - 48,
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
          x: card1X + 24,
          y: cardY + 235,
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
          x: card1X + 24,
          y: cardY + 315,
          w: 140,
          h: 28,
          radius: 14,
          label: '100% Canvas Mode',
          shader: 'plasma-flow',
          isHovered: false,
          isActive: false,
        },
        // Card 2
        {
          id: 'metrics-card',
          type: 'card',
          x: card2X,
          y: cardY,
          w: cardW,
          h: cardH,
          radius: 18,
          label: 'Realtime GPU Buffer Metrics (Card 2)',
          shader: 'cyber-grid',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'metric-slider',
          type: 'slider',
          x: card2X + 24,
          y: cardY + 75,
          w: cardW - 48,
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
          x: card2X + 24,
          y: cardY + 145,
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
          x: card2X + 24,
          y: cardY + 215,
          w: cardW - 48,
          h: 46,
          radius: 10,
          label: 'Trigger Compute Shader Pass',
          shader: 'electric-border',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'metrics-badge',
          type: 'badge',
          x: card2X + 24,
          y: cardY + 315,
          w: 150,
          h: 28,
          radius: 14,
          label: 'SDF GPU Sub-Pixel AA',
          shader: 'plasma-flow',
          isHovered: false,
          isActive: false,
        },
      ];
    } else {
      // Single column responsive layout
      const cardW = width - 40;
      return [
        {
          id: 'main-card',
          type: 'card',
          x: 20,
          y: 20,
          w: cardW,
          h: 410,
          radius: 18,
          label: 'Unified Canvas Controls',
          shader: 'liquid-glass',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'action-btn-1',
          type: 'button',
          x: 36,
          y: 75,
          w: Math.floor((cardW - 48) / 2),
          h: 44,
          radius: 10,
          label: 'Execute Fusion',
          shader: 'electric-border',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'action-btn-2',
          type: 'button',
          x: 36 + Math.floor((cardW - 48) / 2) + 12,
          y: 75,
          w: Math.floor((cardW - 48) / 2),
          h: 44,
          radius: 10,
          label: 'Quantum Pulse',
          shader: 'plasma-flow',
          isHovered: false,
          isActive: false,
        },
        {
          id: 'slider-flux',
          type: 'slider',
          x: 36,
          y: 165,
          w: cardW - 32,
          h: 24,
          radius: 12,
          label: 'Plasma Frequency Rate',
          shader: 'aurora-waves',
          value: 0.72,
          isHovered: false,
          isActive: false,
        },
        {
          id: 'metric-slider',
          type: 'slider',
          x: 36,
          y: 235,
          w: cardW - 32,
          h: 24,
          radius: 12,
          label: 'Memory Bandwidth Fill',
          shader: 'aurora-waves',
          value: 0.88,
          isHovered: false,
          isActive: false,
        },
        {
          id: 'toggle-hyperspace',
          type: 'switch',
          x: 36,
          y: 300,
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
          x: 36,
          y: 355,
          w: 140,
          h: 28,
          radius: 14,
          label: '100% Canvas Mode',
          shader: 'plasma-flow',
          isHovered: false,
          isActive: false,
        },
      ];
    }
  }, []);

  const [widgets, setWidgets] = useState<CanvasWidget[]>([]);

  // Initialize engine and set up resize observer
  useEffect(() => {
    const cvs = canvasRef.current;
    const container = containerRef.current;
    if (!cvs || !container) return;

    const width = container.clientWidth || 1000;
    const initial = getWidgetsForWidth(width);
    setWidgets(initial);

    const engine = new PureCanvasEngine(cvs, () => {
      setTick((t) => t + 1);
    });
    engine.setWidgets(initial);

    // Register live user interaction telemetry
    engine.onWidgetAction = (id, val, _type) => {
      const now = new Date().toLocaleTimeString();
      setTelemetry((prev) => {
        if (id === 'action-btn-1') {
          return {
            ...prev,
            lastAction: `⚡ Execute Fusion Fired! High-energy burst #${prev.fusionClicks + 1}`,
            actionTime: now,
            fusionClicks: prev.fusionClicks + 1,
          };
        }
        if (id === 'action-btn-2') {
          return {
            ...prev,
            lastAction: `⚛ Quantum Pulse Triggered! Coherence pulse #${prev.pulseClicks + 1}`,
            actionTime: now,
            pulseClicks: prev.pulseClicks + 1,
          };
        }
        if (id === 'compute-btn') {
          return {
            ...prev,
            lastAction: `🔥 WGSL Compute Pass Executed on 1,048,576 particles! Pass #${prev.computePasses + 1}`,
            actionTime: now,
            computePasses: prev.computePasses + 1,
          };
        }
        if (id === 'slider-flux' && val !== undefined) {
          return {
            ...prev,
            lastAction: `🎛 Plasma Frequency adjusted to ${(val * 144).toFixed(1)} GHz (${Math.round(val * 100)}%)`,
            actionTime: now,
            plasmaFrequency: val,
          };
        }
        if (id === 'metric-slider' && val !== undefined) {
          return {
            ...prev,
            lastAction: `📊 Memory Bandwidth throttled to ${(val * 850).toFixed(0)} GB/s (${Math.round(val * 100)}%)`,
            actionTime: now,
            memoryBandwidth: val,
          };
        }
        if (id === 'toggle-hyperspace') {
          const isEnabled = val === 1;
          return {
            ...prev,
            lastAction: `🚀 Hyperspace Tunneling ${isEnabled ? 'ENABLED (Warp Field Engaged)' : 'DISABLED (Sub-light sub-warp)'}`,
            actionTime: now,
            hyperspaceEnabled: isEnabled,
          };
        }
        if (id === 'toggle-compute') {
          const isEnabled = val === 1;
          return {
            ...prev,
            lastAction: `⚙ Parallel WGSL Compute ${isEnabled ? 'ONLINE (Direct HW Compute)' : 'STANDBY'}`,
            actionTime: now,
            computeEnabled: isEnabled,
          };
        }
        return prev;
      });
    };

    engineRef.current = engine;

    // Handle responsive resizing
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        if (newW > 0) {
          const updated = getWidgetsForWidth(newW);
          // Preserve existing values when resizing
          if (engineRef.current) {
            const current = engineRef.current.getWidgets();
            for (const u of updated) {
              const prev = current.find((c) => c.id === u.id);
              if (prev && prev.value !== undefined) {
                u.value = prev.value;
              }
            }
            engineRef.current.setWidgets(updated);
            setWidgets([...updated]);
          }
        }
      }
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [getWidgetsForWidth]);

  const activeWidgets = engineRef.current ? engineRef.current.getWidgets() : widgets;

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
            Zero DOM elements for cards, buttons, sliders, or switches. Everything is rendered inside <strong>ONE WebGL2 / WebGPU Canvas</strong> using Signed Distance Fields (SDF), custom shader fills, and interactive SDF knobs.
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
      <div
        ref={containerRef}
        className="relative w-full h-[470px] bg-[#07090f] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl select-none"
      >
        {/* The single WebGPU/WebGL canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Crisp Accessible Text Labels Layer overlaid over the canvas widgets */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {activeWidgets.map((w) => {
            if (w.type === 'card') {
              return (
                <div
                  key={w.id}
                  className="absolute font-sans font-semibold text-sm text-cyan-300"
                  style={{ left: `${w.x + 22}px`, top: `${w.y + 20}px` }}
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
                  <span className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    {w.label}
                  </span>
                </div>
              );
            }
            if (w.type === 'slider') {
              const pct = Math.round((w.value || 0) * 100);
              return (
                <div
                  key={w.id}
                  className="absolute font-sans text-xs flex justify-between items-center text-slate-200 pointer-events-none"
                  style={{
                    left: `${w.x}px`,
                    top: `${w.y - 22}px`,
                    width: `${w.w}px`,
                  }}
                >
                  <span className="font-medium text-slate-300">{w.label}</span>
                  <span className="font-mono text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">
                    {pct}%
                  </span>
                </div>
              );
            }
            if (w.type === 'switch') {
              const isEnabled = Boolean(w.value);
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
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${
                      isEnabled
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900/60 text-slate-500 border-slate-700/40'
                    }`}
                  >
                    {isEnabled ? 'ENABLED' : 'DISABLED'}
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

      {/* Live Canvas Interaction HUD & Telemetry */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-md space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Live Canvas GPU Telemetry & Action Bus</h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Last Dispatched:</span>
            <span className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{telemetry.actionTime}</span>
          </div>
        </div>

        {/* Real-time event ticker */}
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <div className="text-xs font-mono text-cyan-300 truncate">
            {telemetry.lastAction}
          </div>
        </div>

        {/* Live metric counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fusion Triggers</span>
            </div>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
              {telemetry.fusionClicks}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Quantum Pulses</span>
            </div>
            <div className="text-lg font-bold font-mono text-pink-300 mt-1">
              {telemetry.pulseClicks}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Compute Passes</span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-300 mt-1">
              {telemetry.computePasses}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plasma Clock</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
              {(telemetry.plasmaFrequency * 144).toFixed(1)} <span className="text-xs font-normal text-slate-400">GHz</span>
            </div>
          </div>
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
            Widget borders and corners are calculated via analytical mathematical distance equations (<code className="text-cyan-300 font-mono">sdRoundedBox</code>) with GPU sub-pixel anti-aliasing and interactive SDF thumb knobs.
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
