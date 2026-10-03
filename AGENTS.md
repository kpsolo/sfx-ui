# SFX-UI Project Guidelines & Rules

## 1. Mandatory Decision & Evolution Logging
Whenever any of the following occur during development:
1. **Architectural Decisions or Pivots** (e.g., changes to rendering pipelines, WebGL vs. WebGPU choices, context management strategies, canvas layout engines).
2. **Core Engine Refactoring** (e.g., modifying `Renderer`, `htmlInCanvas.ts`, the WGSL struct layouts in `layout.ts`, bind group layouts, or the frame pass order).
3. **New Materials, Content Effects or SDF Mathematical Models** (e.g., adding new SDF distance equations, noise algorithms, lighting/shading models, or post-processing filters).
4. **Root Cause Diagnoses & Bug Fixes** (e.g., resolving context loss, event listener leaks, coordinate mapping bugs, or compilation barriers).

The agent/developer **MUST** immediately append a detailed entry into [`history.md`](file:///c:/work/sfx-ui/history.md).

### Required Entry Structure:
- **Date & Version / Milestone Tag**
- **Context & Motivation**: Why the change, fix, or feature was needed.
- **Architectural Decision**: The options considered and the explicit rationale for the selected approach.
- **Implementation Details**: Key classes, shaders, uniforms, or components modified.
- **Verification & Outcome**: Concrete verification results (automated test runs, browser profiling, or build outputs).

---

## 2. Technical & Performance Constraints
- **One Stage, One Device**:
  - The app renders through exactly one `<Stage>`: one WebGPU device, one canvas. Never create another canvas, GPU context or device for UI. Everything is a `Layer` (direct drawable child of the stage canvas) with `Surface`s.
- **HTML-in-Canvas Discipline**:
  - Canvas-only by decision: no DOM fallback rendering. Unsupported browsers see the gate.
  - All experimental API calls live in `src/kit/gpu/htmlInCanvas.ts`. The API is still being renamed (Chrome 154 and the explainer differ), so never call it anywhere else. Record measured browser behaviour there.
  - Layers must be direct canvas children (`Layer`, or `Layer portal` for overlays).
  - Canvas children are forced to `position: static`, all laid out at the canvas origin, and margins don't move them. Size layers with `fill` (100%/100%) and place overlays with `Layer at={{ left, top }}` (a CSS translate, which moves hit testing too). Never use `absolute`/`inset`/margins on a layer itself.
  - No continuous CSS animations (`animate-*`, looping transitions) inside layers: any change re-rasterizes the whole layer snapshot every frame. Animate on the GPU through surface `value`/`fxAmount` instead.
  - Don't paint CSS backgrounds under a surface: the HTML snapshot is composited *over* surfaces.
  - Only same-origin resources render (fonts are self-hosted; avatars/images must be same-origin). Scrollbars are not drawn.
- **Clean Lifecycle Management**:
  - GPU textures/buffers, rAF loops, observers and DOM/window listeners must be released in `destroy()` or effect cleanup, to prevent leaks and React 18 StrictMode double-binding bugs. A discarded renderer must never touch the canvas context (it is configured lazily on first render).
- **Shader Portability (WGSL)**:
  - Sample with `textureSampleLevel` (no uniformity requirement). Use analytic 1px anti-aliasing on SDF distances in device px (`fill`, `stroke`), not derivatives. Materials return **premultiplied** color.
  - Keep `layout.ts` byte layouts and the WGSL structs in lockstep.
  - Lengths in materials are device px at the current resolution scale: multiply CSS-px constants by `frame.dpr` (`glow()` radii already are CSS px). Anything drawn outside the shape must fit inside `shape.margin`; the wrapper fades it to zero at the margin.
- **Performance**:
  - Shader surfaces dominate frame cost on integrated GPUs; HTML content is cheap. Text always renders at the content scale (full DPR except in `fast`). Only surfaces drop to the material scale in `auto` (mixed resolution: material-res layer buffer, upsampled inside the content pass). Never trade text sharpness for speed silently.
  - Quality is `'sharp' | 'auto' | 'fast'` (`Stage quality`, `renderer.setQuality`). Judge performance with the nav badge or `getStats().fps / contentScale / materialScale`. Measured on an Intel Gen-9 iGPU at DPR 2: sharp ~13 fps, auto ~29 fps with crisp text, fast ~40 fps.
- **Interactive Controls**:
  - Controls are native elements (`button`, `input[type=range|checkbox]`, `role=switch/tab/listbox/dialog`) for input, focus and a11y. Their visuals are SDF materials with explicit tactile feedback (knobs, glow rings, press states via `state`/`anim.w`) and the shared shader focus ring.

## 3. Verification
- `npm run build` must pass.
- WebGPU-only checks (any WebGPU browser, including the in-app one): in dev, `await __sfxSelfTest()` must report every material `ok` and non-zero coverage for every content effect.
- Live HTML-in-Canvas checks need Chrome with `chrome://flags/#canvas-draw-element` (verified on Chrome 154). Drive it with Claude in Chrome: check real clicks (not only `elementFromPoint`), zoomed screenshots, and the console. Say explicitly when that path could not be verified.
- On Windows, run the dev server from the exact-case path `C:\Work\sfx-ui`. If modules load from `/@fs/...`, the watcher is broken and the browser runs stale code.

---

## 4. Project Commands
- **Dev Server**: `npm run dev` (runs at `http://localhost:5173/`)
- **Typecheck**: `npm run typecheck`
- **Build**: `npm run build` (`tsc && vite build`, served from `/`)
- **Production build for GitHub Pages**: `npm run build:pages` (settings in `deploy/.env.pages`); preview it with `npm run preview:pages` at `http://localhost:4173/sfx-ui/`

## 5. Branches & Deployment
- `main` is development: `.github/workflows/ci.yml` typechecks and runs the Pages build on every push and PR.
- `release` is production: `.github/workflows/deploy.yml` publishes to GitHub Pages on every push. Never push to `release` without the user asking; it is a public deployment.
- Deployment settings and the release/rollback runbook live in `deploy/` (`deploy/README.md`). Keep deploy-specific values there, not in `vite.config.ts`.
- Only `main` and `release` exist on the remote. Live site: https://kpsolo.github.io/sfx-ui/.
- The Pages source must be **GitHub Actions**. A `pages-build-deployment` run in Actions means it's set to "Deploy from a branch", which publishes unbuilt source (blank page loading `/src/main.tsx`). Never re-run that workflow.
- The origin-trial token in `deploy/.env.pages` expires **2026-10-20**. When working near or after that date, remind the user to renew it (steps in `deploy/README.md`).
- Verify a release with `curl` on the live URL (cache-busting query) and in Chrome via Claude in Chrome. A tab in the background reports `document.hidden` and paints nothing, so take a screenshot first to bring it forward.
