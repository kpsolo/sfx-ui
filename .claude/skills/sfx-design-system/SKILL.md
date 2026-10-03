---
name: sfx-design-system
description: Build, extend, restyle or audit SFX UI kit components and tokens — Stage, Layer, Surface/useSurface, the components in src/kit/components, overlays (Modal, Select, Tooltip), theme tokens (--sfx-* CSS variables, Tailwind sfx-* colors, data-theme), accessibility, and the showcase in src/app. Use when adding or changing a component, variant, token, theme or showcase section, or when putting a material or content effect on an element.
---

# SFX Design-System Work

SFX UI is **canvas-only**: the whole app is real HTML inside one `<Stage>` (a WebGPU canvas using HTML-in-Canvas). The browser does layout, input, focus and accessibility. The GPU does every pixel. For WGSL itself, use the `sfx-shader` skill.

## Mental model

```
<Stage theme>                         one canvas, one GPU device; gate screen if unsupported
  <Layer z={-10} content={false}>     pure-shader background (no HTML snapshot)
  <Layer z={0} className="inset-0 overflow-y-auto">   the scrolling page
     components → useSurface(ref, { material, fx, ... })
  <Layer z={10}>                      floating UI; its glass refracts the layers below
  <Layer portal z={40..60}>           overlays rendered from anywhere (Select, Modal, Tooltip)
```

- **Layers** must be direct children of the canvas. Inside the tree, use `<Layer portal>`. A layer's HTML is snapshotted to a texture and composited *after* its surfaces.
- **Surfaces** (`useSurface(ref, options)` or `<Surface as=… surface={…}>`) are drawn behind the layer's HTML, in DOM order. The renderer tracks rect, hover, press, pointer position and keyboard focus by itself, so components don't wire that state.
- **Content effects** (`fx: 'ripple' | 'liquid' | 'glitch' | 'pixelate' | 'chroma' | 'hologram' | 'dissolve'`, `fxAmount` eased) distort or recolor the layer's live HTML inside the surface's shape.

## Component anatomy (match Button / Field / Display)

```tsx
export const Thing = forwardRef<HTMLDivElement, ThingProps>(function Thing({ variant = 'glass', surface, className, ...rest }, forwarded) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  useSurface(ref, { ...VARIANTS[variant], ...surface });           // a variant is a material preset
  return <div ref={ref} className={cn('relative rounded-xl text-sfx-text', className)} {...rest} />;
});
```

Rules:
- **No CSS backgrounds where a surface draws.** The HTML snapshot is composited *over* the surface, so `bg-*` hides it. Text, icons, borders on non-surface elements and `ring-*` are fine.
- **Corner radius comes from CSS** (`rounded-*` is read via computed `border-radius`). Set the shape with Tailwind, not with surface options.
- **Native elements for behavior.** Use `button`, `input`, `textarea`, `role="switch"`, `role="tab"`, `role="listbox"`, `role="dialog"`. Visual-only controls hide a native input with `opacity-0` on top of the surface (Slider, Checkbox).
- **Focus rings are drawn by the shader** (the shared ring in the material wrapper, driven by `:focus-visible`). Use `outline-none` on the native element, and give the surface `margin` ≥ 6.
- **Disabled** means native `disabled` plus a lower `intensity` (0.4–0.45).
- **Values animate on the GPU.** Pass the target `value` (switch 0/1, slider 0..1, progress 0..1, tab indicator left px) and the renderer eases it. Don't animate in React.
- **Layer layout rules (measured in Chrome 154):** canvas children are forced to `position: static`, each is laid out at the canvas origin, and margins don't move them. Full layers use the default `fill` (100%/100%), and partial layers use `fill={false}` plus a width class. **Overlays use `Layer portal at={{ left, top }}`** in viewport coordinates: it becomes a CSS `translate`, which moves the drawing, hit testing and `getBoundingClientRect` together. For size-dependent placement, render once hidden at (0, 0), measure, then set `at` (see Tooltip). Never put `absolute`/`inset`/margins on the layer element itself; absolute content goes inside a `relative` wrapper (see Modal).
- **No continuous CSS animations inside layers.** Any change re-rasterizes the whole layer snapshot every frame (measured: 2 changed elements per frame from one pulsing badge dot). Animate on the GPU instead.
- **Presence animations** mount with the "hidden" values (`fxAmount: 1`, `value: 0`) and flip them on the next frame, then unmount after the exit duration (`usePresence` in Overlay.tsx).
- **Same-origin assets only**, and fonts are self-hosted. Cross-origin images and fonts don't appear in snapshots.
- **Scroll containers:** add `sfx-scroll` (scrollbars aren't drawn anyway).

## Tokens and themes

- Source of truth: `--sfx-{primary,secondary,accent,bg,surface,text,danger,success}` as `"r g b"` in `src/index.css`, one block per `[data-theme]` (neon, aurora, ember, mono). `Stage theme` sets `data-theme` on `<html>`, and the renderer re-reads the variables on change.
- DOM: Tailwind `sfx-*` colors with opacity (`text-sfx-text/60`, `text-sfx-primary`). GPU: `frame.<token>` and `tint: '<token>' | any CSS color`.
- **New token:** add it to every theme block in `index.css`, to `THEME_TOKENS` (theme.ts), `ThemeColors` + `writeFrame` (layout.ts), the WGSL `Frame` struct (common.ts and its 160 B size), and `tailwind.config.js`. Then log it in `history.md`.
- **New theme:** add a `[data-theme='x']` block and its name to `THEMES`.

## Shipping a component

1. Add it under `src/kit/components/`, following the anatomy and rules above.
2. Export it from `src/kit/index.ts`.
3. Demo it in a `src/app/sections/*` section (all variants, disabled state, keyboard use).
4. Add a `history.md` entry if it adds a material, effect or pattern.

## Verification (report what you actually ran)

1. `npm run build`.
2. In any WebGPU browser (including the in-app one), with the dev server running, `await __sfxSelfTest()` must report all `ok`. The in-app browser shows the **gate screen**: check that it renders and lists the missing capabilities.
3. Live checks need **Chrome with `chrome://flags/#canvas-draw-element`** (verified on 154). Drive it with Claude in Chrome. A background tab has `document.hidden` set and no paint events, so take a screenshot to bring it forward. Use real clicks: `elementFromPoint` alone has passed while real clicks missed.
   - Hover, press and keyboard focus on every variant.
   - The Tab order is sensible.
   - Clicks land where elements are drawn (hit testing).
   - Select, Modal and Tooltip open, close, trap focus and respond to Escape.
   - Theme switching works.
   - The fps badge in the nav stays near the display refresh rate.

   If you can't run this path, say so.
