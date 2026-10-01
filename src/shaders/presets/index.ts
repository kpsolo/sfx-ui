import { LIQUID_GLASS_SHADER } from './liquidGlass';
import { CYBER_GRID_SHADER } from './cyberGrid';
import { AURORA_WAVES_SHADER } from './auroraWaves';
import { ELECTRIC_BORDER_SHADER } from './electricBorder';
import { HOLOGRAM_SCAN_SHADER } from './hologramScan';
import { PLASMA_FLOW_SHADER } from './plasmaFlow';
import { MATRIX_DITHER_SHADER } from './matrixDither';
import { STARFIELD_WARP_SHADER } from './starfieldWarp';
import { RIPPLE_ECHO_SHADER } from './rippleEcho';
import { ShaderPreset } from '../../core/types';

export const SHADER_PRESETS: Record<ShaderPreset, string> = {
  'liquid-glass': LIQUID_GLASS_SHADER,
  'cyber-grid': CYBER_GRID_SHADER,
  'aurora-waves': AURORA_WAVES_SHADER,
  'electric-border': ELECTRIC_BORDER_SHADER,
  'hologram-scan': HOLOGRAM_SCAN_SHADER,
  'plasma-flow': PLASMA_FLOW_SHADER,
  'matrix-dither': MATRIX_DITHER_SHADER,
  'starfield-warp': STARFIELD_WARP_SHADER,
  'ripple-echo': RIPPLE_ECHO_SHADER,
};

export const SHADER_PRESET_NAMES: { id: ShaderPreset; label: string; description: string }[] = [
  { id: 'liquid-glass', label: 'Liquid Glass', description: 'Frosted refractive glass with chromatic dispersion' },
  { id: 'cyber-grid', label: 'Cyber Grid', description: '3D perspective synthwave grid with horizon glow' },
  { id: 'aurora-waves', label: 'Aurora Waves', description: 'Flowing cosmic multi-color gradient ribbons' },
  { id: 'electric-border', label: 'Electric Border', description: 'High-voltage plasma arc tracing component edges' },
  { id: 'hologram-scan', label: 'Hologram Scan', description: 'Cybernetic CRT scanlines with micro-glitch interference' },
  { id: 'plasma-flow', label: 'Plasma Flow', description: 'Smooth fluid metaballs with vibrant color blending' },
  { id: 'ripple-echo', label: 'Ripple Echo', description: 'Mouse-reactive expanding concentric wave ripples' },
  { id: 'starfield-warp', label: 'Starfield Warp', description: 'Cosmic hyperspace stars reacting to cursor velocity' },
  { id: 'matrix-dither', label: 'Matrix Dither', description: 'Retro 8-bit Bayer matrix dithering pattern' },
];
