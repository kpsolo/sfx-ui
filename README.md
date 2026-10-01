# SFX-UI — Shader-Driven Extensible UI Design System

A modern, production-ready React design system where **every single standard UI component** (buttons, inputs, cards, dialogs, switches, sliders, checkboxes, badges, progress bars, tabs, dropdowns, tooltips, avatars, navigation) can host real-time GPU fragment shaders (WebGL / GLSL) on its surface, border, or interaction overlay.

---

## 🌟 Key Features

1. **Shader on Every Part**:
   - Any component can render a shader on its **`background`**, **`border`**, or **`overlay`**.
   - Built-in shaders include:
     - `liquid-glass`: Frosted refractive glass with chromatic dispersion & SDF rounded bounds.
     - `cyber-grid`: 3D perspective synthwave grid with horizon glow & pulse.
     - `aurora-waves`: Flowing cosmic gradient ribbon flows.
     - `electric-border`: High-voltage plasma beam tracing component perimeters.
     - `hologram-scan`: Cybernetic CRT scanlines with micro-glitch interference.
     - `plasma-flow`: Smooth fluid metaballs with vibrant multi-color blending.
     - `starfield-warp`: Hyperspace cosmic particles reacting to cursor velocity.
     - `matrix-dither`: Retro 8-bit Bayer matrix dithering over moving waves.
     - `ripple-echo`: Expanding concentric click & hover shockwaves.
     - `custom`: Arbitrary GLSL fragment shader injection with hot-reloading!

2. **Solving the WebGL Context Limit**:
   - Web browsers enforce an 8–16 active WebGL context ceiling per tab.
   - SFX-UI features an intelligent RAF lifecycle: canvas renders are paused when off-screen via `IntersectionObserver` or idle, preventing context loss and maintaining steady 60/120 FPS.

3. **Accessibility First (A11y)**:
   - Real semantic HTML elements (`<button>`, `<input>`, `<dialog>`, etc.) sit at the top z-index with native keyboard navigation, screen reader ARIA roles, and form autofill.
   - Full `prefers-reduced-motion` compliance halts time loops and transitions gracefully.
   - Zero-dependency CSS fallback mode when shaders are disabled.

4. **Live Shader Studio & Design Tokens**:
   - Interactive GLSL editor in the demo app to prototype and hot-reload fragment shaders live on real UI components.
   - Synchronized color tokens (`u_color_primary`, `u_color_accent`, `u_color_bg`) bound automatically to shader uniforms.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm

### Installation & Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build production bundle
npm run build

# Preview build
npm run preview
```

---

## 🛠️ Usage Examples

### 1. Button with Electric Border
```tsx
import { Button } from './components/Button/Button';

export function MyView() {
  return (
    <Button variant="neon" shader="electric-border" shaderTarget="border">
      Initialize Fusion
    </Button>
  );
}
```

### 2. Card with Liquid Glass Shader
```tsx
import { Card } from './components/Card/Card';

export function GlassPanel() {
  return (
    <Card variant="glass" shader="liquid-glass" cornerRadius={16}>
      <h3 className="text-lg font-bold">Quantum Reactor</h3>
      <p className="text-sm text-slate-300">Surface refracts based on cursor movement.</p>
    </Card>
  );
}
```

### 3. Custom GLSL Fragment Shader on Any Element
```tsx
import { Button } from './components/Button/Button';
import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from './shaders/common';

const myCustomShader = `
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec3 col = mix(u_color_primary.rgb, u_color_accent.rgb, sin(u_time * 2.0 + uv.x * 5.0) * 0.5 + 0.5);
  col += u_hover * 0.3;
  gl_FragColor = vec4(col, 0.9);
}
`;

export function CustomButton() {
  return (
    <Button shader="custom" customFragmentShader={myCustomShader}>
      Custom GPU Button
    </Button>
  );
}
```

---

## 📐 GLSL Uniform Contract

Every shader mounted in SFX-UI automatically receives the following uniform set:

| Uniform | Type | Range | Description |
| :--- | :--- | :--- | :--- |
| `u_time` | `float` | $0.0 \to \infty$ | Global animation clock in seconds |
| `u_resolution` | `vec2` | $[w, h]$ | Element pixel size scaled by device pixel ratio |
| `u_mouse` | `vec2` | $[0.0, 1.0]$ | Normalized cursor position relative to component |
| `u_hover` | `float` | $0.0 \to 1.0$ | Smoothly lerped hover factor |
| `u_active` | `float` | $0.0 \to 1.0$ | Click / pointerdown interaction factor |
| `u_color_primary` | `vec4` | $[r, g, b, a]$ | Primary theme brand color |
| `u_color_secondary` | `vec4` | $[r, g, b, a]$ | Secondary theme accent |
| `u_color_accent` | `vec4` | $[r, g, b, a]$ | Highlight neon glow color |
| `u_color_bg` | `vec4` | $[r, g, b, a]$ | Surface background color |
| `u_corner_radius` | `float` | $0.0 \to N$ | Corner radius for Signed Distance Field (SDF) bounds |
| `u_pixel_ratio` | `float` | $1.0 \to 2.0$ | Screen device pixel ratio |

---

## 📂 Project Structure
```
sfx-ui/
├── src/
│   ├── core/                  # WebGL Engine, Types, Context & ShaderCanvas
│   │   ├── ShaderEngine.ts    # WebGL program compilation, cache, uniform dispatch
│   │   ├── ShaderCanvas.tsx   # React WebGL canvas wrapper with RAF lifecycle
│   │   ├── ShaderContext.tsx  # Global design tokens and performance provider
│   │   ├── types.ts           # Types & interfaces
│   │   └── utils.ts           # Color converters, math & lerp helpers
│   ├── shaders/               # GLSL Fragment Shader presets
│   │   ├── common.ts          # Vertex shader, uniforms & math chunks
│   │   └── presets/           # Liquid glass, Cyber grid, Aurora, Plasma, etc.
│   ├── components/            # Standard UI component suite
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Switch/
│   │   ├── Slider/
│   │   ├── Checkbox/
│   │   ├── Badge/
│   │   ├── Progress/
│   │   ├── Modal/
│   │   ├── Tabs/
│   │   ├── Dropdown/
│   │   ├── Tooltip/
│   │   ├── Avatar/
│   │   ├── Navigation/
│   │   └── ShaderSurface.tsx  # Universal shader slot wrapper
│   └── showcase/              # Showcase App, Live Shader Studio & Token Explorer
```

---

## 📄 License
MIT
