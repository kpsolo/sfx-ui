# SFX-UI Architecture & Evolution History

A chronological log of all architectural decisions, design pivots, technical discoveries, and engine updates in **SFX-UI** (Cutting-Edge GPU Shader-Driven Design System & Pure Canvas SDF UI Engine).

---

## Format & Logging Guidelines

Every significant update or decision recorded in this file should follow the structure:
- **Date & Version / Milestone**
- **Context & Motivation**: Why this change was needed.
- **Architectural Decision**: Options considered and why a specific path was chosen.
- **Implementation Details**: Key classes, shaders, uniforms, or components modified.
- **Verification & Outcome**: Automated tests, browser checks, or benchmarks confirming the result.

---

## Chronological Log

### [2026-10-01] — Milestone 1: Initial Genesis & Shader-First Design System (v0.1.0)
- **Context & Motivation**:
  - Web UI design systems typically rely on static CSS gradients or simple CSS animations.
  - The objective of `SFX-UI` was to build a modern UI system where **every standard UI component** (Buttons, Cards, Inputs, Sliders, Switches, Badges, Tabs, Modals, Dropdowns, Avatars, Navbars) can render live, reactive GPU fragment shaders directly in its background or border.
- **Architectural Decision**:
  - **Core Tech Stack**: Vite 5 + React 18 + TypeScript + Tailwind CSS.
  - **Component Library Architecture**: Standard accessible DOM elements paired with an underlying `<canvas>` element rendered via a centralized `ShaderEngine`.
  - **Shared Uniform Standard**: Standardized inputs across all fragment shaders:
    - `u_time` (`float`): Continuous clock elapsed in seconds.
    - `u_resolution` (`vec2`): Viewport / element dimensions in physical device pixels.
    - `u_mouse` (`vec2`): Normalized pointer coordinates `[0..1]`.
    - `u_hover` (`float`): Smooth hover intensity `[0..1]`.
    - `u_active` (`float`): Click / press state `[0..1]`.
    - `u_color_primary`, `u_color_secondary`, `u_color_accent`, `u_color_bg`, `u_border_color` (`vec4`): Reactive color tokens.
  - **Shader Studio**: Created an in-browser live GLSL IDE for real-time shader compilation, error diagnostics, and interactive parameter tuning.
- **Implementation**:
  - [`ShaderEngine.ts`](file:///c:/work/sfx-ui/src/core/ShaderEngine.ts): WebGL compilation cache, full-screen quad geometry, uniform reflection.
  - [`ShaderCanvas.tsx`](file:///c:/work/sfx-ui/src/core/ShaderCanvas.tsx): React wrapper handling DPR scaling, mouse tracking, and animation loop.
  - 14 core UI components built under `src/components/`.
  - 9 initial GLSL presets (`liquid-glass`, `cyber-grid`, `aurora-waves`, `electric-border`, `plasma-flow`, `hologram-scan`, `retro-crt`, `cosmic-dust`, `neon-wireframe`).
- **Verification**:
  - Vite dev server spun up at `http://localhost:5173/`.
  - Verified compilation of all presets in Chromium.

---

### [2026-10-02 07:15] — Milestone 2: Diagnosing WebGL Context Limits & Stability Fixes
- **Context & Motivation**:
  - When rendering complex pages with dozens of DOM UI components (each mounting its own `<canvas>` element), Chromium threw `webglcontextlost` and logged `"Too many active WebGL contexts"`.
  - Chromium enforces a hard limit of **16 active WebGL contexts per browser tab**. Exceeding this limit causes older contexts to be forcibly evicted, leading to dark/blank screens.
  - A secondary issue appeared where `ShaderEngine` logged `"Vertex Shader Error: null"` on lost context.
- **Architectural Decision**:
  - Guard `ShaderEngine` against context-loss state using `gl.isContextLost()`.
  - Fix compiler status checks: `gl.getShaderParameter(vs, gl.COMPILE_STATUS)` returns `null` on a destroyed context; changed check to strict `=== false` to prevent false-positive error popups.
  - Fix `cyber-grid` shader: replaced WebGL derivative `fwidth()` with analytical `smoothstep(0.06, 0.0, line)` to eliminate dependency on `GL_OES_standard_derivatives`.
  - In `ShaderCanvas`, implement lazy context creation via `IntersectionObserver` so off-screen elements do not acquire GPU contexts until scrolled into view.
- **Outcome**:
  - Eliminated vertex compilation crash popups.
  - Prevented crash on context loss.

---

### [2026-10-02 07:30] — Milestone 3: Architectural Pivot to 1-Context Systems (v0.2.0-canvas)
- **Context & Motivation**:
  - The 16-context limit is an inherent architectural constraint of individual DOM canvas elements.
  - User requested exploring cutting-edge architecture without browser limits, proposing rendering everything inside canvas.
- **Architectural Decision**:
  - Two parallel cutting-edge architectures were designed and implemented:
  1. **DOM-Coordinated Unified Canvas (`UnifiedShaderEngine.ts`)**:
     - Uses **1 single fullscreen WebGL canvas** behind the DOM.
     - Uses `gl.scissor()` and `gl.viewport()` to render separate shader passes matching each DOM component's bounding box (`getBoundingClientRect()`).
     - **Benefits**: Retains 100% semantic HTML, screen readers, accessibility, text selection, and Tailwind CSS layout, while consuming exactly **1 GPU context**.
  2. **Pure Canvas UI Mode (`PureCanvasEngine.ts`)**:
     - Eliminates DOM elements for widgets entirely.
     - Cards, buttons, sliders, switches, and badges are rendered inside **one WebGL2 / WebGPU canvas** using mathematical **Signed Distance Fields (SDF)** (`sdRoundedBox`).
     - Sub-pixel anti-aliasing, infinite scaling, and custom shader fills per widget.
- **Implementation**:
  - Built [`UnifiedShaderEngine.ts`](file:///c:/work/sfx-ui/src/core/unified/UnifiedShaderEngine.ts).
  - Built [`PureCanvasEngine.ts`](file:///c:/work/sfx-ui/src/canvas-ui/PureCanvasEngine.ts) and [`PureCanvasView.tsx`](file:///c:/work/sfx-ui/src/canvas-ui/PureCanvasView.tsx).
  - Added new navigation tab: *"Pure Canvas UI (100% Canvas)"*.

---

### [2026-10-02 09:45] — Milestone 4: Diagnosing & Overhauling 100% Pure Canvas Mode
- **Context & Motivation**:
  - Initial deployment of Pure Canvas Mode resulted in user feedback: *"nothing works on 100% canvas"*.
  - Widgets were unresponsive, clicks failed to toggle switches, slider dragging was fragile, and visual control handles were missing.
- **Deep-Dive Root Causes Identified**:
  1. **Custom Uniform Whitelisting**:
     In `ShaderEngine.ts`, custom uniforms were previously filtered with `k.startsWith('u_custom_') || !k.startsWith('u_')`. Because widget uniforms (`u_widget_rect`, `u_widget_radius`, `u_widget_type`, `u_widget_value`) started with `u_`, they were skipped. `u_widget_rect` stayed `[0,0,0,0]`, causing the fragment shader to `discard` all pixels.
  2. **React 18 StrictMode Listener Leak (Switch Double-Toggle)**:
     `PureCanvasEngine.destroy()` did not detach event listeners. In React 18 `StrictMode` (which mounts twice in dev mode), two listener sets attached to the canvas. Every click on a toggle switch fired twice in the same tick (`1 -> 0 -> 1`), instantly reverting the switch so it appeared non-functional.
  3. **Container Hit-Testing Swallowing Events**:
     Hit-testing looped top-down. The background container card (`main-card`) was tested first, intercepting pointer events before child buttons, sliders, and switches.
  4. **Missing SDF Knobs in Fragment Shader**:
     Sliders had no thumb knob (just a flat colored track), and switches had no sliding pill knob. Users could not tell where handles were.
  5. **Pointer Boundary Escaping**:
     Sliders stopped dragging if the mouse drifted outside the canvas boundary.
- **Architectural Solutions Implemented**:
  - **SDF Control Rendering**:
    - **Sliders**: Added analytical circular SDF thumb knobs (`length(p - thumbCenter) - thumbRadius`) with specular lighting, outer neon glow, and dynamic active/hover states.
    - **Switches**: Added sliding circular capsule knobs with soft drop shadows and specular shine traveling from `mix(-travel, travel, value)`.
    - **Buttons**: Added animated diagonal glass sheen beams and press flash feedback.
    - **Cards**: Added multi-frequency aurora waves and subtle cyber grid fills.
  - **Hit-Testing & Lifecycle Fixes**:
    - Inverted hit-testing to iterate backwards (`i = widgets.length - 1 down to 0`) with immediate break upon child interaction.
    - Added `cvs.setPointerCapture(e.pointerId)` for smooth drag tracking across the entire screen.
    - Stored listener references and cleanly removed them on `engine.destroy()`.
  - **Responsive Layout & Telemetry Action Bus**:
    - Integrated `ResizeObserver` in `PureCanvasView.tsx` to automatically adapt between 2-column desktop and single-column stacked mobile layouts.
    - Added live reactive telemetry console with counters (*Fusion Triggers*, *Quantum Pulses*, *Compute Passes*) and real-time frequency calculations (*GHz clock synced to slider*).
- **Verification & Outcome**:
  - Headless Edge test dispatched automated clicks and drag sequences:
    - Button clicks verified: counters incremented to 1.
    - Switch verified: toggled from `ENABLED` to `DISABLED` cleanly.
    - Slider verified: dragged smoothly, updating telemetry to `56.5 GHz (39%)`.
    - Production build: `tsc && vite build` succeeded with zero errors.

---

### [2026-10-03] — Milestone 5: All DOM Components on One Shared WebGL Context (v0.3.0-unified)
- **Context & Motivation**:
  - Every DOM component still created its own WebGL context through `ShaderCanvas`. The Components showcase mounted **24** shader canvases, and a canvas kept its context after it scrolled away. So a full scroll-through went past Chromium's 16-context ceiling, and the oldest surfaces were evicted.
  - The *Active WebGL Contexts* counter decremented when a surface scrolled out of view, even though its canvas still held the context. The counter under-reported.
  - `UnifiedShaderEngine` (Milestone 3) existed, but `App` did not mount it and no component used it. It also did not bind the color tokens and ignored opacity.
- **Architectural Decision**:
  - *Option A, the Milestone 3 design (one full-screen canvas behind the DOM, scissor per element):* rejected for the DOM components. A shader drawn behind the DOM is hidden by every opaque ancestor. The app root (`bg-[#07090e]`) and 15 showcase panels have opaque backgrounds. It would also reorder layers (shader under the element's own translucent background and `backdrop-blur`), break `mix-blend-screen` overlays, and ignore `overflow-hidden` clipping, transforms and modal stacking. Every container would need restyling.
  - *Option B, one canvas on top of the DOM:* rejected. Background shaders would cover text and controls.
  - **Chosen, option C: a shared off-screen WebGL context, blitted into 2D canvases.** Each `ShaderCanvas` keeps a `<canvas>` in place, but uses a **2D** context. The engine renders every on-screen surface into one off-screen WebGL canvas and copies each region out with `drawImage`. 2D canvases do not count toward the WebGL context limit. Because the surface stays in the DOM, stacking, opacity, blend modes, border-radius clipping and transforms behave exactly as before. So no component needed any change.
  - **Atlas packing:** the first version rendered surfaces one at a time into the same region. Each `drawImage` then forced a GPU resolve, which cost about 0.3 ms per surface regardless of shader cost. Surfaces are now shelf-packed into one atlas (max 2048², overflow spills into extra pages). The buffer is resolved once per page.
- **Implementation Details**:
  - `core/unified/UnifiedShaderEngine.ts`: rewritten. Off-screen canvas, `antialias: false` (full-quad passes gain nothing from MSAA), and a shelf-packed atlas with layout reads before canvas writes. Off-screen surfaces are skipped per frame. Color tokens and `reducedMotion`/`globalSpeed` are bound from the globals. The frame delta is capped at 0.1 s. Context loss is handled (the `ShaderEngine` is rebuilt on restore), compile errors are reported per surface through `onError`, and `destroy()` calls `WEBGL_lose_context`, so StrictMode double-mounts release the context immediately.
  - `core/unified/types.ts`: `RegisteredElement` is replaced by `RegisteredSurface`/`SurfaceState`. Added `UnifiedGlobals` and `UnifiedStats`.
  - `core/unified/useUnifiedShader.ts`: registers once per surface and pushes prop changes through `engine.update`. The `uniforms` prop now updates live (previously it was captured once).
  - `core/unified/UnifiedContext.tsx`: no longer renders a DOM canvas or wrapper. It owns the engine lifecycle and takes `globals` and `enabled`. `ShaderProvider` mounts it automatically, and the master shader toggle releases the context entirely.
  - `core/ShaderCanvas.tsx`: now a thin slot (a 2D canvas plus `useUnifiedShader`). Removed the per-element `getContext('webgl')`, the RAF loop, the `IntersectionObserver` and the dead pointer handlers (the wrapper is `pointer-events-none`, so they never fired).
  - `core/ShaderContext.tsx`: memoized context-count callbacks, builds `UnifiedGlobals`, mounts `UnifiedCanvasProvider`.
  - `canvas-ui/PureCanvasView.tsx`: counts its own (separate) context. `showcase/SystemTokens.tsx`: shows real engine stats (registered and on-screen surfaces).
- **Verification & Outcome**:
  - `npm run build` (`tsc && vite build`): passes.
  - Components tab after a full scroll-through: 24 DOM shader canvases, **0** of them holding a WebGL context (checked with `getContext('2d') !== null`). 1 shared context in total. With the modal open: 27 surfaces, still 0 per-element contexts.
  - Tokens tab counter: 1, then 0 with *Master Shader Toggle* off, then 1 again when turned back on.
  - Visual parity: screenshots of the hero, buttons, forms, tabs, progress and modal sections match the pre-migration baseline.
  - Pixel check: a Studio shader `vec4(v_uv, u_hover, 1)` reads (128,127,0,255) at the center. On synthetic hover it reads (128,127,255,255), and it returns to 0 after leaving. Compile errors show in the red overlay and clear once the code is fixed.
  - Timing (synchronous benchmark, DPR 1, showcase surface sizes): per-surface blits took 6.6 ms/frame for 22 surfaces. The atlas takes **4.3 ms/frame for 22 surfaces** and **8.4 ms/frame for 66**. Live page: **60.3 fps** (worst frame 17.2 ms) at DPR 2 with the browser visible. An fps measurement of the old per-element code could not be taken because the browser pane was hidden during that run.
  - Fresh tab through all four app tabs: no console errors.
- **Known remaining gaps**: `u_mouse` is still fixed at center (the components don't track pointer position). The Pure Canvas tab runs a second, separate context (2 in total while it is open).

---

### [2026-10-03] — Milestone 6: Rebuild as an HTML-in-Canvas × WebGPU Shader UI Kit (v0.4.0-canvas)
- **Context & Motivation**:
  - The user asked for a "real shader UI kit" in this experimental project, with permission to rebuild every element without migration, using modern features such as HTML-in-Canvas.
  - Previous generations could only decorate HTML: shaders drew *behind* DOM text (Milestones 1–5) or replaced the DOM with SDF widgets that lost accessibility (Pure Canvas, Milestone 3). Neither could act on the content itself, refract what is really behind an element, or composite layers.
- **Architectural Decision**:
  - **HTML-in-Canvas (WICG, Chromium 155+ shape)**: `<canvas content="drawable">` lays out its `drawable` children (layout, hit testing, focus, a11y stay native) without painting them. `GPUQueue.drawElementImageToTexture()` rasterizes a child into a WebGPU texture. `canvas.updateElementGeometry()` keeps hit testing aligned with where it is drawn, and the canvas `paint` event (with `changedElements`) plus `requestPaint()` drive updates. Pre-155 names (`layoutsubtree`, `texElementImage2D`) are detected and reported, not supported. All API calls are isolated in `kit/gpu/htmlInCanvas.ts`.
  - **Canvas-only (user decision)**: browsers without the API get a gate screen with a live capability checklist and setup steps. There is no DOM fallback.
  - **WebGPU + WGSL (user decision)** instead of WebGL2/GLSL: one device, explicit bind group layouts, storage buffers, async pipeline creation, compute available for future work. Old GLSL presets were ported to WGSL materials.
  - **Layer/surface model**: *layers* are direct drawable children of the canvas (page, nav, overlays via portal). *Surfaces* are any elements that register a material. Per frame, for each layer in z-order: its surfaces are drawn in DOM order, then the layer's HTML snapshot is composited through **content effects** (ripple, liquid, glitch, pixelate, chroma, hologram, dissolve) scoped to the surfaces' shapes. Backdrop materials (glass, frost) get a scene-region copy first, so they truly refract and blur everything painted below them, including other layers' live HTML.
  - **Tokens**: CSS custom properties (`--sfx-*`, 4 themes via `data-theme`) are the single source for Tailwind (`sfx-*` colors) and the GPU frame uniform. This removes the old Tailwind/runtime palette split.
  - Fonts are self-hosted (`@fontsource-variable/*`) because HTML-in-Canvas snapshots leave out cross-origin resources.
- **Implementation Details**:
  - Removed: `src/components`, `src/core` (ShaderEngine, ShaderCanvas, unified engine), `src/canvas-ui`, `src/shaders` (GLSL), `src/showcase`, `src/index.ts`. The uncommitted Milestone 5 shared-context code was removed with them.
  - `src/kit/gpu/`: `Renderer.ts` (layers, surfaces, eased interaction state, backdrop copies, content and present passes, material registry with `setMaterial()` for live WGSL, lazy context configuration for StrictMode safety), `layout.ts` (Frame 160 B and Surface 144 B byte layouts), `wgsl/common.ts` (structs, SDF/noise helpers, instanced vertex stage, shared focus ring), `wgsl/materials.ts` (18 materials: solid, glass, frost, aurora, plasma, grid, electric, hologram, dither, starfield, ripple, pill, switch, slider, check, progress, ring, indicator), `wgsl/content.ts` (content-effect compositor and present pass with vignette/grain), `support.ts`, `htmlInCanvas.ts`.
  - `src/kit/stage/`: `Stage` (gate or canvas, device-loss rebuild), `Layer` (drawable child, `portal` for overlays), `useSurface`, `Surface`, `htmlContentSource`, `UnsupportedGate`.
  - `src/kit/components/`: Button, Card, Input, Textarea, Switch, Slider, Checkbox, Badge, Progress, Avatar, Tabs (liquid indicator), Modal (frost scrim + dissolving glass panel, focus trap), Select (listbox popup on its own glass layer), Tooltip (hologram layer). All are native elements with no CSS backgrounds under surfaces, and focus rings are drawn by the shader.
  - `src/app/`: showcase with a starfield background layer, scrolling page layer, glass nav layer, sections for components, forms, materials, live-HTML effects, data display, and a WGSL Studio (live compile with line-mapped errors, applied to real components).
  - `src/kit/dev/selfTest.ts` (`window.__sfxSelfTest()` in dev): compiles all materials and renders them plus every content effect off-screen with synthetic content, without HTML-in-Canvas.
- **Verification & Outcome**:
  - `npm run build` (`tsc && vite build`): passes.
  - In-app browser (Chromium 152, WebGPU, no HTML-in-Canvas):
    - The gate screen correctly reports WebGPU ✓, adapter ✓, Chromium 152 < 155 ✕ and the three API entry points ✕.
    - GPU self-test: 18/18 materials compile. All 7 content effects composite text. Frame CPU time 0.6–1.7 ms for 25 surfaces with 2 backdrop copies.
    - On-screen swap-chain path (normal DOM divs over a normal canvas, DPR 2, 2048×1536): 13 surfaces at 0.2 ms CPU per frame. Glass visibly refracts and blurs the grid behind it. Synthetic pointer events produce hover rings and a press shockwave.
  - **Not yet verified:** the live HTML-in-Canvas path (snapshot upload, `updateElementGeometry` hit-test alignment, paint-event loop) needs Chrome 155+ with `chrome://flags/#canvas-draw-element`. The `canvasTransform` convention (`translate(x,y)·scale(dpr)` in backing-store px) is the first thing to confirm there.

---

### [2026-10-03] — Milestone 6.1: First Live Run in Chrome 154: Black Screen Diagnosis & Fixes
- **Context & Motivation**:
  - The user reported "nothing works". Their Chrome 154 (flag enabled) showed a black screen with no interaction. This was the first time the HTML-in-Canvas path ran at all.
- **Root Causes (measured with probes in the user's Chrome via Claude in Chrome)**:
  1. **Opt-in attribute.** Chrome 154 only honours `layoutsubtree`. The explainer's newer `content="drawable"` is ignored, so the canvas children got no layout boxes (every layer 0×0, no hit testing).
  2. **Canvas-child layout.** Children are forced to `position: static` and each is laid out independently at the canvas origin. `absolute inset-0` layers collapsed (the background layer was 0×0, and the page layer was content-height, so it couldn't scroll).
  3. **Upload signature.** Chrome 154's `GPUQueue.drawElementImageToTexture(source, destination)` takes `{ source: el }` and `{ destination: { texture } }` (dictionary `GPUCopyElementImageDestination`), not the explainer's `{ texture, size }`. The TypeError was thrown inside the paint handler on every frame, so nothing was ever presented. The legacy `copyElementImageToTexture` also exists, with a different source dictionary.
  4. **Stale modules (environment).** The user's dev server served the kit through `/@fs/C:/Work/...`, meaning it was started from a differently-cased path. On Windows this breaks Vite's file watching, and edits never reached the browser.
  5. **Performance.** On the user's Intel Gen-9 iGPU at DPR 2 (3284×1560, 5.1 Mpx) the page ran at 15 fps. Isolation runs: `render()` stubbed out gave 52–60 fps. A clear-and-present-only frame gave 52 fps at DPR 2 and 60 at DPR 1. The full scene gave 52 fps at DPR 1, 27 at 1.5 and 15 at 2. Swapping glass for solid, removing the starfield, or removing content composites each gained only 0–4 fps, so the cost is fill rate. Separately, CSS `animate-pulse` on badge dots made the browser re-rasterize the whole page layer every frame (2 changed elements per frame; 0.1 with CSS animations off).
- **Architectural Decision**:
  - Set both opt-in attributes (`layoutsubtree` and `content="drawable"`).
  - Layers are static, full-size blocks by default (`fill` → width/height 100%), and absolutely positioned content lives in a `relative` wrapper inside the layer.
  - **Overlay placement**: margins are computed but don't move canvas children, and `updateElementGeometry(translate…)` moved neither the drawing position nor hit testing in Chrome 154. A **CSS `transform: translate()` on the layer does move hit testing and `getBoundingClientRect`, and the snapshot still draws correctly**, so `Layer at={{ left, top }}` is a translate. A renderer-side draw offset was tried and reverted.
  - **Clipped shadows** (reported by the user): `glow()` radii were in device px while quad margins are in CSS px, so at scale 1 the drop shadow was still ~17% opaque at the quad edge and showed as a dark rectangle. `glow()` radii are now CSS px (× `frame.dpr`). The material wrapper multiplies everything outside the shape by an edge fade that reaches 0 at the quad margin, so no material can end in a hard line. The shadow radius dropped from 10 to 5 CSS px.
  - The upload adapter tries the explainer shape first, falls back to the Chrome 154 nested shape on TypeError, and remembers which one works. A failed upload is caught per layer, so it can't kill the frame.
  - **Adaptive resolution** (`renderer.renderScale = 'auto'`): start at the display DPR (max 2) and drop by 0.25 after two consecutive one-second windows below 48 fps, down to a minimum of 1. It never climbs back automatically, to avoid oscillating at the vsync cap. This works because the snapshots rasterize at the canvas backing-store scale (measured: a 120×40 CSS element on a 2×-backed canvas produced a 240×80 snapshot), so text and shaders stay consistent at any scale.
  - Badge dots are static. Rule: no continuous CSS animations inside layers.
  - The starfield uses a fixed star scale (its size was relative to the surface, which produced blobs at full screen).
  - `pagehide` destroys the renderer. The tab crashed ("Target crashed") twice while reloading mid-frame; the cause is unconfirmed, so this is a precaution.
- **Implementation Details**: `gpu/htmlInCanvas.ts` (attributes, upload adapter), `stage/Layer.tsx` (`fill`, `at`), `components/Overlay.tsx`, `app/App.tsx`, `gpu/Renderer.ts` (renderScale/adaptScale, `fps`/`scale` stats, per-layer upload guard), `components/Display.tsx`, `wgsl/materials.ts` (starfield), `stage/Stage.tsx` (pagehide, dev `window.__sfxRenderer`), `app/NavBar.tsx` (fps · scale badge), `.claude/launch.json` (port 5174).
- **Verification & Outcome** (user's Chrome 154, Intel Gen-9, via Claude in Chrome):
  - Layers lay out at 1642×780 (background and page) and 1642×80 (nav).
  - The page renders with real HTML through WebGPU: liquid content effect on live text, nav glass refracting the scrolling page, progress bars, tab indicator, avatar rings, badges, Studio material compiled and applied. No console errors.
  - Hit testing: `elementFromPoint` at the layout centers returns the right buttons in the page and nav layers. Real mouse clicks: "Data" in the nav (scrolled the page layer) and the "Members" tab (`aria-selected` switched).
  - Auto scale settled at 1.0, giving **60 fps** (was 15).
  - Select overlay: the popup draws under its trigger (zoomed screenshot), a real click on "Aurora" switches `data-theme` to `aurora` and closes the popup, and the theme re-reads into the shaders.
  - Shadows: a zoomed screenshot of the materials grid shows soft card shadows with no rectangular cut-offs.
  - GPU self-test (in-app browser): 18/18 materials compile, and all 7 content effects have coverage.
  - `npm run build` passes.
  - Not yet exercised live: Modal (frost + dissolve), Tooltip, keyboard focus rings, and whether the reload crash still happens with the `pagehide` precaution.

---

### [2026-10-03] — Milestone 6.2: Tighter Shadows & GitHub Pages Deployment
- **Context & Motivation**: The user asked for smaller shadows and everything needed to publish on GitHub Pages.
- **Architectural Decision**:
  - Contact shadow (`SHADOW` in `wgsl/materials.ts`): radius 5 → 2.5 CSS px, opacity 0.4 → 0.35, no offset.
  - Deployment through GitHub Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`) rather than a `gh-pages` branch: no build output in git, and a deploy runs on every push to `main`.
  - Base path from `PAGES_REPO` (repo name only). Passing `/sfx-ui/` was rewritten to `/Program Files/Git/sfx-ui/` by Git Bash during local Windows builds.
  - Optional `ORIGIN_TRIAL_TOKEN` repository variable, injected by a small Vite plugin as `<meta http-equiv="origin-trial">`, so trial-covered Chrome versions don't need the flag.
  - Auto-scale ignores measurement windows longer than 2 s (hidden-tab pauses), which previously counted as slow seconds.
  - Added `public/favicon.svg` (the old `/vite.svg` link was a 404).
- **Implementation Details**: `vite.config.ts`, `.github/workflows/pages.yml`, `index.html`, `public/favicon.svg`, `wgsl/materials.ts`, `gpu/Renderer.ts`, README "Deploying to GitHub Pages".
- **Verification & Outcome**:
  - `PAGES_REPO=sfx-ui npm run build`: asset, font and favicon URLs are all under `/sfx-ui/`, and no token meta is emitted without a token. With a test token, the meta is injected.
  - Production bundle served by `vite preview` at `/sfx-ui/` in the user's Chrome 154: renders (screenshot), both self-hosted fonts load, there are no failed requests, and the dev hooks are absent.
  - A zoomed screenshot shows the tighter shadow with no clipping.
  - The workflow itself has not run yet: Pages must be enabled and the change pushed.

---

### [2026-10-03] — Milestone 6.3: Mixed-Resolution Rendering & Quality Switch
- **Context & Motivation**: The user asked why the page turned blurry after a few seconds while fps rose. The auto resolution from 6.1 lowered the whole canvas, text included, to 1× on their 2× display, and never climbed back. The user chose "keep text sharp, lower only shaders", plus a user-facing quality switch.
- **Measurement first** (user's Chrome 154, Intel Gen-9, GPU time per frame via `render()` + `onSubmittedWorkDone()` with the tab hidden, so absolute values are inflated): at 2×, full 137 ms, surfaces only 115, content only 48, clear + present 47. Shader surfaces are the cost and HTML content is nearly free, so lowering only the surface resolution targets the right thing.
- **Architectural Decision**:
  - Two scales: content `cs` (canvas backing store and HTML snapshots) and material `ms` (surfaces).
  - **Mixed path** (`ms < cs`): per layer, surfaces render into a material-res `layerBuf`. Glass samples `layerCopy` (this layer's earlier surfaces) over `sceneCopy` (lower layers), so refraction stays exact across and within layers. The upsample is merged into the layer's content pass (`content + surfaces·(1−a)`); only layers without HTML need a separate resolve pass.
  - **Direct path** (`ms == cs`): surfaces draw straight into the scene as before, with no extra passes.
  - The scene pass opens lazily, so the first clear doesn't cost an empty full-res pass.
  - `Quality = 'sharp' | 'auto' | 'fast'` replaces `renderScale`:
    - sharp: text 2×, shaders 2×.
    - auto: text 2×; shaders step down 0.25 per two slow seconds, to a minimum of 0.5.
    - fast: text 1×, shaders 1×.
    - `Stage quality`, `renderer.setQuality()`, a nav Select, and the choice persists in localStorage.
  - `Select` gained `hideLabel`, so both nav selects have accessible names.
  - The grid material's sky stars are sized in CSS px (they became blocky squares at low shader resolution).
- **Implementation Details**: `gpu/Renderer.ts` (rewritten frame: plans, two frame uniforms, `layerBuf`/`layerCopy`/`sceneCopy`, direct/mixed encode, quality API, stats `quality/contentScale/materialScale`), `wgsl/common.ts` (`layerBackdrop` binding, `backdropAt` composite), `wgsl/content.ts` (LayerU 304 B with resolve and regionScale, content pass composites `layerBuf`, new `RESOLVE_WGSL`), `gpu/layout.ts`, `stage/Stage.tsx`, `app/App.tsx`, `app/NavBar.tsx`, `components/Overlay.tsx`, `wgsl/materials.ts`.
- **Verification & Outcome**:
  - `tsc --noEmit` passes.
  - GPU self-test (direct path): 18/18 materials compile, all 7 effects have coverage, and sampled pixels are identical to before.
  - Mixed-path harness in the in-app browser (text 2×, shaders 1×): crisp text, glass refracting across layers (nav over card) and within a layer (input over card), via the merged content pass.
  - User's Chrome, visible tab:
    - sharp 13–16 fps;
    - auto settles at text 2×, shaders 0.5×, **26–31 fps**, and a zoomed screenshot confirms crisp body text;
    - fast 39–41 fps on the hero view.
  - Limitation: on this GPU, clear + present of a 5 Mpx frame alone caps near 52 fps, so full-resolution text can't reach 60 there. A single-pass final compositor (all layers composited in one full-res pass) is the next candidate.

---

### [2026-10-03] — Milestone 6.4: Dev / Production Structure with Release-Branch Deploys
- **Context & Motivation**: The user wants the project ready for development and production, deploying from a release branch, with deploy settings in a separate folder.
- **Architectural Decision**:
  - `main` = development: `ci.yml` runs `npm ci`, typecheck and the Pages build on every push and PR. Building the production variant catches base-path issues early.
  - `release` = production: `deploy.yml` builds `--mode pages` and publishes with `actions/deploy-pages` on every push to `release` (plus manual dispatch). It replaces the main-triggered `pages.yml` from 6.2.
  - `deploy/` holds production settings (`.env.pages`: `PAGES_REPO`, optional `ORIGIN_TRIAL_TOKEN`; `*.local` overrides stay gitignored) and the runbook (`deploy/README.md`: one-time setup, release, rollback, local production preview).
  - `vite.config.ts` reads `deploy/.env[.mode][.local]` itself rather than through `loadEnv`, because CI passes unset repository variables as empty strings, and `loadEnv` lets an empty value override the file. Non-empty environment variables still win.
  - Scripts: `typecheck`, `build:pages`, `preview:pages`. Node 20 via `.nvmrc` and `engines`.
- **Verification & Outcome**:
  - `npm run build:pages` puts asset, font and favicon URLs under `/sfx-ui/` with no token meta.
  - Setting `ORIGIN_TRIAL_TOKEN` in the environment injects the meta; a blank value is ignored.
  - A plain `vite build` keeps base `/`.
  - The workflows have not run yet: this needs the one-time setup in `deploy/README.md` (Pages source = GitHub Actions, and the `release` branch allowed in the `github-pages` environment) and a push.

---

### [2026-10-03] — Milestone 6.5: First Production Release, Origin Trial & Branch Cleanup
- **Context & Motivation**: First deployment of the 6.4 setup to https://kpsolo.github.io/sfx-ui/. The user then provided an HTML-in-Canvas origin-trial token and asked to remove the stale branches.
- **Root Cause (first deploy served a blank page)**: The live HTML loaded `/src/main.tsx` and `/favicon.svg` (both 404), so the raw repository files had been published. Actions showed two deploys on `release`: our "Deploy to GitHub Pages" and GitHub's own **"pages build and deployment"** (`pages-build-deployment`). The latter exists only while the Pages source is "Deploy from a branch"; it ran after ours and overwrote the built site. A later re-run of that same workflow republished the source again. Fix: Pages source = **GitHub Actions**, then run "Deploy to GitHub Pages". Documented in `deploy/README.md` Troubleshooting and CLAUDE.md §5.
- **Architectural Decision**:
  - Origin-trial token stored in `deploy/.env.pages`. `gh` isn't installed, so the repository-variable route wasn't available; tokens are public anyway. Decoded payload: origin `https://kpsolo.github.io:443`, feature `HTMLInCanvas`, **expiry 2026-10-20 00:00 UTC**. Renewal steps are in `deploy/README.md`.
  - Remote branches reduced to `main` (default) and `release`. `master` and `deploy` pointed at `fd8ed2c`, which is in `main`'s history, so nothing was lost.
- **Verification & Outcome** (user's Chrome 154):
  - After the source switch, the live site loads `/sfx-ui/assets/index-*.js`, renders 3 layers, loads both self-hosted fonts and the animated favicon, has no failed requests and a clean console, and the dev hooks are stripped.
  - A real click on the nav "Data" button scrolled the page layer.
  - Token release (`521f6e4`): the meta tag was live about 40 s after the push (curl poll), with no origin-trial console warnings.
  - Not verifiable here: the token's effect in a Chrome without the flag (the user's Chrome has the flag on).
  - `git ls-remote` shows only `main` and `release` at `521f6e4`.

---

## Future Roadmap & Architecture Proposals
- **Renew the origin-trial token before 2026-10-20**, and move it to the `ORIGIN_TRIAL_TOKEN` repository variable once `gh` or web access to settings is convenient (renewal then needs no commit).
- **Single-pass final compositor:** composite all layers (upsampled surfaces + HTML content) in one full-resolution pass, to lift the ~52 fps ceiling a 5 Mpx frame hits on integrated GPUs and improve Auto beyond ~29 fps.
- **Reload crash:** Chrome 154 crashed the tab ("Target crashed") several times when navigating away from the live canvas, even with the GPU released on `pagehide`. Reduce to a minimal repro and report it if it's a Chromium bug.
- **Live verification gaps:** Modal (frost + dissolve), Tooltip, keyboard focus rings, and the origin-trial path without the flag.
- **WebGPU compute:** particles and simulations driven by compute shaders inside materials (the device and bind-group plumbing already exist).
- **Track API renames:** when Chrome 155+ ships the explainer shapes (`content="drawable"`, `{ texture, size }` destinations, `updateElementGeometry` hit testing), drop the Chrome 154 fallbacks in `gpu/htmlInCanvas.ts`.
