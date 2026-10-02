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

## Future Roadmap & Architecture Proposals
- **WebGPU WGSL Native Pipeline**: Provide an optional WebGPU pipeline alongside WebGL2 for compute-driven particles and high-throughput physical simulations directly within canvas widgets.
- **Text Rasterization in Canvas**: Integrate signed distance field font rendering (msdf-bmfont) to render crisp vector typography directly in pure canvas mode without DOM overlays.
- **State Serialization**: Support exporting and importing design system token states as JSON or CSS Custom Properties.
