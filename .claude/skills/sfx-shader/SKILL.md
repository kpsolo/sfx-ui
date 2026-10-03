---
name: sfx-shader
description: Write, modify and debug WGSL in the SFX UI kit — surface materials (src/kit/gpu/wgsl/materials.ts), content effects on live HTML (wgsl/content.ts), the Frame/Surface struct layouts, backdrop/refraction materials, the present pass, and custom materials via renderer.setMaterial / the Studio. Use whenever a task touches WGSL, a material or effect looks wrong, blank or fails to compile, or a new visual effect is needed.
---

# SFX Shader Work (WebGPU / WGSL)

Read [references/pipeline.md](references/pipeline.md) before you change the renderer, struct layouts or pass order.

## The material contract

A material is a WGSL body that defines one function:

```wgsl
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f   // PREMULTIPLIED rgba
```

- `p`: device px from the rect **center**. `uv`: 0..1 over the rect. `frag`: scene pixel (device px, top-left origin).
- `s.rect` x,y,w,h (device px) · `s.shape` radius, border, margin, variant · `s.state` hover, active, focus, value (all eased) · `s.anim` time, seed, intensity, press (1 → 0 over 0.75 s after each pointerdown) · `s.pointer` local pointer xy, last press origin zw (device px from the rect top-left) · `s.tint` (a == 0 → use the theme) · `s.params` (material-specific) · `s.fx` (content effect, read by the compositor, not by materials).
- `frame`: resolution, time, dpr, global pointer, motion (0 when reduced motion) and the theme colors `primary secondary accent bg surface text danger success` (vec4, straight).
- Helpers (`wgsl/common.ts`): `sdRoundBox`, `fill(d)` (1 px AA), `stroke(d, w)`, `glow(d, r)`, `hash21`, `hash22`, `vnoise`, `fbm` (0..1), `pick(tint, theme)`, `premul`, `over`, `luma`, `backdropAt(px)`, `backdropBlur(px, radius)`.
- The wrapper applies the layer clip and draws the **shared focus ring** outside the shape. The quad is expanded by `shape.margin` (default 12 CSS px): glows, shadows and the ring must fit inside it.

The standard opening, used by every built-in:

```wgsl
let half = s.rect.zw * 0.5;
let d = sdRoundBox(p, half, s.shape.x);
let inside = fill(d);
```

## Rules

1. **Premultiplied out.** Return `premul(rgb, a)`, and combine layers with `over(top, bottom)` or by adding premultiplied glow. Blending is `one, one-minus-src-alpha`.
2. **Sample with `textureSampleLevel`** (it has no uniformity requirement). Don't use derivatives: AA comes from distances in device px.
3. **Resolution-independent lengths.** `p`, `d` and `frag` are device px at the current resolution scale (auto, 1–2). Multiply CSS-px constants by `frame.dpr` (`glow(d, r)` already takes `r` in CSS px). Anything outside the shape must fit inside `shape.margin`: the wrapper fades it to zero at the margin, so oversized glows look truncated rather than clipped.
4. **Px params scale with DPR.** If a new built-in param is a length in CSS px, add its slot to `MATERIAL_PX_PARAMS`. Defaults go in `MATERIAL_DEFAULTS`.
4. **Backdrop materials** (`glass`, `frost`, or any body that calls `backdropAt`/`backdropBlur`) cost a render-pass break plus a region copy each. Keep them to large, few surfaces. The copied region is margin + |params.x..z| + 8 px around the rect, so don't sample farther than that.
5. **Interaction is continuous.** Use `state.x/y/z` and `anim.w` as mix weights, not branches. `motion == 0` freezes time, so a material must look finished at any `anim.x`.
6. **Theme-driven color.** Use `frame.*` or `pick(s.tint, frame.X)`. Never hard-code brand colors.
7. **Log it.** A new material, content effect or lighting model requires a `history.md` entry (CLAUDE.md §1).

## Adding a built-in material

1. Add a body to `BUILTIN_MATERIALS` in `src/kit/gpu/wgsl/materials.ts`, and its name to the `BuiltinMaterial` union.
2. Add `MATERIAL_DEFAULTS` / `MATERIAL_PX_PARAMS` entries if it has params, and add it to `BACKDROP_MATERIALS` if it reads the backdrop.
3. Optionally show it in `src/app/sections/MaterialsSection.tsx`.
4. Verify (below), then write the `history.md` entry.

## Adding a content effect

Content effects act on a layer's live HTML snapshot inside a surface's shape (`wgsl/content.ts`):
1. Add the kind to `CONTENT_FX` (TS) and a `case Nu:` in the `fs` loop. Geometric effects modify `q` (the sample position). Color effects set a flag that is applied after sampling.
2. Keep displacement bounded (tens of px). The element stays hit-tested at its layout position, so heavy warps make the visuals and the hit areas disagree.
3. Add it to the `FX` list in `EffectsSection.tsx`.

## Custom materials at runtime

`renderer.setMaterial(name, body)` compiles asynchronously. It returns `{ ok, messages }` with line numbers relative to `body`, and keeps the previous version on failure. Missing materials fall back to `solid`. The Studio section uses this with the name `'studio'`.

## Verification (report the real results)

1. `npm run build`.
2. **GPU self-test**, which works in any WebGPU browser including the in-app one (HTML-in-Canvas not needed): start the dev server, open http://localhost:5173 and run `await __sfxSelfTest()` via the browser `javascript_tool`. Every `compile` entry must be `'ok'` and every `contentCoverage` value above 0. Pass `__sfxSelfTest(true)` to overlay the rendered image, then take a screenshot.
3. **On-screen check without HTML-in-Canvas:** `await Renderer.create({ canvas, loop: 'raf' })` (imported from `/src/kit/gpu/Renderer.ts`) over normal DOM divs (`addLayer(div, { content: false })` plus `addSurface`) to see materials with real pointer events. If the browser pane is hidden (`document.hidden`), rAF is paused: call `renderer.render(t)` manually, then take a screenshot.
4. The live path (real HTML snapshots, hit testing) needs Chrome with `chrome://flags/#canvas-draw-element` (verified on 154). Drive it with Claude in Chrome, and zoom screenshots on edges and glows: clipping only shows up there. Say explicitly if you could not check it.

## Debugging map

| Symptom | Likely cause |
|---|---|
| Material renders as plain `solid` | Compile failed. Check `renderer.builtinReport[name]` or the `setMaterial` result. |
| Surface invisible | `intensity` 0, alpha not premultiplied, culled (zero size or outside the layer clip), or the layer isn't registered yet. |
| Glow or ring cut off square | `margin` too small for the glow radius. |
| Glass shows stale or black areas at its edges | Sampling beyond the copied backdrop region (see rule 4). |
| Content effect does nothing | `fx` missing, `fxAmount` eased to 0, surface not in a `content` layer, or more than 64 fx regions in the layer. |
| Everything shifted by DPR | A CSS px value used as device px. Multiply by `frame.dpr` or register it in `MATERIAL_PX_PARAMS`. |
