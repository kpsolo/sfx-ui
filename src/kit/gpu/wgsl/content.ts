import { STRUCTS_WGSL, HELPERS_WGSL } from './common';

/** Content effect kinds, shared by TS (Surface.fx.x) and WGSL. */
export const CONTENT_FX = {
  none: 0,
  ripple: 1,
  liquid: 2,
  glitch: 3,
  pixelate: 4,
  chroma: 5,
  hologram: 6,
  dissolve: 7,
} as const;
export type ContentFx = keyof typeof CONTENT_FX;

/** Max surfaces with a content effect per layer (indices packed 4 per vec4u). */
export const MAX_FX_REGIONS = 64;

/** Per-layer uniform; byte layout in layout.ts (writeLayerUniform). */
const LAYER_STRUCT = /* wgsl */ `
struct LayerU {
  rect: vec4f,              // layer rect, full-res device px
  resolve: vec4f,           // region the layer's surfaces cover, full-res device px
  count: u32,               // number of fx regions
  opacity: f32,
  regionScale: f32,         // full-res px per material px (surfaces are stored at material res)
  _pad: f32,
  idx: array<vec4u, ${MAX_FX_REGIONS / 4}>,
};
`;

const QUAD_CORNERS = /* wgsl */ `
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
`;

/**
 * Composites a layer's HTML snapshot (premultiplied, full resolution) over the scene, applying
 * the content effects of every surface in that layer whose fx.x != 0. Surface records are in
 * material-resolution px, so their geometry is scaled by layer.regionScale here.
 */
export const CONTENT_WGSL = /* wgsl */ `
${STRUCTS_WGSL}
${HELPERS_WGSL}
${LAYER_STRUCT}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> surfaces: array<Surface>;
@group(0) @binding(2) var content: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var<uniform> layer: LayerU;
// This layer's surfaces at material resolution (mixed-resolution mode, when resolve.z > 0).
// Upsampling them here saves a separate full-resolution resolve pass.
@group(0) @binding(5) var surfacesTex: texture_2d<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  ${QUAD_CORNERS}
  let px = layer.rect.xy + corners[vi] * layer.rect.zw;
  var o: VOut;
  o.pos = vec4f(px / frame.resolution * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  return o;
}

fn regionIndex(i: u32) -> u32 {
  return layer.idx[i / 4u][i % 4u];
}

fn sampleContent(px: vec2f) -> vec4f {
  return textureSampleLevel(content, samp, (px - layer.rect.xy) / layer.rect.zw, 0.0);
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  let frag = in.pos.xy;
  let k = layer.regionScale;
  var q = frag;
  var chroma = 0.0;
  var holo = 0.0;
  var holoT = 0.0;
  var dissolve = 0.0;
  var dissolveSeed = 0.0;

  for (var i = 0u; i < layer.count; i++) {
    let s = surfaces[regionIndex(i)];
    let rect = s.rect * k;
    let half = rect.zw * 0.5;
    let p = frag - (rect.xy + half);
    let d = sdRoundBox(p, half, s.shape.x * k);
    let inside = fill(d);
    if (inside <= 0.0) { continue; }
    let pointer = s.pointer * k;
    let kind = u32(s.fx.x + 0.5);
    let amt = s.fx.y;
    let t = s.anim.x;
    switch kind {
      case 1u: {
        // Ripple: standing waves around the pointer while hovered, plus a shockwave per press.
        let v = p - (pointer.xy - half);
        let r = length(v);
        let wave = sin(r * 0.09 - t * 6.0) * exp(-r * 0.012) * s.state.x * amt * 2.5;
        let v2 = p - (pointer.zw - half);
        let r2 = length(v2);
        let front = (1.0 - s.anim.w) * max(half.x, half.y) * 2.4;
        let shock = exp(-abs(r2 - front) / 12.0) * s.anim.w * amt * 9.0;
        q -= (v / max(r, 1e-3) * wave + v2 / max(r2, 1e-3) * shock) * inside;
      }
      case 2u: {
        let w = vec2f(fbm(p * 0.012 + vec2f(t * 0.25, 0.0)), fbm(p * 0.012 + vec2f(5.2, -t * 0.25))) - 0.5;
        q += w * amt * 26.0 * inside;
      }
      case 3u: {
        let band = floor(frag.y / 7.0);
        let tick = floor(t * 14.0);
        let on = step(1.0 - amt * 0.4, hash21(vec2f(band, tick)));
        q.x += (hash21(vec2f(band, tick + 3.0)) - 0.5) * 26.0 * on * amt * inside;
        chroma = max(chroma, (on * 4.0 + 0.5) * amt * inside);
      }
      case 4u: {
        let cell = max(amt * 16.0, 1.0);
        q = mix(q, (floor(q / cell) + 0.5) * cell, step(1.5, cell) * inside);
      }
      case 5u: {
        chroma = max(chroma, amt * 6.0 * inside);
      }
      case 6u: {
        holo = max(holo, amt * inside);
        holoT = t;
      }
      case 7u: {
        dissolve = max(dissolve, amt * inside);
        dissolveSeed = s.anim.y;
      }
      default: {}
    }
  }

  var c = sampleContent(q);
  if (chroma > 0.0) {
    let o = vec2f(chroma, 0.0);
    let r = sampleContent(q + o);
    let b = sampleContent(q - o);
    c = vec4f(r.r, c.g, b.b, max(c.a, max(r.a, b.a)));
  }
  if (holo > 0.0) {
    let scan = 0.6 + 0.4 * sin(frag.y * 1.7 - holoT * 9.0);
    let straight = c.rgb / max(c.a, 1e-3);
    let tinted = mix(frame.primary.rgb, vec3f(1.0), luma(straight) * 0.6) * (0.6 + luma(straight));
    c = vec4f(mix(c.rgb, tinted * c.a, holo) * mix(1.0, scan, holo), c.a * mix(1.0, 0.7 + 0.3 * scan, holo));
  }
  if (dissolve > 0.0) {
    let n = fbm(frag * 0.03 + vec2f(dissolveSeed * 37.0));
    let edge = dissolve * 1.15 - 0.08;
    let keep = smoothstep(edge, edge + 0.035, n);
    let burn = smoothstep(edge + 0.09, edge + 0.035, n) * keep;
    c = c * keep + premul(frame.accent.rgb, burn * 0.9 * step(0.001, dissolve));
  }
  c *= layer.opacity;
  if (layer.resolve.z > 0.0) {
    let sfc = textureSampleLevel(surfacesTex, samp, frag / frame.resolution, 0.0);
    c = c + sfc * (1.0 - c.a);
  }
  return c;
}
`;

/**
 * Upsamples a layer's surfaces (rendered at material resolution) into the full-resolution
 * scene, over the region they cover. Bilinear filtering; premultiplied output.
 */
export const RESOLVE_WGSL = /* wgsl */ `
${STRUCTS_WGSL}
${LAYER_STRUCT}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var surfacesTex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var<uniform> layer: LayerU;

struct VOut {
  @builtin(position) pos: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  ${QUAD_CORNERS}
  let px = layer.resolve.xy + corners[vi] * layer.resolve.zw;
  var o: VOut;
  o.pos = vec4f(px / frame.resolution * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  return textureSampleLevel(surfacesTex, samp, in.pos.xy / frame.resolution, 0.0);
}
`;

export const PRESENT_WGSL = /* wgsl */ `
${STRUCTS_WGSL}
${HELPERS_WGSL}

struct Post {
  vignette: f32,
  grain: f32,
  scanlines: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var<uniform> post: Post;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  // Full-screen triangle.
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var o: VOut;
  o.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  o.uv = vec2f(x, y);
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  var rgb = textureSampleLevel(scene, samp, in.uv, 0.0).rgb;
  let v = length(in.uv - 0.5) * 1.35;
  rgb *= 1.0 - v * v * post.vignette;
  rgb += (hash21(in.pos.xy + vec2f(fract(frame.time) * 97.0)) - 0.5) * post.grain;
  rgb *= 1.0 - post.scanlines * (0.5 + 0.5 * sin(in.pos.y * PI));
  return vec4f(rgb, 1.0);
}
`;
