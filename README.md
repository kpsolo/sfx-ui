# SFX UI: HTML-in-Canvas × WebGPU Shader UI Kit

An experimental React UI kit where **every pixel comes from a WebGPU shader**, yet every element stays **real HTML**: laid out by CSS, focusable, hit-tested, selectable and readable by screen readers.

**Live demo: https://kpsolo.github.io/sfx-ui/** (Chrome with HTML-in-Canvas; see Requirements).

It is built on the WICG [HTML-in-Canvas](https://github.com/WICG/html-in-canvas) API. The page's HTML lives inside a `<canvas layoutsubtree>` (also marked `content="drawable"` for newer builds). The browser lays it out but doesn't paint it. SFX rasterizes it into GPU textures and composites it with WGSL materials. That makes things possible that CSS can't do:

- **Glass that really refracts what's behind it**, including the live HTML of other layers (the nav bar bends the page scrolling under it; the modal scrim blurs the real page).
- **Effects on the content itself**: ripple, liquid warp, glitch, pixelate, chroma split, hologram and dissolve, applied to live text and form controls that stay interactive.
- **Materials as code**: 18 built-in WGSL materials, plus a Studio for writing your own and applying it to real components as you type.

## Requirements (canvas-only)

| | |
|---|---|
| Browser | Chrome / Chromium with HTML-in-Canvas: **verified on Chrome 154**; the newer 155+ API shape is handled too |
| Enablement | `chrome://flags/#canvas-draw-element` → Enabled. On the live demo, an origin-trial token (valid until **2026-10-20**) enables it without the flag on Chrome versions covered by the trial |
| GPU | WebGPU. Text always renders at full resolution in the default **Auto** quality; only shader effects lower their resolution on slow GPUs. **Sharp** / **Auto** / **Fast** can be chosen in the nav |

Other browsers get a gate screen showing exactly which capability is missing.

> **Dev server on Windows:** start it from the exact-case path (`C:\Work\sfx-ui`). If the page loads modules from `/@fs/C:/Work/...`, Vite thinks the sources are outside its root, its file watcher misses edits, and the browser keeps running stale code.

## Commands

Node 20+ (`.nvmrc`).

```bash
npm install
npm run dev            # http://localhost:5173
npm run typecheck      # tsc --noEmit
npm run build          # build served from /
npm run build:pages    # production build for GitHub Pages (settings in deploy/.env.pages)
npm run preview:pages  # serve that build at http://localhost:4173/sfx-ui/
```

## Deploying

The repository has two branches. `main` is development: CI typechecks and builds it on every push and PR. **`release` is production: pushing to it publishes the site to GitHub Pages** at https://kpsolo.github.io/sfx-ui/ (about 40 s).

```bash
git push origin main:release
```

[`deploy/README.md`](deploy/README.md) covers the repository setup, renewing the origin-trial token (expires 2026-10-20), rollback, and troubleshooting. The most important item there: the Pages source must stay **GitHub Actions**, never "Deploy from a branch".

In dev, `await __sfxSelfTest()` in the console compiles every material and renders them, plus each content effect, off-screen. It needs WebGPU only, not HTML-in-Canvas.

## Usage

```tsx
import { Stage, Layer, Button, Card, Input } from './kit';

<Stage theme="neon">
  {/* Layers are direct children of the canvas and fill the stage by default; higher z
      refracts lower z. Canvas children are forced to position: static, so use `fill`/`at`,
      not absolute/inset classes. */}
  <Layer z={0} className="overflow-y-auto">
    <Card material="aurora" fx="ripple">
      <Input label="Still a real input" />
      <Button variant="neon">Press me</Button>
    </Card>
  </Layer>
  <Layer z={10} fill={false} className="w-full p-3">
    <Card material="glass">Floating glass refracts the page below</Card>
  </Layer>
</Stage>
```

Any element can get a surface:

```tsx
const ref = useRef<HTMLDivElement>(null);
useSurface(ref, { material: 'plasma', fx: 'liquid', fxAmount: 0.3, tint: 'accent' });
```

Custom materials:

```ts
renderer.setMaterial('mine', `
fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f {
  let d = sdRoundBox(p, s.rect.zw * 0.5, s.shape.x);
  return premul(mix(frame.primary.rgb, frame.accent.rgb, uv.x), fill(d));
}`);
```

## Architecture

```
src/kit/
  gpu/
    Renderer.ts        frame loop: layers → surfaces (DOM order) → backdrop copies → content FX → present
    htmlInCanvas.ts    every call to the experimental API (one file to update on renames)
    support.ts         capability detection for the gate
    layout.ts          byte layouts of the WGSL Frame / Surface / Layer structs
    wgsl/common.ts     structs, SDF + noise helpers, instanced vertex stage, shared focus ring
    wgsl/materials.ts  18 built-in materials
    wgsl/content.ts    content-effect compositor + present pass
  stage/               Stage (gate or canvas), Layer, Surface, useSurface, HTML content source
  components/          Button, Card, Input, Textarea, Switch, Slider, Checkbox, Badge, Progress,
                       Avatar, Tabs, Modal, Select, Tooltip
  theme.ts             --sfx-* CSS variables → GPU theme (4 themes)
  dev/selfTest.ts      off-screen GPU self test
src/app/               showcase (sections + WGSL Studio)
public/                static files copied as-is (favicon)
deploy/                production settings (.env.pages) and the release runbook
.github/workflows/     ci.yml (main + PRs) and deploy.yml (release → GitHub Pages)
```

**Theme tokens** are CSS variables (`--sfx-primary` etc., "r g b"). Tailwind's `sfx-*` colors and the shaders both read them; switching `data-theme` re-themes both.

**Rules for kit authors:** see `CLAUDE.md` and the project skills in `.claude/skills/`.

## Sources

The API is experimental and changes between Chrome versions; these are the references this kit was built against. Where they disagree with Chrome 154's actual behaviour, `src/kit/gpu/htmlInCanvas.ts` documents what was measured.

- [WICG HTML-in-Canvas explainer](https://github.com/WICG/html-in-canvas): the living spec (attributes, `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, `paint` event, `updateElementGeometry`)
- [Chrome for Developers: HTML-in-Canvas updates, iterating toward a better Web API](https://developer.chrome.com/blog/html-in-canvas-ot-changes): origin-trial changes and the Chrome 155 renames
- [WebGPU.com: Google introduces HTML-in-Canvas API](https://www.webgpu.com/news/google-html-in-canvas-webgl-webgpu/): WebGL/WebGPU entry points
- [Better Stack: HTML-in-Canvas API, rendering live DOM elements as canvas textures](https://betterstack.com/community/guides/scaling-nodejs/html-in-canvas-api/)
- [DEV Community: Google I/O 2026 and the HTML-in-Canvas API](https://dev.to/manikant92/google-io-2026-quietly-ended-a-20-year-old-web-problem-meet-the-html-in-canvas-api-4h9d): origin-trial timeline
- [Web Standards: first experiments with HTML in `<canvas>`](https://web-standards.dev/news/2026/04/html-in-canvas-experiments/)
- [html-in-canvas.dev](https://html-in-canvas.dev/): examples and `drawElementImage()` guide
- [WebGPU specification](https://www.w3.org/TR/webgpu/) and [WGSL specification](https://www.w3.org/TR/WGSL/)

## License
MIT
