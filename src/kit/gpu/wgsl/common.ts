/**
 * Shared WGSL: the frame/surface structs, bindings, math helpers and the surface vertex stage.
 * Byte layouts must stay in sync with `gpu/layout.ts`.
 */

export const STRUCTS_WGSL = /* wgsl */ `
struct Frame {
  resolution: vec2f,   // scene size, device px
  time: f32,           // seconds (frozen when reduced motion)
  dpr: f32,
  pointer: vec2f,      // global pointer, device px
  motion: f32,         // 1 normal, 0 reduced motion
  _pad0: f32,
  primary: vec4f,
  secondary: vec4f,
  accent: vec4f,
  bg: vec4f,
  surface: vec4f,
  text: vec4f,
  danger: vec4f,
  success: vec4f,
};

struct Surface {
  rect: vec4f,     // x, y, w, h — device px, scene space (top-left origin)
  clip: vec4f,     // x0, y0, x1, y1 — layer viewport clip, device px
  shape: vec4f,    // radius, border, margin, variant
  state: vec4f,    // hover, active, focus, value (all eased 0..1 except value)
  anim: vec4f,     // time (per surface), seed, intensity, press (decays 1 -> 0 after each press)
  pointer: vec4f,  // pointer local px (from rect top-left), last press origin local px
  tint: vec4f,     // straight-alpha color override; a == 0 -> use theme
  params: vec4f,   // material specific
  fx: vec4f,       // content effect: kind, amount, a, b
};
`;

export const HELPERS_WGSL = /* wgsl */ `
const PI = 3.14159265;
const TAU = 6.28318531;

fn sdRoundBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let rr = min(r, min(b.x, b.y));
  let q = abs(p) - b + vec2f(rr);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - rr;
}

// Analytic 1px anti-aliasing for distances measured in device px.
fn fill(d: f32) -> f32 { return clamp(0.5 - d, 0.0, 1.0); }
fn stroke(d: f32, w: f32) -> f32 { return fill(abs(d) - w * 0.5); }
// Exponential falloff outside a shape; radius in CSS px (scaled by the resolution scale).
fn glow(d: f32, radius: f32) -> f32 { return exp(-max(d, 0.0) / max(radius * frame.dpr, 0.001)); }

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

fn hash22(p: vec2f) -> vec2f {
  let q = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
  return fract(sin(q) * 43758.5453);
}

fn vnoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 0..1 fractal noise, 5 octaves, rotated per octave.
fn fbm(p0: vec2f) -> f32 {
  var p = p0;
  var v = 0.0;
  var a = 0.5;
  let rot = mat2x2f(0.8, 0.6, -0.6, 0.8);
  for (var i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.03 + vec2f(17.0);
    a *= 0.5;
  }
  return v;
}

fn palette(t: f32, a: vec3f, b: vec3f, c: vec3f) -> vec3f {
  let x = fract(t) * 3.0;
  return select(select(mix(c, a, x - 2.0), mix(b, c, x - 1.0), x < 2.0), mix(a, b, x), x < 1.0);
}

fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }

// Tint override, else the theme color.
fn pick(tint: vec4f, theme: vec4f) -> vec3f { return select(theme.rgb, tint.rgb, tint.a > 0.0); }

fn premul(rgb: vec3f, a: f32) -> vec4f { return vec4f(rgb * a, a); }

// Source-over for premultiplied colors.
fn over(top: vec4f, bottom: vec4f) -> vec4f { return top + bottom * (1.0 - top.a); }
`;

export const BINDINGS_WGSL = /* wgsl */ `
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> surfaces: array<Surface>;
@group(0) @binding(2) var backdrop: texture_2d<f32>;       // full-res scene below this layer
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var layerBackdrop: texture_2d<f32>;  // this layer's earlier surfaces (material res)

// Scene color behind the current surface (only meaningful for backdrop materials): the
// layer's own earlier surfaces over everything painted by lower layers.
fn backdropAt(px: vec2f) -> vec4f {
  let uv = px / frame.resolution;
  let below = textureSampleLevel(backdrop, samp, uv, 0.0);
  let same = textureSampleLevel(layerBackdrop, samp, uv, 0.0);
  return same + below * (1.0 - same.a);
}

// 12-tap golden-angle blur of the backdrop around px.
fn backdropBlur(px: vec2f, radius: f32) -> vec3f {
  if (radius < 0.5) { return backdropAt(px).rgb; }
  var acc = vec3f(0.0);
  for (var i = 0; i < 12; i++) {
    let fi = f32(i);
    let r = sqrt((fi + 0.5) / 12.0) * radius;
    let a = fi * 2.39996323;
    acc += backdropAt(px + vec2f(cos(a), sin(a)) * r).rgb;
  }
  return acc / 12.0;
}
`;

/** Prepended to every surface material. */
export const MATERIAL_PRELUDE_WGSL = STRUCTS_WGSL + HELPERS_WGSL + BINDINGS_WGSL;

/**
 * Appended to every material: the instanced vertex stage and the fragment wrapper that applies
 * the layer clip and the shared focus ring. A material only defines
 *   fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f   // premultiplied
 * where p is px from the rect center, uv is 0..1 over the rect, frag is the scene pixel.
 */
export const MATERIAL_ENTRY_WGSL = /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) p: vec2f,
  @location(1) @interpolate(flat) idx: u32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let s = surfaces[ii];
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  let m = s.shape.z;
  let px = s.rect.xy - vec2f(m) + corners[vi] * (s.rect.zw + vec2f(2.0 * m));
  var o: VOut;
  o.pos = vec4f(px / frame.resolution * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  o.p = px - (s.rect.xy + s.rect.zw * 0.5);
  o.idx = ii;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  let s = surfaces[in.idx];
  let frag = in.pos.xy;
  let inClip = step(s.clip.x, frag.x) * step(s.clip.y, frag.y) * step(frag.x, s.clip.z) * step(frag.y, s.clip.w);
  let half = s.rect.zw * 0.5;
  let uv = (in.p + half) / max(s.rect.zw, vec2f(1.0));
  var c = material(s, in.p, uv, frag);

  // Shared keyboard-focus ring, drawn outside the shape (needs shape.margin >= 8 CSS px).
  let d = sdRoundBox(in.p, half, s.shape.x);
  let ring = stroke(d - 3.5 * frame.dpr, 2.0 * frame.dpr) * s.state.z;
  c = over(premul(frame.accent.rgb, ring), c);

  // Everything outside the shape (shadows, glows, halos) fades to zero before the quad edge,
  // so no material can end in a hard, clipped line.
  let outside = length(max(abs(in.p) - half, vec2f(0.0)));
  let m = max(s.shape.z, 1.0);
  let edgeFade = 1.0 - smoothstep(m * 0.55, m, outside);

  return c * inClip * edgeFade;
}
`;

export function materialSource(body: string): string {
  return `${MATERIAL_PRELUDE_WGSL}\n${body}\n${MATERIAL_ENTRY_WGSL}`;
}

/** Number of lines before user code in materialSource(), to remap compiler line numbers. */
export const MATERIAL_PRELUDE_LINES = MATERIAL_PRELUDE_WGSL.split('\n').length;
