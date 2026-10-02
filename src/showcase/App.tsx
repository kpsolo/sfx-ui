import React, { useState } from 'react';
import { ShaderProvider } from '../core/ShaderContext';
import { Navbar } from '../components/Navigation/Navbar';
import { ComponentShowcase } from './ComponentShowcase';
import { ShaderStudio } from './ShaderStudio';
import { SystemTokens } from './SystemTokens';
import { PureCanvasView } from '../canvas-ui/PureCanvasView';
import { Sparkles, Code2, Layers, Palette, Terminal, Cpu } from 'lucide-react';
import { Badge } from '../components/Badge/Badge';
import { ErrorBoundary } from '../core/ErrorBoundary';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'components' | 'canvas-ui' | 'studio' | 'tokens'>('components');

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Universal Reactive Navbar */}
      <Navbar
        brand={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold font-mono text-sm shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              SFX
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white">SFX-UI</span>
              <span className="text-[10px] text-cyan-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
                v0.2.0-canvas
              </span>
            </div>
          </div>
        }
        navLinks={[
          {
            label: 'DOM UI Components',
            active: activeTab === 'components',
            onClick: () => setActiveTab('components'),
          },
          {
            label: 'Pure Canvas UI (100% Canvas)',
            active: activeTab === 'canvas-ui',
            onClick: () => setActiveTab('canvas-ui'),
          },
          {
            label: 'Live Shader Studio',
            active: activeTab === 'studio',
            onClick: () => setActiveTab('studio'),
          },
          {
            label: 'Tokens & Architecture',
            active: activeTab === 'tokens',
            onClick: () => setActiveTab('tokens'),
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="neon" shader="electric-border">
              Single GPU Context Active
            </Badge>
          </div>
        }
        shader="liquid-glass"
        shaderOpacity={0.4}
      />

      {/* Hero Header */}
      <header className="relative isolate px-6 pt-10 pb-8 max-w-7xl mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cutting-Edge GPU Architecture • Hybrid DOM & Pure Canvas UI</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          GPU Shaders on <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">Every Single UI Element</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Choose between <strong>DOM-Coordinated Unified Canvas</strong> (semantic accessibility + 1 GPU context) or 
          <strong> Pure Canvas UI Mode</strong> (100% rendered inside Canvas with Signed Distance Fields).
        </p>

        {/* Tab Switcher Pills */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('components')}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'components' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-semibold' : 'text-slate-400 hover:text-white'}
              `}
            >
              <Layers className="w-3.5 h-3.5" />
              DOM UI Components
            </button>
            <button
              onClick={() => setActiveTab('canvas-ui')}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'canvas-ui' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'text-slate-400 hover:text-white'}
              `}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Pure Canvas UI (100% Canvas)
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'studio' ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 font-semibold' : 'text-slate-400 hover:text-white'}
              `}
            >
              <Code2 className="w-3.5 h-3.5" />
              Live Shader Studio
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'tokens' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/40 font-semibold' : 'text-slate-400 hover:text-white'}
              `}
            >
              <Palette className="w-3.5 h-3.5" />
              Tokens & Architecture
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        {activeTab === 'components' && <ComponentShowcase />}
        {activeTab === 'canvas-ui' && <PureCanvasView />}
        {activeTab === 'studio' && <ShaderStudio />}
        {activeTab === 'tokens' && <SystemTokens />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-mono space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>SFX-UI • Unified Canvas & Pure-Canvas SDF Engine</span>
        </div>
        <div>
          Zero WebGL Context Limits • Single Viewport Multi-Scissor • WebGPU-Ready
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ShaderProvider>
        <AppContent />
      </ShaderProvider>
    </ErrorBoundary>
  );
};

export default App;
