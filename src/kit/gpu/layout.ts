/**
 * CPU-side byte layouts for the WGSL structs in wgsl/common.ts and wgsl/content.ts.
 * Keep field order identical to the WGSL declarations.
 */
import { MAX_FX_REGIONS } from './wgsl/content';

export type Vec4 = [number, number, number, number];

export const FRAME_FLOATS = 40; // 160 bytes
export const SURFACE_FLOATS = 36; // 144 bytes (9 x vec4f)
export const SURFACE_BYTES = SURFACE_FLOATS * 4;
export const LAYER_UNIFORM_BYTES = 48 + MAX_FX_REGIONS * 4;
export const POST_BYTES = 16;

export interface ThemeColors {
  primary: Vec4;
  secondary: Vec4;
  accent: Vec4;
  bg: Vec4;
  surface: Vec4;
  text: Vec4;
  danger: Vec4;
  success: Vec4;
}

export interface FrameData {
  width: number;
  height: number;
  time: number;
  dpr: number;
  pointerX: number;
  pointerY: number;
  motion: number;
  theme: ThemeColors;
}

export function writeFrame(out: Float32Array, f: FrameData) {
  out[0] = f.width;
  out[1] = f.height;
  out[2] = f.time;
  out[3] = f.dpr;
  out[4] = f.pointerX;
  out[5] = f.pointerY;
  out[6] = f.motion;
  out[7] = 0;
  const t = f.theme;
  out.set(t.primary, 8);
  out.set(t.secondary, 12);
  out.set(t.accent, 16);
  out.set(t.bg, 20);
  out.set(t.surface, 24);
  out.set(t.text, 28);
  out.set(t.danger, 32);
  out.set(t.success, 36);
}

export interface SurfaceData {
  rect: Vec4; // x, y, w, h
  clip: Vec4; // x0, y0, x1, y1
  shape: Vec4; // radius, border, margin, variant
  state: Vec4; // hover, active, focus, value
  anim: Vec4; // time, seed, intensity, press
  pointer: Vec4; // local x, y, press origin x, y
  tint: Vec4;
  params: Vec4;
  fx: Vec4; // kind, amount, a, b
}

export function writeSurface(out: Float32Array, index: number, s: SurfaceData) {
  const o = index * SURFACE_FLOATS;
  out.set(s.rect, o);
  out.set(s.clip, o + 4);
  out.set(s.shape, o + 8);
  out.set(s.state, o + 12);
  out.set(s.anim, o + 16);
  out.set(s.pointer, o + 20);
  out.set(s.tint, o + 24);
  out.set(s.params, o + 28);
  out.set(s.fx, o + 32);
}

/**
 * Layer uniform (LayerU in wgsl/content.ts): rect, resolve rect (both full-res device px),
 * count (u32), opacity, regionScale (full px per material px), pad, then fx region indices.
 */
export function writeLayerUniform(
  buf: ArrayBuffer,
  rect: Vec4,
  resolve: Vec4,
  opacity: number,
  regionScale: number,
  indices: number[]
) {
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f.set(rect, 0);
  f.set(resolve, 4);
  const count = Math.min(indices.length, MAX_FX_REGIONS);
  u[8] = count;
  f[9] = opacity;
  f[10] = regionScale;
  f[11] = 0;
  for (let i = 0; i < count; i++) u[12 + i] = indices[i];
}
