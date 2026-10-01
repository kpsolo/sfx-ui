import React, { useState } from 'react';
import { ShaderProvider } from '../core/ShaderContext';
import { Navbar } from '../components/Navigation/Navbar';
import { ComponentShowcase } from './ComponentShowcase';
import { ShaderStudio } from './ShaderStudio';
import { SystemTokens } from './SystemTokens';
import { Sparkles, Code2, Layers, Palette, Terminal } from 'lucide-react';
import { Badge } from '../components/Badge/Badge';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'components' | 'studio' | 'tokens'>('components');

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
                v0.1.0-alpha
              </span>
            </div>
          </div>
        }
        navLinks={[
          {
            label: 'UI Components',
            active: activeTab === 'components',
            onClick: () => setActiveTab('components'),
          },
          {
            label: 'Live Shader Studio',
            active: activeTab === 'studio',
            onClick: () => setActiveTab('studio'),
          },
          {
            label: 'Design Tokens & Architecture',
            active: activeTab === 'tokens',
            onClick: () => setActiveTab('tokens'),
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="neon" shader="electric-border">
              WebGL 2.0 Active
            </Badge>
          </div>
        }
        shader="liquid-glass"
        shaderOpacity={0.4}
      />

      {/* Hero Header */}
      <header className="relative isolate px-6 pt-12 pb-10 max-w-7xl mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shader-First Design System • Semantic DOM Integrity</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Standard UI Elements with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">GPU Shaders</span> on Every Part
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Every button, input, card, dialog, toggle, slider, badge, and tab can host real-time WebGL fragment shaders.
          Full accessibility and screen reader support with zero WebGL context limits.
        </p>

        {/* Tab Switcher Pills */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('components')}
              className={`
                px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'components' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-semibold' : 'text-slate-400 hover:text-white'}
              `}
            >
              <Layers className="w-3.5 h-3.5" />
              Components Showcase
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
        {activeTab === 'studio' && <ShaderStudio />}
        {activeTab === 'tokens' && <SystemTokens />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-mono space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>SFX-UI Design System • Built with React 18, Vite, WebGL2 & Tailwind CSS</span>
        </div>
        <div>
          Full Semantic DOM Hierarchy • Hardware Accelerated • Signed Distance Field (SDF) Clipping
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ShaderProvider>
      <AppContent />
    </ShaderProvider>
  );
};

export default App;
