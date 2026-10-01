export type ShaderPreset =
  | 'liquid-glass'
  | 'cyber-grid'
  | 'aurora-waves'
  | 'electric-border'
  | 'hologram-scan'
  | 'plasma-flow'
  | 'starfield-warp'
  | 'matrix-dither'
  | 'ripple-echo';

export type ShaderTarget = 'background' | 'border' | 'overlay';

export interface ShaderUniforms {
  u_time: number;
  u_resolution: [number, number];
  u_mouse: [number, number];
  u_hover: number;
  u_active: number;
  u_color_primary: [number, number, number, number];
  u_color_secondary: [number, number, number, number];
  u_color_accent: [number, number, number, number];
  u_color_bg: [number, number, number, number];
  u_border_color: [number, number, number, number];
  u_corner_radius: number;
  u_pixel_ratio: number;
  [key: string]: number | number[] | boolean;
}

export interface ShaderProps {
  /** Selected shader preset or 'custom' */
  shader?: ShaderPreset | 'custom';
  /** Target position: 'background' | 'border' | 'overlay' */
  shaderTarget?: ShaderTarget;
  /** Custom raw GLSL fragment shader source */
  customFragmentShader?: string;
  /** Custom uniforms object to bind */
  uniforms?: Record<string, number | number[]>;
  /** Disable shaders and rely purely on CSS fallbacks */
  disableShader?: boolean;
  /** Speed multiplier (default: 1.0) */
  shaderSpeed?: number;
  /** Opacity of shader layer (0 to 1) */
  shaderOpacity?: number;
  /** Rounded corner radius in pixels (for SDF clipping) */
  cornerRadius?: number;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    border: string;
  };
  reducedMotion: boolean;
  globalSpeed: number;
}
