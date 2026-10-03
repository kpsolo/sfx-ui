# SFX render pipeline (as of 2026-10-03, history.md Milestones 6–6.3)

## Two resolutions

- **Content scale `cs`** = canvas backing store px per CSS px: display DPR capped at 2 (1 in `fast`). HTML snapshots rasterize at this scale, so text is always as sharp as `cs` allows.
- **Material scale `ms`** = shader surface resolution: `cs` in `sharp`, 1 in `fast`, and in `auto` it starts at `cs` and steps down 0.25 per two slow seconds (below 48 fps), to a minimum of 0.5.
- Surfaces are packed in **material px**; `frameMat` (resolution `Wm×Hm`, `dpr = ms`) drives material passes, and `frameFull` (`W×H`, `dpr = cs`) drives content, resolve and present. The content shader scales surface geometry by `LayerU.regionScale = cs/ms` for content effects.

## Frame (Renderer.render)

1. **Measure.** Layers and surfaces are measured in CSS px, culled against the layer clip, eased (hover 12/s, active 20/s, focus 14/s, value 11/s, fx 5/s; reduced motion snaps value and fx), and packed in **layer z order, then DOM order**. Each layer gets a plan: draws, fx regions, the union of drawn bounds, and the union of backdrop reach.
2. **Upload.** Dirty content layers (canvas `paint` → `changedElements`, a texture resize, or `invalidate()`) are re-rasterized with `drawElementImageToTexture` (premultiplied, at `cs`).
3. **Encode, direct path** (`ms == cs`: sharp, fast, auto before stepping down): surfaces draw straight into the full-res scene. Before each backdrop material: end the pass, copy that surface's reach from `scene` to `sceneCopy`, and resume. Then the layer's content quad. The material bind group uses a transparent 1×1 texture as `layerBackdrop`.
4. **Encode, mixed path** (`ms < cs`), per layer with surfaces:
   - Copy the layer's backdrop union from `scene` to `sceneCopy` (what lower layers painted).
   - Render the surfaces into `layerBuf` (material res, cleared transparent). Before each backdrop material, copy its reach from `layerBuf` to `layerCopy`, so glass also refracts this layer's earlier surfaces: `backdropAt()` = `layerCopy` over `sceneCopy`.
   - Layers with HTML: the content pass samples `layerBuf` and outputs `content + surfaces·(1 − content.a)`, so the upsample costs no extra pass. Layers without HTML: a resolve pass over the drawn bounds.
5. The scene pass opens lazily; its first opening clears to `--sfx-bg`.
6. **Present.** A full-screen triangle samples the scene into the swap chain with vignette, grain and scanlines (`renderer.post`).

Loop modes: `'paint'` (production: rAF calls `canvas.requestPaint()`, and rendering happens inside the `paint` event, where snapshots are valid), `'raf'` (no HTML-in-Canvas, for dev harnesses), and `'manual'` (tests call `render(t)`).

## Struct layouts (must match `src/kit/gpu/layout.ts`)

- `Frame`, 160 B: resolution vec2, time, dpr, pointer vec2, motion, pad, then 8 × vec4 theme colors.
- `Surface`, 144 B (9 × vec4): rect, clip, shape, state, anim, pointer, tint, params, fx.
- `LayerU`, 304 B: rect vec4, resolve vec4 (full px; z > 0 means "composite layerBuf"), count u32, opacity, regionScale, pad, then `idx: array<vec4u, 16>` (64 fx surface indices).
- `Post`, 16 B: vignette, grain, scanlines, pad.

Bind group layouts are explicit (not `'auto'`), so every material pipeline shares one layout: frame (0, `frameMat`), surfaces (1), `sceneCopy` (2), sampler (3), `layerCopy` or the empty texel (4). Content: frameFull (0), surfaces (1), layer texture (2), sampler (3), LayerU (4), `layerBuf` (5). Resolve: frameFull, `layerBuf`, sampler, LayerU.

## HTML-in-Canvas specifics (measured in Chrome 154 with the flag, 2026-10-03)

- All calls are in `src/kit/gpu/htmlInCanvas.ts`.
- **Opt-in:** only `layoutsubtree` works in 154. `content="drawable"` is set too, for later builds.
- **Upload:** 154 takes `drawElementImageToTexture({ source: el }, { destination: { texture, premultipliedAlpha } })`; the explainer shape is `{ texture, size }`. The adapter tries the explainer shape, falls back on TypeError, and caches the result. The snapshot **rasterizes at the canvas backing-store scale** (a 120×40 element on a 2×-backed canvas gives 240×80), so layer textures are `css × scale`.
- **Layout:** children are static, laid out at the canvas origin, and margins don't move them. A CSS `transform` does move drawing, hit testing and `getBoundingClientRect`, so overlays use `Layer at` (a translate).
- **Hit testing:** correct for origin layers and translated layers. `updateElementGeometry(translate…)` had no visible effect in 154; it is still called (cheap, cached) for the explainer semantics.
- `paint` fires once per frame while the tab is visible, with `changedElements` = layers whose snapshot changed. Hidden tabs get no paint events.
- Detection (`support.ts`) requires all four entry points. 154 exposes both new and legacy names (`copyElementImageToTexture`, `captureElementImage`, `getElementTransform(el, m)`).
- Not drawn in snapshots: cross-origin content (fonts, images, iframes), visited-link styles, scrollbars, spelling markers, system colors.

## Performance (Intel Gen-9 iGPU, 1642×780 CSS viewport)

- GPU time per frame at 2× (hidden tab, so absolute values are inflated; the proportions are what matter): full 137 ms, surfaces only 115, content only 48, clear + present 47. **Shader surfaces dominate; HTML content is nearly free.**
- Visible-tab fps by quality: sharp ~13, auto ~29 with text at 2× (shaders settle at 0.5×), fast ~40 (hero view).
- Clear + present alone cap a 5 Mpx frame at ~52 fps on this GPU, so full-resolution text can't reach 60 there.
- Measure with `getStats().fps / contentScale / materialScale`. Isolate costs by stubbing `renderer.render` or emptying `renderer.layers[i].surfaces` from the console (`window.__sfxRenderer` in dev). When the tab is hidden, time `render()` + `device.queue.onSubmittedWorkDone()` in a loop instead of counting paints.
- To force mixed resolution in a harness: `renderer.autoScale = 1` (private, but reachable from JS) with quality `auto`.

## Lifecycle

- `Renderer.destroy()` cancels rAF, removes listeners and observers, destroys textures and buffers, and calls `device.destroy()`. It never unconfigures the canvas context: the context is configured lazily in `render()`, so a renderer discarded by StrictMode can't break the live one.
- `Stage` rebuilds the renderer on device loss.
