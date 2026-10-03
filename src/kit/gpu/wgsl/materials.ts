/**
 * Built-in surface materials. Each body defines
 *   fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f   // premultiplied RGBA
 * and is wrapped by materialSource() (see common.ts).
 *
 * Conventions: p is in device px from the rect center; s.shape.x is the corner radius (px);
 * s.state = hover, active, focus, value (eased); s.anim = time, seed, intensity, press.
 */

const SHAPE = /* wgsl */ `
  let half = s.rect.zw * 0.5;
  let d = sdRoundBox(p, half, s.shape.x);
  let inside = fill(d);
`;

// Soft contact shadow outside the shape. Radius in CSS px; the wrapper fades it out before
// the quad edge, so keep it well inside shape.margin.
const SHADOW = /* wgsl */ `
  let shadow = premul(vec3f(0.0), (1.0 - inside) * glow(d, 2.5) * 0.35);
`;

export const BUILTIN_MATERIALS: Record<string, string> = {
  solid: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let hover = s.state.x;
  let base = pick(s.tint, frame.surface);
  var rgb = base * (1.0 + 0.18 * hover - 0.12 * s.state.y);
  let edge = stroke(d + max(s.shape.y, 1.0) * 0.5, max(s.shape.y, 1.0));
  rgb = mix(rgb, mix(frame.primary.rgb * 0.45, frame.primary.rgb, hover), edge * 0.8);
  rgb += frame.accent.rgb * s.anim.w * 0.25;
  // variant 1 = ghost: only visible while hovered or pressed.
  let ghost = select(1.0, max(hover * 0.85, s.state.y), s.shape.w > 0.5);
  return premul(rgb, inside * s.anim.z * ghost);
}`,

  glass: /* wgsl */ `
// params: x blur px, y refraction px, z tint amount, w bevel width px
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  ${SHADOW}
  let r = s.shape.x;
  let n = normalize(vec2f(
    sdRoundBox(p + vec2f(1.0, 0.0), half, r) - sdRoundBox(p - vec2f(1.0, 0.0), half, r),
    sdRoundBox(p + vec2f(0.0, 1.0), half, r) - sdRoundBox(p - vec2f(0.0, 1.0), half, r)
  ) + vec2f(1e-5));
  // Convex bevel: refraction strongest at the rim, flat in the middle.
  let bevel = clamp(1.0 + d / max(s.params.w, 1.0), 0.0, 1.0);
  let lens = bevel * bevel;
  let t = s.anim.x;
  let flow = (vec2f(fbm(uv * 3.0 + vec2f(t * 0.05, 0.0)), fbm(uv * 3.0 + vec2f(7.3, -t * 0.04))) - 0.5) * s.params.y * 0.3;
  let offset = -n * lens * s.params.y + flow;
  var rgb = backdropBlur(frag + offset, s.params.x);
  // Chromatic dispersion at the rim.
  let disp = n * lens * s.params.y * 0.25;
  rgb.r = mix(rgb.r, backdropAt(frag + offset + disp).r, lens * 0.7);
  rgb.b = mix(rgb.b, backdropAt(frag + offset - disp).b, lens * 0.7);

  rgb = mix(rgb, pick(s.tint, frame.surface), s.params.z);
  // Pointer glow and press flash.
  let lp = s.pointer.xy - half;
  let pr = 0.6 * min(half.x, half.y) + 40.0;
  rgb += frame.primary.rgb * exp(-length(p - lp) / pr) * s.state.x * 0.18;
  rgb += frame.accent.rgb * s.anim.w * 0.18;
  // Rim light: fixed key light plus a highlight that follows the pointer.
  let key = pow(max(dot(n, normalize(vec2f(-0.55, -0.85))), 0.0), 6.0) * lens * 0.35;
  let follow = pow(max(dot(n, normalize(lp + vec2f(1e-4))), 0.0), 10.0) * lens * s.state.x * 0.6;
  rgb += vec3f(key + follow);
  rgb += vec3f(1.0) * stroke(d + 0.75, 1.0) * (0.22 + 0.25 * s.state.x);
  return over(premul(rgb, inside), shadow);
}`,

  frost: /* wgsl */ `
// Full-layer scrim. params: x blur px, y darkness, z refraction px. state.w = open amount 0..1.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let open = s.state.w;
  let t = s.anim.x;
  let warp = (vec2f(fbm(uv * 4.0 + vec2f(t * 0.03, 0.0)), fbm(uv * 4.0 + vec2f(3.1, t * 0.03))) - 0.5) * s.params.z * open;
  var rgb = backdropBlur(frag + warp, s.params.x * open);
  rgb = mix(rgb, frame.bg.rgb, s.params.y * open);
  // Vignette pulls focus to the center.
  let v = length(uv - 0.5) * 1.4;
  rgb *= 1.0 - v * v * 0.35 * open;
  return premul(rgb, 1.0);
}`,

  aurora: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  ${SHADOW}
  let t = s.anim.x * 0.22 + s.anim.y * 10.0;
  let aspect = s.rect.z / max(s.rect.w, 1.0);
  let q = vec2f(uv.x * aspect, uv.y);
  let w = fbm(vec2f(q.x * 0.9 + t, q.y * 0.5 - t * 0.6));
  let curtain = fbm(vec2f(q.x * 2.4 + w * 2.0 - t * 0.7, t * 0.25));
  let bands = sin((uv.y + w * 0.7) * 7.0 + t * 1.8) * 0.5 + 0.5;
  var col = mix(frame.primary.rgb, frame.secondary.rgb, smoothstep(0.25, 0.75, w));
  col = mix(col, frame.accent.rgb, bands * curtain * 0.8);
  var rgb = pick(s.tint, frame.bg) * 0.85;
  rgb += col * (0.18 + 0.55 * curtain * (1.0 - uv.y * 0.6)) * (0.8 + 0.4 * s.state.x);
  rgb += frame.accent.rgb * s.anim.w * 0.2;
  rgb += vec3f(1.0) * stroke(d + 0.75, 1.0) * 0.12;
  return over(premul(rgb, inside * s.anim.z), shadow);
}`,

  plasma: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x * 0.8;
  let q = p / 60.0;
  let m = (s.pointer.xy - s.rect.zw * 0.5) / 60.0;
  var v = sin(q.x + t) + sin(q.y * 1.3 - t * 1.1) + sin((q.x + q.y) * 0.7 + t * 0.6);
  v += sin(length(q - m) * 1.6 - t * 2.0) * (0.6 + s.state.x);
  let k = v * 0.25 + 0.5;
  var rgb = mix(frame.primary.rgb, frame.secondary.rgb, smoothstep(0.1, 0.6, k));
  rgb = mix(rgb, frame.accent.rgb, smoothstep(0.55, 0.95, k));
  rgb *= 0.55 + 0.45 * k;
  rgb += vec3f(1.0) * stroke(d + 0.75, 1.0) * 0.25;
  rgb += vec3f(1.0) * s.anim.w * 0.2;
  return premul(rgb, inside * s.anim.z);
}`,

  grid: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  ${SHADOW}
  let t = s.anim.x;
  var q = uv * 2.0 - 1.0;
  q.x *= s.rect.z / max(s.rect.w, 1.0);
  q.x += (s.pointer.x / max(s.rect.z, 1.0) - 0.5) * 0.4 * s.state.x;
  let horizon = 0.15;
  var rgb = pick(s.tint, frame.bg).rgb;
  let below = q.y - horizon;
  if (below > 0.0) {
    let depth = 1.0 / max(below, 0.02);
    let g = vec2f(q.x * depth, depth + t * 1.6);
    let f = abs(fract(g - 0.5) - 0.5);
    let line = min(f.x, f.y);
    // Line width grows with depth so the grid stays anti-aliased without derivatives.
    let lw = 0.02 * depth * 0.25 + 0.015;
    let gridV = smoothstep(lw, 0.0, line);
    let fade = exp(-0.12 * depth);
    let gc = mix(frame.primary.rgb, frame.accent.rgb, sin(depth * 0.4 + t) * 0.5 + 0.5);
    rgb += gc * gridV * fade * (0.9 + 0.5 * s.state.x);
  } else {
    // Star cells in CSS px so they look the same at any shader resolution.
    let cell = floor(frag / (1.5 * frame.dpr));
    let star = pow(hash21(cell), 40.0);
    rgb += frame.primary.rgb * star * (0.6 + 0.4 * sin(t * 2.0 + hash21(cell) * 20.0));
  }
  rgb += frame.accent.rgb * (0.03 / (abs(below) + 0.03)) * 0.45;
  rgb += frame.accent.rgb * s.anim.w * 0.25;
  return over(premul(rgb, inside * s.anim.z), shadow);
}`,

  electric: /* wgsl */ `
// params: x interior fill alpha, y border width px
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let bw = max(s.params.y, 1.5) * (1.0 + 0.35 * s.state.x);
  let ang = atan2(p.y, p.x);
  let n = fbm(vec2f(ang * 3.0 + t * 2.0, t * 3.0));
  // Jittered border distance so the arc crackles.
  let dj = d + (n - 0.5) * 3.0 * (0.6 + s.state.x);
  let core = stroke(dj + bw * 0.5, bw * 0.5);
  let halo = glow(abs(dj + bw * 0.5), 4.0 + 6.0 * s.state.x) * 0.6;
  let arc = sin(ang * 5.0 + t * 6.0 + n * 6.0) * 0.5 + 0.5;
  let c = mix(pick(s.tint, frame.primary), frame.accent.rgb, arc);
  let spark = step(0.985, hash21(floor(frag / 2.0) + floor(t * 24.0))) * smoothstep(8.0, 0.0, abs(d));
  let interior = premul(pick(vec4f(0.0), frame.bg) + c * 0.06, inside * s.params.x);
  let energy = premul(c + vec3f(spark), clamp(core + halo + spark, 0.0, 1.0) * (0.8 + 0.2 * s.state.x));
  return over(energy + premul(frame.accent.rgb, s.anim.w * 0.3 * inside), interior) * s.anim.z;
}`,

  hologram: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let scan = 0.5 + 0.5 * sin(frag.y * 1.6 - t * 8.0);
  let sweep = smoothstep(0.08, 0.0, abs(fract(uv.y - t * 0.15) - 0.5) - 0.42);
  let flicker = 0.92 + 0.08 * sin(t * 37.0) * sin(t * 13.0);
  let tint = pick(s.tint, frame.primary);
  var rgb = pick(vec4f(0.0), frame.bg) * 0.6 + tint * (0.10 + 0.08 * scan);
  rgb += tint * sweep * 0.35;
  rgb += tint * stroke(d + 0.75, 1.0) * 0.9;
  rgb += frame.accent.rgb * s.state.x * 0.08;
  rgb += vec3f(1.0) * s.anim.w * 0.2;
  return premul(rgb * flicker, inside * (0.85 + 0.15 * scan) * s.anim.z);
}`,

  dither: /* wgsl */ `
fn bayer4(px: vec2f) -> f32 {
  let x = u32(px.x) % 4u;
  let y = u32(px.y) % 4u;
  var m = array<f32, 16>(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[y * 4u + x] + 0.5) / 16.0;
}
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let cell = max(s.params.x, 2.0);
  let cp = floor(frag / cell);
  let wave = sin(uv.x * 6.0 + t * 1.6) * cos(uv.y * 5.0 - t * 1.2) * 0.5 + 0.5;
  let lp = s.pointer.xy - s.rect.zw * 0.5;
  let lum = clamp(wave * 0.8 + exp(-length(p - lp) / 90.0) * s.state.x * 0.6, 0.0, 1.0);
  let on = step(bayer4(cp), lum);
  var rgb = mix(pick(vec4f(0.0), frame.bg), pick(s.tint, frame.primary), on * 0.9);
  rgb += frame.accent.rgb * s.anim.w * 0.3;
  return premul(rgb, inside * s.anim.z);
}`,

  starfield: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let center = (s.pointer.xy - s.rect.zw * 0.5) * 0.25 * s.state.x;
  // Fixed star scale in CSS px, so a full-screen field doesn't turn stars into blobs.
  let q = (p - center) / (420.0 * frame.dpr);
  var rgb = pick(vec4f(0.0), frame.bg) * 0.7;
  let speed = 0.15 + 0.5 * s.state.x + 1.2 * s.anim.w;
  for (var i = 0; i < 4; i++) {
    let fi = f32(i);
    let z = fract(fi * 0.25 + t * speed * 0.25);
    let scale = mix(14.0, 0.6, z);
    let g = q * scale + vec2f(fi * 13.1);
    let id = floor(g);
    let h = hash22(id);
    let f = fract(g) - h;
    let size = 0.025 + 0.06 * z;
    let star = smoothstep(size, 0.0, length(f)) * smoothstep(0.0, 0.3, z) * smoothstep(1.0, 0.85, z);
    rgb += mix(frame.primary.rgb, vec3f(1.0), h.x) * star * 1.4;
  }
  rgb += frame.accent.rgb * exp(-length(q) * 4.0) * 0.12;
  return premul(rgb, inside * s.anim.z);
}`,

  ripple: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let half2 = s.rect.zw * 0.5;
  let lp = s.pointer.xy - half2;
  let dist = length(p - lp) / 40.0;
  let rings = (sin(dist * 6.0 - t * 5.0) * 0.6 + sin(dist * 9.0 - t * 7.5) * 0.4) * exp(-dist * 0.45);
  let press = length(p - (s.pointer.zw - half2)) / 40.0;
  let shock = smoothstep(0.35, 0.0, abs(press - (1.0 - s.anim.w) * 6.0)) * s.anim.w;
  let k = max(rings * (0.25 + 0.75 * s.state.x), 0.0) + shock;
  var rgb = pick(vec4f(0.0), frame.bg) * 0.9;
  rgb += mix(frame.primary.rgb, frame.accent.rgb, sin(dist + t) * 0.5 + 0.5) * k * 0.6;
  rgb += frame.primary.rgb * stroke(d + 0.75, 1.0) * 0.4;
  return premul(rgb, inside * s.anim.z);
}`,

  pill: /* wgsl */ `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let c = pick(s.tint, frame.primary);
  let shimmer = smoothstep(0.12, 0.0, abs(fract(uv.x * 0.6 - uv.y * 0.2 - t * 0.35) - 0.5) - 0.38);
  var rgb = c * 0.16 + c * shimmer * 0.18;
  rgb += c * stroke(d + 0.75, 1.0) * 0.8;
  let halo = (1.0 - inside) * glow(d, 5.0) * (0.25 + 0.35 * s.state.x);
  return premul(rgb, inside * 0.9) + premul(c, halo);
}`,

  switch: /* wgsl */ `
// state.w = checked (eased 0..1)
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let on = s.state.w;
  let t = s.anim.x;
  let travel = half.x - half.y;
  let kx = mix(-travel, travel, on);
  let kr = half.y - 3.0;
  let kd = length(p - vec2f(kx, 0.0)) - kr * (1.0 + 0.06 * s.state.y);
  // Track: dark groove, energy fill from the left edge up to the knob.
  let flow = sin(p.x * 0.18 - t * 4.0) * 0.5 + 0.5;
  let fillCol = mix(frame.primary.rgb, frame.accent.rgb, uv.x * 0.8 + flow * 0.2);
  let filled = fill(p.x - kx) ;
  var rgb = mix(frame.surface.rgb * 0.75, fillCol * (0.65 + 0.2 * flow), filled * on);
  rgb += vec3f(1.0) * stroke(d + 0.75, 1.0) * (0.12 + 0.2 * s.state.x);
  var track = premul(rgb, inside);
  // Knob with specular highlight and drop shadow.
  let ks = premul(vec3f(0.0), fill(kd - 1.5 + 0.0) * 0.35 * (1.0 - fill(kd)));
  let spec = smoothstep(kr * 0.9, 0.0, length(p - vec2f(kx - kr * 0.3, -kr * 0.35)));
  var kc = mix(vec3f(0.78, 0.82, 0.9), vec3f(1.0), on) + vec3f(spec * 0.25);
  kc = mix(kc, frame.accent.rgb, s.state.y * 0.25);
  let knob = premul(kc, fill(kd));
  let halo = premul(fillCol, (1.0 - fill(kd)) * glow(kd, 6.0) * on * (0.5 + 0.4 * s.state.x));
  return over(knob, over(ks + halo, track)) * s.anim.z;
}`,

  slider: /* wgsl */ `
// state.w = value 0..1. params: x track height px, y knob radius px
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let half = s.rect.zw * 0.5;
  let t = s.anim.x;
  let kr = s.params.y * (1.0 + 0.12 * s.state.x + 0.1 * s.state.y);
  let travel = half.x - s.params.y;
  let kx = mix(-travel, travel, clamp(s.state.w, 0.0, 1.0));
  let th = s.params.x * 0.5;
  let td = sdRoundBox(p, vec2f(half.x - s.params.y * 0.5, th), th);
  let flow = sin(p.x * 0.12 - t * 5.0) * 0.5 + 0.5;
  let fillCol = mix(frame.primary.rgb, frame.accent.rgb, uv.x * 0.7 + flow * 0.3);
  let filled = fill(p.x - kx);
  var rgb = mix(frame.surface.rgb * 0.8, fillCol, filled);
  rgb += vec3f(1.0) * stroke(td + 0.5, 1.0) * 0.1;
  let track = premul(rgb, fill(td));
  let kd = length(p - vec2f(kx, 0.0)) - kr;
  let spec = smoothstep(kr, 0.0, length(p - vec2f(kx - kr * 0.3, -kr * 0.35)));
  var kc = vec3f(0.95, 0.97, 1.0) + vec3f(spec * 0.2);
  kc = mix(kc, frame.accent.rgb, s.state.y * 0.4);
  let knob = premul(kc, fill(kd));
  let ring = premul(frame.primary.rgb, stroke(kd + 1.0, 2.0));
  let halo = premul(fillCol, (1.0 - fill(kd)) * glow(kd, 5.0 + 8.0 * s.state.y) * (0.45 + 0.45 * s.state.x));
  return over(ring, over(knob, over(halo, track))) * s.anim.z;
}`,

  check: /* wgsl */ `
fn sdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// state.w = checked (eased). The tick is drawn progressively as it eases in.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let on = s.state.w;
  let sz = min(half.x, half.y);
  var rgb = mix(frame.surface.rgb * 0.8, mix(frame.primary.rgb, frame.accent.rgb, uv.y) * 0.85, on);
  rgb += vec3f(1.0) * stroke(d + 0.75, 1.5) * mix(0.25 + 0.3 * s.state.x, 0.1, on);
  let box = premul(rgb, inside);
  let a = vec2f(-0.45, 0.02) * sz;
  let b = vec2f(-0.12, 0.35) * sz;
  let c = vec2f(0.5, -0.38) * sz;
  let l1 = length(b - a);
  let l2 = length(c - b);
  let drawn = on * (l1 + l2);
  let e1 = mix(a, b, clamp(drawn / l1, 0.0, 1.0));
  let e2 = mix(b, c, clamp((drawn - l1) / l2, 0.0, 1.0));
  var td = sdSegment(p, a, e1);
  if (drawn > l1) { td = min(td, sdSegment(p, b, e2)); }
  let tick = premul(vec3f(1.0), fill(td - sz * 0.11) * step(0.001, on));
  let halo = premul(frame.primary.rgb, (1.0 - inside) * glow(d, 6.0) * on * 0.5);
  return over(tick, over(box, halo)) * s.anim.z;
}`,

  progress: /* wgsl */ `
// state.w = value 0..1
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let fx = -half.x + s.rect.z * clamp(s.state.w, 0.0, 1.0);
  let filled = fill(p.x - fx);
  let stripes = smoothstep(0.35, 0.65, fract((p.x - p.y) / 14.0 - t * 1.2));
  let pulse = sin(p.x * 0.05 - t * 6.0) * 0.5 + 0.5;
  var fc = mix(pick(s.tint, frame.primary), frame.accent.rgb, uv.x);
  fc = fc * (0.75 + 0.15 * stripes + 0.15 * pulse);
  var rgb = mix(frame.surface.rgb * 0.7, fc, filled);
  // Hot head at the fill edge.
  rgb += vec3f(1.0) * exp(-abs(p.x - fx) / 3.0) * filled * 0.6;
  let halo = premul(fc, (1.0 - inside) * glow(d, 5.0) * 0.5 * smoothstep(fx + 2.0, fx - 20.0, p.x));
  return over(premul(rgb, inside), halo) * s.anim.z;
}`,

  ring: /* wgsl */ `
// Rotating conic gradient ring around the shape. params.x ring width px.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  ${SHAPE}
  let t = s.anim.x;
  let w = max(s.params.x, 2.0);
  let ang = atan2(p.y, p.x) / TAU + 0.5;
  let k = fract(ang - t * (0.15 + 0.35 * s.state.x));
  let c = mix(mix(frame.primary.rgb, frame.secondary.rgb, smoothstep(0.0, 0.5, k)), frame.accent.rgb, smoothstep(0.5, 1.0, k));
  let ringD = d - w * 0.5 - 1.0;
  let ring = premul(c, stroke(ringD, w) * (0.6 + 0.4 * k));
  let halo = premul(c, glow(abs(ringD), 6.0) * s.state.x * 0.5 * (1.0 - inside));
  return (ring + halo) * s.anim.z;
}`,

  indicator: /* wgsl */ `
// Liquid tab indicator inside a tablist. state.w = left offset in CSS px (eased, so it glides);
// params: x target left px, y width px. The pill stretches while it travels.
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let half = s.rect.zw * 0.5;
  let t = s.anim.x;
  let pad = 4.0 * frame.dpr;
  let ih = half.y - pad;
  let left = s.state.w * frame.dpr;
  let travel = s.params.x - left;
  let cx = -half.x + left + s.params.y * 0.5 + travel * 0.35;
  let iw = s.params.y * 0.5 + abs(travel) * 0.35;
  let id = sdRoundBox(p - vec2f(cx, 0.0), vec2f(iw - pad * 0.5, ih * (1.0 - min(abs(travel) * 0.002, 0.3))), ih);
  let q = (p - vec2f(cx, 0.0)) / max(iw, 1.0);
  let sheen = smoothstep(0.1, 0.0, abs(fract(q.x * 0.5 - t * 0.25) - 0.5) - 0.4);
  var rgb = mix(frame.primary.rgb, frame.accent.rgb, q.x * 0.5 + 0.5) * 0.3;
  rgb += vec3f(1.0) * sheen * 0.06;
  rgb += frame.primary.rgb * stroke(id + 0.75, 1.0) * 0.9;
  let halo = premul(frame.primary.rgb, (1.0 - fill(id)) * glow(id, 6.0) * 0.4);
  // The tablist track itself.
  let td = sdRoundBox(p, half, s.shape.x);
  var trackRgb = frame.surface.rgb * 0.7;
  trackRgb += vec3f(1.0) * stroke(td + 0.75, 1.0) * 0.08;
  let track = premul(trackRgb, fill(td) * 0.85);
  return over(premul(rgb, fill(id)) + halo, track) * s.anim.z;
}`,
};

/** Materials that read the scene behind them; the renderer copies the backdrop region first. */
export const BACKDROP_MATERIALS = new Set(['glass', 'frost']);

export type BuiltinMaterial =
  | 'solid' | 'glass' | 'frost' | 'aurora' | 'plasma' | 'grid' | 'electric' | 'hologram'
  | 'dither' | 'starfield' | 'ripple' | 'pill' | 'switch' | 'slider' | 'check' | 'progress'
  | 'ring' | 'indicator';

/** Param slots holding CSS px lengths; the renderer scales them by the device pixel ratio. */
export const MATERIAL_PX_PARAMS: Partial<Record<BuiltinMaterial, number[]>> = {
  glass: [0, 1, 3],
  frost: [0, 2],
  electric: [1],
  dither: [0],
  slider: [0, 1],
  ring: [0],
  indicator: [0, 1],
};

/** Default params (vec4) per material. */
export const MATERIAL_DEFAULTS: Partial<Record<BuiltinMaterial, [number, number, number, number]>> = {
  glass: [10, 14, 0.18, 18],
  frost: [22, 0.45, 18, 0],
  electric: [0.85, 2.5, 0, 0],
  dither: [3, 0, 0, 0],
  slider: [6, 9, 0, 0],
  ring: [3, 0, 0, 0],
};
