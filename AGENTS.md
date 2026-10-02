# SFX-UI Project Guidelines & Rules

## 1. Mandatory Decision & Evolution Logging
Whenever any of the following occur during development:
1. **Architectural Decisions or Pivots** (e.g., changes to rendering pipelines, WebGL vs. WebGPU choices, context management strategies, canvas layout engines).
2. **Core Engine Refactoring** (e.g., modifying `ShaderEngine`, `UnifiedShaderEngine`, `PureCanvasEngine`, uniform binding conventions, or vertex geometries).
3. **New Shader Presets or SDF Mathematical Models** (e.g., adding new SDF distance equations, noise algorithms, lighting/shading models, or post-processing filters).
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
- **GPU Context Discipline**:
  - Always enforce single-context architectures (either DOM-coordinated multi-scissor rendering or pure SDF canvas rendering) to stay strictly within the browser's 16-context ceiling.
- **Clean Lifecycle Management**:
  - All WebGL programs, shaders, buffers, and DOM/window event listeners must be properly deleted and unbound inside lifecycle `destroy()` methods to prevent memory leaks and React 18 StrictMode double-binding bugs.
- **Shader Portability**:
  - Avoid proprietary or non-standard GLSL extensions without analytical fallbacks (e.g., avoid bare `fwidth()` in WebGL 1 without `GL_OES_standard_derivatives`).
- **Interactive Controls**:
  - All interactive canvas controls (buttons, sliders, switches) must feature explicit Signed Distance Field (SDF) tactile feedback (knobs, glowing rings, press states, and cursor updates) and support pointer capture for reliable off-boundary dragging.

---

## 3. Project Commands
- **Dev Server**: `npm run dev` (runs at `http://localhost:5173/`)
- **Typecheck & Production Build**: `npm run build` (`tsc && vite build`)
- **Preview Build**: `npm run preview`
