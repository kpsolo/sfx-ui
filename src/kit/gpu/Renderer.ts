import { materialSource, MATERIAL_PRELUDE_LINES } from './wgsl/common';
import { BUILTIN_MATERIALS, BACKDROP_MATERIALS, MATERIAL_DEFAULTS, MATERIAL_PX_PARAMS, BuiltinMaterial } from './wgsl/materials';
import { CONTENT_WGSL, RESOLVE_WGSL, PRESENT_WGSL, CONTENT_FX, ContentFx, MAX_FX_REGIONS } from './wgsl/content';
import {
  FRAME_FLOATS, SURFACE_FLOATS, SURFACE_BYTES, LAYER_UNIFORM_BYTES, POST_BYTES,
  ThemeColors, Vec4, writeFrame, writeSurface, writeLayerUniform,
} from './layout';
import { readTheme, resolveTint, ThemeToken } from '../theme';

const SCENE_FORMAT: GPUTextureFormat = 'rgba8unorm';
const PREMULTIPLIED_BLEND: GPUBlendState = {
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
};

// Exponential easing rates (per second) for interaction state.
const EASE = { hover: 12, active: 20, focus: 14, value: 11, fx: 5 };
const PRESS_DECAY_SECONDS = 0.75;
const MAX_FRAME_DELTA = 0.1;

// Resolution model: HTML content (and the canvas backing store) renders at the content scale,
// capped at 2 device px per CSS px. Shader surfaces render at a separate material scale and are
// upsampled into the scene, so expensive shaders can run cheaper without blurring text.
const MAX_CONTENT_SCALE = 2;
const MIN_MATERIAL_SCALE = 0.5;
const AUTO_SCALE_STEP = 0.25;
const AUTO_SCALE_TARGET_FPS = 48;

/**
 * - sharp: text and shaders at full display resolution.
 * - auto: text at full resolution; shader resolution steps down while the GPU can't hold
 *   ~48 fps (measured: shader surfaces dominate frame cost on integrated GPUs).
 * - fast: text and shaders at 1× (single-resolution direct path; fastest, softer on HiDPI).
 *
 * Measured on an Intel Gen-9 iGPU at DPR 2 (Chrome 154): sharp ~13 fps, auto ~30 fps with
 * crisp text (shaders settle at 0.5×), fast ~43–60 fps.
 */
export type Quality = 'sharp' | 'auto' | 'fast';

function scaleParams(material: string, params: Vec4, scale: number): Vec4 {
  const px = MATERIAL_PX_PARAMS[material as BuiltinMaterial];
  if (!px) return params;
  return params.map((p, i) => (px.includes(i) ? p * scale : p)) as Vec4;
}

export interface SurfaceOptions {
  material: BuiltinMaterial | (string & {});
  /** Material params (vec4). Defaults per material. */
  params?: Vec4;
  /** Corner radius in CSS px. Defaults to the element's computed border-radius. */
  radius?: number;
  /** Border width in CSS px (material-specific use). */
  border?: number;
  /** Extra room around the shape for glows, shadows and the focus ring, CSS px. */
  margin?: number;
  variant?: number;
  /** Theme token or any CSS color. */
  tint?: ThemeToken | (string & {});
  /** Material value (switch on/off, slider position, progress...). Eased. */
  value?: number;
  /** Overall opacity of the surface. */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
  /** Effect applied to the layer's real HTML content inside this surface's shape. */
  fx?: ContentFx;
  fxAmount?: number;
}

export interface LayerOptions {
  z?: number;
  /** Composite the element's HTML snapshot (false for surface-only layers). */
  content?: boolean;
  opacity?: number;
}

export interface LayerGeometry {
  element: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

/** Where a layer's pixels come from (HTML-in-Canvas in production, synthetic in tests). */
export interface ContentSource {
  upload(device: GPUDevice, layer: LayerGeometry, texture: GPUTexture): void;
  syncGeometry?(canvas: HTMLCanvasElement, layer: LayerGeometry): void;
}

export interface CompileMessage {
  type: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
}

export interface MaterialResult {
  ok: boolean;
  messages: CompileMessage[];
}

export interface RendererStats {
  layers: number;
  surfaces: number;
  drawn: number;
  backdropCopies: number;
  frameMs: number;
  /** Measured paint rate over the last second. */
  fps: number;
  quality: Quality;
  /** Device px per CSS px for HTML content (the canvas backing store). */
  contentScale: number;
  /** Device px per CSS px for shader surfaces. */
  materialScale: number;
}

interface Material {
  pipeline: GPURenderPipeline;
  backdrop: boolean;
}

interface LayerRecord {
  id: number;
  element: HTMLElement;
  opts: Required<LayerOptions>;
  surfaces: SurfaceRecord[];
  orderDirty: boolean;
  dirty: boolean;
  geom: LayerGeometry;
  texture: GPUTexture | null;
  bindGroup: GPUBindGroup | null;
  bindVersion: number;
  resolveBindGroup: GPUBindGroup | null;
  resolveBindVersion: number;
  uniform: GPUBuffer;
  uniformData: ArrayBuffer;
  uploadFailed?: boolean;
}

interface SurfaceRecord {
  element: HTMLElement;
  layer: LayerRecord;
  opts: SurfaceOptions;
  radiusCss: string;
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
  hover: number;
  active: number;
  focus: number;
  value: number;
  fxAmount: number;
  time: number;
  seed: number;
  press: number;
  pointer: [number, number];
  pressOrigin: [number, number];
  index: number;
  /** CSS-px rect relative to the canvas, measured this frame. */
  css: { x: number; y: number; w: number; h: number };
  detach: () => void;
}

/** Per-layer drawing plan for one frame (CSS px regions). */
interface LayerPlan {
  draws: SurfaceRecord[];
  fx: number[];
  /** Union of drawn surfaces incl. margins. */
  bounds: [number, number, number, number] | null;
  /** Union of regions backdrop materials may sample. */
  backdropBounds: [number, number, number, number] | null;
}

export interface SurfaceHandle {
  /** Replaces the options (eased values animate from their current state). */
  update(opts: SurfaceOptions): void;
  remove(): void;
}

export interface LayerHandle {
  update(opts: Partial<LayerOptions>): void;
  /** Mark the HTML snapshot stale (normally driven by the canvas paint event). */
  invalidate(): void;
  remove(): void;
}

export interface RendererInit {
  canvas: HTMLCanvasElement;
  contentSource?: ContentSource;
  /** 'paint': render inside the canvas paint event (HTML-in-Canvas). 'raf': render in rAF. */
  loop?: 'paint' | 'raf' | 'manual';
  /** Render target instead of the canvas swap chain (self tests). */
  target?: GPUTexture;
  device?: GPUDevice;
  quality?: Quality;
  onDeviceLost?: (info: GPUDeviceLostInfo) => void;
}

type Rect = [number, number, number, number]; // x0, y0, x1, y1

function unionRect(a: Rect | null, b: Rect): Rect {
  return a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b;
}

export class Renderer {
  readonly device: GPUDevice;
  readonly canvas: HTMLCanvasElement;
  private context: GPUCanvasContext | null;
  private contextConfigured = false;
  private target: GPUTexture | null;
  private format: GPUTextureFormat;
  private contentSource?: ContentSource;
  private loopMode: 'paint' | 'raf' | 'manual';

  private sampler: GPUSampler;
  private materialLayout: GPUBindGroupLayout;
  private contentLayout: GPUBindGroupLayout;
  private resolveLayout: GPUBindGroupLayout;
  private presentLayout: GPUBindGroupLayout;
  private materialPipelineLayout: GPUPipelineLayout;
  private materials = new Map<string, Material>();
  private contentPipeline!: GPURenderPipeline;
  private resolvePipeline!: GPURenderPipeline;
  private presentPipeline!: GPURenderPipeline;

  /** Frame uniform at material resolution (surface passes). */
  private frameMatBuf: GPUBuffer;
  /** Frame uniform at content resolution (content, resolve, present). */
  private frameFullBuf: GPUBuffer;
  private frameData = new Float32Array(FRAME_FLOATS);
  private postBuf: GPUBuffer;
  private surfaceBuf: GPUBuffer;
  private surfaceData: Float32Array<ArrayBuffer>;
  private surfaceCapacity = 0;

  /** Full-res composited scene. */
  private scene: GPUTexture | null = null;
  /** Full-res copy of the scene below the current layer (what glass refracts). */
  private sceneCopy: GPUTexture | null = null;
  /** Material-res buffer the current layer's surfaces render into. */
  private layerBuf: GPUTexture | null = null;
  /** Material-res copy of layerBuf (earlier surfaces of the same layer, for backdrops). */
  private layerCopy: GPUTexture | null = null;
  private materialBindGroup: GPUBindGroup | null = null;
  private materialBindGroupDirect: GPUBindGroup | null = null;
  /** 1×1 transparent texture (zero-initialized). */
  private emptyTex: GPUTexture;
  private presentBindGroup: GPUBindGroup | null = null;
  private bindVersion = 0;
  private boundVersion = -1;

  private layers: LayerRecord[] = [];
  private layersByElement = new Map<Element, LayerRecord>();
  private nextLayerId = 1;

  private theme: ThemeColors;
  private tintCache = new Map<string, Vec4>();
  private reducedMotion = false;
  private time = 0;
  private lastNow = performance.now();
  private pointer: [number, number] = [-1e4, -1e4];
  private rafId: number | null = null;
  private destroyed = false;
  private cleanups: (() => void)[] = [];
  private stats: RendererStats = {
    layers: 0, surfaces: 0, drawn: 0, backdropCopies: 0, frameMs: 0, fps: 0,
    quality: 'auto', contentScale: 1, materialScale: 1,
  };

  post = { vignette: 0.25, grain: 0.02, scanlines: 0 };

  private quality: Quality;
  private autoScale: number | null = null;
  private perf = { frames: 0, start: performance.now(), warmup: 2, slowWindows: 0 };

  static async create(init: RendererInit): Promise<Renderer> {
    let device = init.device;
    if (!device) {
      const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) throw new Error('WebGPU adapter unavailable');
      device = await adapter.requestDevice();
    }
    const r = new Renderer(init, device);
    await r.compileBuiltins();
    r.start();
    return r;
  }

  private constructor(init: RendererInit, device: GPUDevice) {
    this.device = device;
    this.canvas = init.canvas;
    this.contentSource = init.contentSource;
    this.loopMode = init.loop ?? 'raf';
    this.target = init.target ?? null;
    this.quality = init.quality ?? 'auto';
    this.format = this.target ? this.target.format : navigator.gpu.getPreferredCanvasFormat();
    this.context = null;
    if (!this.target) {
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) throw new Error('Unable to create a WebGPU canvas context');
      // Configured lazily in render(): under StrictMode a discarded renderer must not steal
      // (or later unconfigure) the canvas context from the live one.
    }

    device.lost.then((info) => {
      if (!this.destroyed) init.onDeviceLost?.(info);
    });

    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    const F = GPUShaderStage.FRAGMENT;
    this.materialLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 1, visibility: VF, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: F, texture: { sampleType: 'float' } },
        { binding: 3, visibility: F, sampler: { type: 'filtering' } },
        { binding: 4, visibility: F, texture: { sampleType: 'float' } },
      ],
    });
    this.contentLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 1, visibility: VF, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: F, texture: { sampleType: 'float' } },
        { binding: 3, visibility: F, sampler: { type: 'filtering' } },
        { binding: 4, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 5, visibility: F, texture: { sampleType: 'float' } },
      ],
    });
    this.resolveLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 1, visibility: F, texture: { sampleType: 'float' } },
        { binding: 2, visibility: F, sampler: { type: 'filtering' } },
        { binding: 3, visibility: VF, buffer: { type: 'uniform' } },
      ],
    });
    this.presentLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
        { binding: 1, visibility: F, texture: { sampleType: 'float' } },
        { binding: 2, visibility: F, sampler: { type: 'filtering' } },
        { binding: 3, visibility: F, buffer: { type: 'uniform' } },
      ],
    });
    this.materialPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.materialLayout] });

    const uniform = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    this.frameMatBuf = device.createBuffer({ size: FRAME_FLOATS * 4, usage: uniform });
    this.frameFullBuf = device.createBuffer({ size: FRAME_FLOATS * 4, usage: uniform });
    this.postBuf = device.createBuffer({ size: POST_BYTES, usage: uniform });
    this.surfaceData = new Float32Array(0);
    this.surfaceBuf = this.allocSurfaces(64);
    this.emptyTex = device.createTexture({ size: { width: 1, height: 1 }, format: SCENE_FORMAT, usage: GPUTextureUsage.TEXTURE_BINDING });

    this.theme = readTheme(this.canvas);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mq.matches;
    const onMq = (e: MediaQueryListEvent) => (this.reducedMotion = e.matches);
    mq.addEventListener('change', onMq);
    this.cleanups.push(() => mq.removeEventListener('change', onMq));

    const onPointer = (e: PointerEvent) => (this.pointer = [e.clientX, e.clientY]);
    window.addEventListener('pointermove', onPointer, { passive: true });
    this.cleanups.push(() => window.removeEventListener('pointermove', onPointer));

    // Theme changes: any data-theme switch in the document re-reads the CSS variables.
    const mo = new MutationObserver(() => this.refreshTheme());
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    this.cleanups.push(() => mo.disconnect());
  }

  // ---------------------------------------------------------------- pipelines

  /** Compile results of the built-in materials (for diagnostics). */
  readonly builtinReport: Record<string, MaterialResult> = {};

  private async compileBuiltins() {
    const results = await Promise.all(
      Object.entries(BUILTIN_MATERIALS).map(async ([name, body]) => [name, await this.setMaterial(name, body)] as const)
    );
    for (const [name, r] of results) this.builtinReport[name] = r;
    const failed = results.filter(([, r]) => !r.ok);
    if (failed.length) {
      console.error('SFX: built-in materials failed to compile', failed);
    }

    const build = async (label: string, code: string, layout: GPUBindGroupLayout, format: GPUTextureFormat, blend?: GPUBlendState) => {
      const compiled = await this.compileModule(code);
      if (!compiled.module) throw new Error(`${label} shader: ${compiled.messages.map((m) => m.message).join('; ')}`);
      return this.device.createRenderPipelineAsync({
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        vertex: { module: compiled.module, entryPoint: 'vs' },
        fragment: { module: compiled.module, entryPoint: 'fs', targets: [{ format, blend }] },
        primitive: { topology: 'triangle-list' },
      });
    };
    [this.contentPipeline, this.resolvePipeline, this.presentPipeline] = await Promise.all([
      build('Content', CONTENT_WGSL, this.contentLayout, SCENE_FORMAT, PREMULTIPLIED_BLEND),
      build('Resolve', RESOLVE_WGSL, this.resolveLayout, SCENE_FORMAT, PREMULTIPLIED_BLEND),
      build('Present', PRESENT_WGSL, this.presentLayout, this.format),
    ]);
  }

  private async compileModule(code: string, lineOffset = 0) {
    const module = this.device.createShaderModule({ code });
    const info = await module.getCompilationInfo();
    const messages: CompileMessage[] = info.messages.map((m) => ({
      type: m.type,
      line: m.lineNum - lineOffset,
      column: m.linePos,
      message: m.message,
    }));
    return { module: messages.some((m) => m.type === 'error') ? null : module, messages };
  }

  /**
   * Registers or replaces a material. `body` must define
   *   fn material(s: Surface, p: vec2f, uv: vec2f, frag: vec2f) -> vec4f
   * Line numbers in the result are relative to `body`. On failure the previous version is kept.
   */
  async setMaterial(name: string, body: string): Promise<MaterialResult> {
    const { module, messages } = await this.compileModule(materialSource(body), MATERIAL_PRELUDE_LINES);
    if (!module) return { ok: false, messages };
    try {
      const pipeline = await this.device.createRenderPipelineAsync({
        layout: this.materialPipelineLayout,
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format: SCENE_FORMAT, blend: PREMULTIPLIED_BLEND }] },
        primitive: { topology: 'triangle-list' },
      });
      const backdrop = BACKDROP_MATERIALS.has(name) || /backdrop(At|Blur)\s*\(/.test(body);
      this.materials.set(name, { pipeline, backdrop });
      return { ok: true, messages };
    } catch (e) {
      return { ok: false, messages: [...messages, { type: 'error', line: 0, column: 0, message: String((e as Error).message ?? e) }] };
    }
  }

  hasMaterial(name: string) {
    return this.materials.has(name);
  }

  // ---------------------------------------------------------------- registry

  addLayer(element: HTMLElement, opts: LayerOptions = {}): LayerHandle {
    const uniformData = new ArrayBuffer(LAYER_UNIFORM_BYTES);
    const rec: LayerRecord = {
      id: this.nextLayerId++,
      element,
      opts: { z: opts.z ?? 0, content: opts.content ?? true, opacity: opts.opacity ?? 1 },
      surfaces: [],
      orderDirty: false,
      dirty: true,
      geom: { element, x: 0, y: 0, width: 0, height: 0, cssWidth: 0, cssHeight: 0, dpr: 1 },
      texture: null,
      bindGroup: null,
      bindVersion: -1,
      resolveBindGroup: null,
      resolveBindVersion: -1,
      uniform: this.device.createBuffer({ size: LAYER_UNIFORM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
      uniformData,
    };
    this.layers.push(rec);
    this.sortLayers();
    this.layersByElement.set(element, rec);
    return {
      update: (o) => {
        Object.assign(rec.opts, o);
        this.sortLayers();
      },
      invalidate: () => (rec.dirty = true),
      remove: () => {
        this.layers = this.layers.filter((l) => l !== rec);
        this.layersByElement.delete(element);
        for (const s of rec.surfaces) s.detach();
        rec.surfaces = [];
        rec.texture?.destroy();
        rec.uniform.destroy();
      },
    };
  }

  private sortLayers() {
    this.layers.sort((a, b) => a.opts.z - b.opts.z || a.id - b.id);
  }

  addSurface(layerElement: HTMLElement, element: HTMLElement, opts: SurfaceOptions): SurfaceHandle {
    const layer = this.layersByElement.get(layerElement);
    if (!layer) throw new Error('addSurface: layer element is not registered');

    const rec: SurfaceRecord = {
      element,
      layer,
      opts: { ...opts },
      radiusCss: getComputedStyle(element).borderTopLeftRadius,
      hovered: false,
      pressed: false,
      focused: false,
      hover: 0,
      active: 0,
      focus: 0,
      value: opts.value ?? 0,
      fxAmount: opts.fxAmount ?? 1,
      time: 0,
      seed: Math.random(),
      press: 0,
      pointer: [-1e4, -1e4],
      pressOrigin: [-1e4, -1e4],
      index: -1,
      css: { x: 0, y: 0, w: 0, h: 0 },
      detach: () => {},
    };

    const local = (e: PointerEvent): [number, number] => {
      const r = element.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onEnter = () => (rec.hovered = true);
    const onLeave = () => {
      rec.hovered = false;
      rec.pressed = false;
    };
    const onMove = (e: PointerEvent) => (rec.pointer = local(e));
    const onDown = (e: PointerEvent) => {
      rec.pressed = true;
      rec.press = 1;
      rec.pressOrigin = local(e);
      rec.pointer = rec.pressOrigin;
    };
    const onUp = () => (rec.pressed = false);
    const onFocusIn = () => {
      const a = document.activeElement;
      rec.focused = Boolean(a && a.matches(':focus-visible'));
    };
    const onFocusOut = () => (rec.focused = false);
    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    element.addEventListener('focusin', onFocusIn);
    element.addEventListener('focusout', onFocusOut);
    rec.detach = () => {
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('focusin', onFocusIn);
      element.removeEventListener('focusout', onFocusOut);
    };

    layer.surfaces.push(rec);
    layer.orderDirty = true;

    return {
      update: (o) => {
        rec.opts = { ...o };
        rec.radiusCss = getComputedStyle(element).borderTopLeftRadius;
      },
      remove: () => {
        rec.detach();
        layer.surfaces = layer.surfaces.filter((s) => s !== rec);
      },
    };
  }

  /** Re-reads the --sfx-* CSS variables. */
  refreshTheme() {
    this.theme = readTheme(this.canvas);
    this.tintCache.clear();
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  /** Switches quality; 'auto' restarts its measurement from full shader resolution. */
  setQuality(quality: Quality) {
    this.quality = quality;
    this.autoScale = null;
    this.perf = { frames: 0, start: performance.now(), warmup: 2, slowWindows: 0 };
  }

  getQuality(): Quality {
    return this.quality;
  }

  getStats(): RendererStats {
    return { ...this.stats };
  }

  // ---------------------------------------------------------------- frame loop

  private start() {
    if (this.loopMode === 'manual') return;
    if (this.loopMode === 'paint') {
      const onPaint = (e: Event) => {
        const changed = (e as Event & { changedElements?: readonly Element[] }).changedElements ?? [];
        this.render(performance.now(), changed);
      };
      this.canvas.addEventListener('paint', onPaint);
      this.cleanups.push(() => this.canvas.removeEventListener('paint', onPaint));
    }
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      if (this.loopMode === 'paint') {
        (this.canvas as HTMLCanvasElement & { requestPaint(): void }).requestPaint();
      } else {
        this.render(performance.now());
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private allocSurfaces(capacity: number): GPUBuffer {
    this.surfaceCapacity = capacity;
    this.surfaceData = new Float32Array(capacity * SURFACE_FLOATS);
    this.bindVersion++;
    return this.device.createBuffer({ size: capacity * SURFACE_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  }

  private ensureTargets(W: number, H: number, Wm: number, Hm: number) {
    const same = (t: GPUTexture | null, w: number, h: number) => t && t.width === w && t.height === h;
    if (same(this.scene, W, H) && same(this.layerBuf, Wm, Hm)) return;
    for (const t of [this.scene, this.sceneCopy, this.layerBuf, this.layerCopy]) t?.destroy();
    const tex = (w: number, h: number, usage: number) =>
      this.device.createTexture({ size: { width: w, height: h }, format: SCENE_FORMAT, usage });
    const U = GPUTextureUsage;
    this.scene = tex(W, H, U.RENDER_ATTACHMENT | U.TEXTURE_BINDING | U.COPY_SRC);
    this.sceneCopy = tex(W, H, U.TEXTURE_BINDING | U.COPY_DST);
    this.layerBuf = tex(Wm, Hm, U.RENDER_ATTACHMENT | U.TEXTURE_BINDING | U.COPY_SRC);
    this.layerCopy = tex(Wm, Hm, U.TEXTURE_BINDING | U.COPY_DST);
    this.bindVersion++;
  }

  private ensureBindGroups() {
    if (!this.scene || !this.sceneCopy || !this.layerCopy) return;
    if (this.boundVersion === this.bindVersion) return;
    this.boundVersion = this.bindVersion;
    this.materialBindGroup = this.device.createBindGroup({
      layout: this.materialLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameMatBuf } },
        { binding: 1, resource: { buffer: this.surfaceBuf } },
        { binding: 2, resource: this.sceneCopy.createView() },
        { binding: 3, resource: this.sampler },
        { binding: 4, resource: this.layerCopy.createView() },
      ],
    });
    // Direct mode (shaders at content resolution) draws into the scene itself, so there is no
    // separate same-layer backdrop: bind a transparent texel instead of layerCopy.
    this.materialBindGroupDirect = this.device.createBindGroup({
      layout: this.materialLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameMatBuf } },
        { binding: 1, resource: { buffer: this.surfaceBuf } },
        { binding: 2, resource: this.sceneCopy.createView() },
        { binding: 3, resource: this.sampler },
        { binding: 4, resource: this.emptyTex.createView() },
      ],
    });
    this.presentBindGroup = this.device.createBindGroup({
      layout: this.presentLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameFullBuf } },
        { binding: 1, resource: this.scene.createView() },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: { buffer: this.postBuf } },
      ],
    });
  }

  private ensureLayerBindings(layer: LayerRecord) {
    if (layer.resolveBindVersion !== this.bindVersion) {
      layer.resolveBindGroup = this.device.createBindGroup({
        layout: this.resolveLayout,
        entries: [
          { binding: 0, resource: { buffer: this.frameFullBuf } },
          { binding: 1, resource: this.layerBuf!.createView() },
          { binding: 2, resource: this.sampler },
          { binding: 3, resource: { buffer: layer.uniform } },
        ],
      });
      layer.resolveBindVersion = this.bindVersion;
    }

    const { width, height } = layer.geom;
    if (!layer.opts.content || width < 1 || height < 1) return;
    if (!layer.texture || layer.texture.width !== width || layer.texture.height !== height) {
      layer.texture?.destroy();
      layer.texture = this.device.createTexture({
        size: { width, height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      layer.bindVersion = -1;
      layer.dirty = true;
    }
    if (layer.bindVersion !== this.bindVersion) {
      layer.bindGroup = this.device.createBindGroup({
        layout: this.contentLayout,
        entries: [
          { binding: 0, resource: { buffer: this.frameFullBuf } },
          { binding: 1, resource: { buffer: this.surfaceBuf } },
          { binding: 2, resource: layer.texture.createView() },
          { binding: 3, resource: this.sampler },
          { binding: 4, resource: { buffer: layer.uniform } },
          { binding: 5, resource: this.layerBuf!.createView() },
        ],
      });
      layer.bindVersion = this.bindVersion;
    }
  }

  private tint(t: string | undefined): Vec4 {
    if (!t) return [0, 0, 0, 0];
    let v = this.tintCache.get(t);
    if (!v) {
      v = resolveTint(t, this.theme);
      this.tintCache.set(t, v);
    }
    return v;
  }

  private contentScale(): number {
    const display = Math.min(window.devicePixelRatio || 1, MAX_CONTENT_SCALE);
    if (this.target) return display;
    return this.quality === 'fast' ? Math.min(display, 1) : display;
  }

  private materialScale(contentScale: number): number {
    if (this.target || this.quality === 'sharp') return contentScale;
    if (this.quality === 'fast') return Math.min(contentScale, 1);
    const minScale = Math.max(MIN_MATERIAL_SCALE, contentScale / 2);
    return Math.max(minScale, Math.min(this.autoScale ?? contentScale, contentScale));
  }

  /**
   * Auto quality: after two consecutive one-second windows below the target fps, the shader
   * resolution drops one step (text stays at full resolution). It never climbs back by itself,
   * to avoid oscillating at the vsync cap; setQuality() restarts it.
   */
  private adaptScale(now: number) {
    this.perf.frames++;
    const elapsed = now - this.perf.start;
    if (elapsed < 1000) return;
    // A window spanning a hidden-tab pause (no paints) says nothing about GPU speed.
    if (elapsed > 2000) {
      this.perf.frames = 0;
      this.perf.start = now;
      return;
    }
    const fps = (this.perf.frames * 1000) / elapsed;
    this.perf.frames = 0;
    this.perf.start = now;
    this.stats.fps = Math.round(fps);
    if (this.quality !== 'auto') return;
    if (this.perf.warmup > 0) {
      this.perf.warmup--;
      return;
    }
    const cs = this.contentScale();
    const current = this.materialScale(cs);
    const minScale = Math.max(MIN_MATERIAL_SCALE, cs / 2);
    if (fps < AUTO_SCALE_TARGET_FPS && current > minScale) {
      this.perf.slowWindows++;
      if (this.perf.slowWindows >= 2) {
        this.autoScale = Math.max(minScale, current - AUTO_SCALE_STEP);
        this.perf.slowWindows = 0;
        this.perf.warmup = 1;
      }
    } else {
      this.perf.slowWindows = 0;
    }
  }

  /** CSS-px region a backdrop material may sample around a surface. */
  private backdropReach(s: SurfaceRecord): Rect {
    const o = s.opts;
    const p = o.params ?? MATERIAL_DEFAULTS[o.material as BuiltinMaterial] ?? [0, 0, 0, 0];
    const reach = (o.margin ?? 12) + Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]) + 8;
    const c = s.css;
    return [c.x - reach, c.y - reach, c.x + c.w + reach, c.y + c.h + reach];
  }

  /** Renders one frame. Public so tests (loop: 'manual') can drive it. */
  render(now: number, changed: readonly Element[] = []) {
    if (this.destroyed) return;
    const t0 = performance.now();
    const dt = Math.min(Math.max((now - this.lastNow) / 1000, 0), MAX_FRAME_DELTA);
    this.lastNow = now;
    const motion = this.reducedMotion ? 0 : 1;
    this.time += dt * motion;
    if (!this.target) this.adaptScale(now);

    // cs: content/canvas scale (HTML snapshots rasterize at the backing-store scale).
    // ms: material scale for shader surfaces. k = cs / ms.
    const cs = this.contentScale();
    const ms = this.materialScale(cs);
    const k = cs / ms;
    // Mixed resolution: surfaces go through the material-res layer buffer and get upsampled.
    // Otherwise they draw straight into the scene (no extra passes).
    const mixed = k > 1.0001;

    const canvasRect = this.canvas.getBoundingClientRect();
    const canvasLeft = canvasRect.left;
    const canvasTop = canvasRect.top;
    let W: number;
    let H: number;
    if (this.target) {
      W = this.target.width;
      H = this.target.height;
    } else {
      W = Math.max(1, Math.round(canvasRect.width * cs));
      H = Math.max(1, Math.round(canvasRect.height * cs));
      if (this.canvas.width !== W || this.canvas.height !== H) {
        this.canvas.width = W;
        this.canvas.height = H;
      }
    }
    const Wm = Math.max(1, Math.round((W / cs) * ms));
    const Hm = Math.max(1, Math.round((H / cs) * ms));
    this.ensureTargets(W, H, Wm, Hm);

    for (const el of changed) {
      const l = this.layersByElement.get(el);
      if (l) l.dirty = true;
    }

    let total = 0;
    for (const l of this.layers) total += l.surfaces.length;
    if (total > this.surfaceCapacity) {
      this.surfaceBuf.destroy();
      this.surfaceBuf = this.allocSurfaces(Math.max(total, this.surfaceCapacity * 2));
    }
    this.ensureBindGroups();

    // ---- measure, ease and pack surfaces (in material px)
    const ease = (rate: number) => 1 - Math.exp(-rate * dt);
    const plans: LayerPlan[] = [];
    let index = 0;

    for (const layer of this.layers) {
      const lr = layer.element.getBoundingClientRect();
      const lx = lr.left - canvasLeft;
      const ly = lr.top - canvasTop;
      const g = layer.geom;
      g.x = Math.round(lx * cs);
      g.y = Math.round(ly * cs);
      g.width = Math.round(lr.width * cs);
      g.height = Math.round(lr.height * cs);
      g.cssWidth = lr.width;
      g.cssHeight = lr.height;
      g.dpr = cs;
      this.contentSource?.syncGeometry?.(this.canvas, g);

      if (layer.orderDirty) {
        layer.surfaces.sort((a, b) =>
          a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );
        layer.orderDirty = false;
      }

      // Layer clip in CSS px, clamped to the canvas.
      const cw = W / cs;
      const ch = H / cs;
      const clipCss: Rect = [Math.max(lx, 0), Math.max(ly, 0), Math.min(lx + lr.width, cw), Math.min(ly + lr.height, ch)];
      const plan: LayerPlan = { draws: [], fx: [], bounds: null, backdropBounds: null };

      for (const s of layer.surfaces) {
        const o = s.opts;
        const sr = s.element.getBoundingClientRect();
        const x = sr.left - canvasLeft;
        const y = sr.top - canvasTop;
        const w = sr.width;
        const h = sr.height;
        const margin = o.margin ?? 12;
        if (w * ms < 1 || h * ms < 1 || x + w + margin < clipCss[0] || y + h + margin < clipCss[1] || x - margin > clipCss[2] || y - margin > clipCss[3]) {
          s.index = -1;
          continue;
        }
        s.css = { x, y, w, h };

        s.hover += ((s.hovered ? 1 : 0) - s.hover) * ease(EASE.hover);
        s.active += ((s.pressed ? 1 : 0) - s.active) * ease(EASE.active);
        s.focus += ((s.focused ? 1 : 0) - s.focus) * ease(EASE.focus);
        s.value += ((o.value ?? 0) - s.value) * (this.reducedMotion ? 1 : ease(EASE.value));
        s.fxAmount += ((o.fxAmount ?? 1) - s.fxAmount) * (this.reducedMotion ? 1 : ease(EASE.fx));
        s.press = Math.max(0, s.press - dt / PRESS_DECAY_SECONDS);
        s.time += dt * motion * (o.speed ?? 1);

        const radiusCss = s.radiusCss.endsWith('%')
          ? (parseFloat(s.radiusCss) / 100) * Math.min(w, h)
          : o.radius ?? parseFloat(s.radiusCss);
        const params = o.params ?? MATERIAL_DEFAULTS[o.material as BuiltinMaterial] ?? [0, 0, 0, 0];
        const fxKind = o.fx ? CONTENT_FX[o.fx] : 0;

        writeSurface(this.surfaceData, index, {
          rect: [x * ms, y * ms, w * ms, h * ms],
          clip: [clipCss[0] * ms, clipCss[1] * ms, clipCss[2] * ms, clipCss[3] * ms],
          shape: [Number.isFinite(radiusCss) ? radiusCss * ms : 0, (o.border ?? 1) * ms, margin * ms, o.variant ?? 0],
          state: [s.hover, s.active, s.focus, s.value],
          anim: [s.time, s.seed, o.intensity ?? 1, s.press],
          pointer: [s.pointer[0] * ms, s.pointer[1] * ms, s.pressOrigin[0] * ms, s.pressOrigin[1] * ms],
          tint: this.tint(o.tint),
          params: scaleParams(o.material, params, ms),
          fx: [fxKind, s.fxAmount, 0, 0],
        });
        s.index = index;
        if (fxKind && plan.fx.length < MAX_FX_REGIONS) plan.fx.push(index);
        plan.draws.push(s);
        plan.bounds = unionRect(plan.bounds, [x - margin, y - margin, x + w + margin, y + h + margin]);
        const mat = this.materials.get(o.material);
        if (mat?.backdrop) plan.backdropBounds = unionRect(plan.backdropBounds, this.backdropReach(s));
        index++;
      }
      // Surfaces never draw outside their layer.
      if (plan.bounds) {
        plan.bounds = [Math.max(plan.bounds[0], clipCss[0]), Math.max(plan.bounds[1], clipCss[1]), Math.min(plan.bounds[2], clipCss[2]), Math.min(plan.bounds[3], clipCss[3])];
        if (plan.bounds[2] <= plan.bounds[0] || plan.bounds[3] <= plan.bounds[1]) plan.bounds = null;
      }
      plans.push(plan);
    }

    // ---- uniforms
    const q = this.device.queue;
    const frameFor = (width: number, height: number, scale: number) => {
      writeFrame(this.frameData, {
        width,
        height,
        time: this.time,
        dpr: scale,
        pointerX: (this.pointer[0] - canvasLeft) * scale,
        pointerY: (this.pointer[1] - canvasTop) * scale,
        motion,
        theme: this.theme,
      });
      return this.frameData;
    };
    q.writeBuffer(this.frameMatBuf, 0, frameFor(Wm, Hm, ms));
    q.writeBuffer(this.frameFullBuf, 0, frameFor(W, H, cs));
    q.writeBuffer(this.postBuf, 0, new Float32Array([this.post.vignette, this.post.grain, this.post.scanlines, 0]));
    if (index > 0) q.writeBuffer(this.surfaceBuf, 0, this.surfaceData, 0, index * SURFACE_FLOATS);

    // ---- per layer: bindings, HTML snapshot upload, layer uniform
    this.layers.forEach((layer, li) => {
      this.ensureLayerBindings(layer);
      if (layer.opts.content && layer.texture && layer.dirty && this.contentSource) {
        // A failed snapshot must not take the whole frame down; report it once per layer.
        try {
          this.contentSource.upload(this.device, layer.geom, layer.texture);
        } catch (e) {
          if (!layer.uploadFailed) console.error('SFX: layer snapshot upload failed', e);
          layer.uploadFailed = true;
        }
        layer.dirty = false;
      }
      const g = layer.geom;
      const b = plans[li].bounds;
      const resolve: Vec4 = mixed && b ? [Math.floor(b[0] * cs), Math.floor(b[1] * cs), Math.ceil((b[2] - b[0]) * cs) + 1, Math.ceil((b[3] - b[1]) * cs) + 1] : [0, 0, 0, 0];
      writeLayerUniform(layer.uniformData, [g.x, g.y, g.width, g.height], resolve, layer.opts.opacity, k, plans[li].fx);
      q.writeBuffer(layer.uniform, 0, layer.uniformData);
    });

    // ---- encode
    const enc = this.device.createCommandEncoder();
    const sceneView = this.scene!.createView();
    const layerView = this.layerBuf!.createView();
    const bg = this.theme.bg;
    let backdropCopies = 0;
    let drawn = 0;

    const beginScene = (load: GPULoadOp) =>
      enc.beginRenderPass({
        colorAttachments: [{ view: sceneView, loadOp: load, storeOp: 'store', clearValue: { r: bg[0], g: bg[1], b: bg[2], a: 1 } }],
      });
    const beginLayer = (load: GPULoadOp) =>
      enc.beginRenderPass({
        colorAttachments: [{ view: layerView, loadOp: load, storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      });
    const copyRegion = (src: GPUTexture, dst: GPUTexture, r: Rect, scale: number) => {
      const x0 = Math.max(0, Math.floor(r[0] * scale));
      const y0 = Math.max(0, Math.floor(r[1] * scale));
      const x1 = Math.min(src.width, Math.ceil(r[2] * scale));
      const y1 = Math.min(src.height, Math.ceil(r[3] * scale));
      if (x1 <= x0 || y1 <= y0) return;
      enc.copyTextureToTexture({ texture: src, origin: { x: x0, y: y0 } }, { texture: dst, origin: { x: x0, y: y0 } }, { width: x1 - x0, height: y1 - y0 });
      backdropCopies++;
    };

    // The scene pass opens lazily; its first opening clears to the background color.
    let scenePass: GPURenderPassEncoder | null = null;
    let sceneCleared = false;
    const openScene = () => {
      const p = beginScene(sceneCleared ? 'load' : 'clear');
      sceneCleared = true;
      return p;
    };
    const closeScene = () => {
      scenePass?.end();
      scenePass = null;
    };
    const ensureSceneCleared = () => {
      if (!sceneCleared) openScene().end();
    };
    const drawSurface = (pass: GPURenderPassEncoder, s: SurfaceRecord, mat: Material, bindGroup: GPUBindGroup) => {
      pass.setPipeline(mat.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6, 1, 0, s.index);
      drawn++;
    };

    this.layers.forEach((layer, li) => {
      const plan = plans[li];
      const contentDrawable = layer.opts.content && layer.bindGroup && layer.geom.width > 0 && layer.geom.height > 0;

      if (plan.draws.length && plan.bounds) {
        if (mixed) {
          closeScene();
          // What lower layers painted, for glass in this layer.
          if (plan.backdropBounds) {
            ensureSceneCleared();
            copyRegion(this.scene!, this.sceneCopy!, plan.backdropBounds, cs);
          }
          let lp = beginLayer('clear');
          for (const s of plan.draws) {
            const mat = this.materials.get(s.opts.material) ?? this.materials.get('solid');
            if (!mat) continue;
            if (mat.backdrop) {
              // This layer's earlier surfaces, so glass refracts them too.
              lp.end();
              copyRegion(this.layerBuf!, this.layerCopy!, this.backdropReach(s), ms);
              lp = beginLayer('load');
            }
            drawSurface(lp, s, mat, this.materialBindGroup!);
          }
          lp.end();
          // Layers with HTML upsample their surfaces inside the content pass; others resolve here.
          if (!contentDrawable) {
            scenePass = openScene();
            scenePass.setPipeline(this.resolvePipeline);
            scenePass.setBindGroup(0, layer.resolveBindGroup!);
            scenePass.draw(6);
          }
        } else {
          for (const s of plan.draws) {
            const mat = this.materials.get(s.opts.material) ?? this.materials.get('solid');
            if (!mat) continue;
            if (mat.backdrop) {
              closeScene();
              ensureSceneCleared();
              copyRegion(this.scene!, this.sceneCopy!, this.backdropReach(s), cs);
            }
            scenePass ??= openScene();
            drawSurface(scenePass, s, mat, this.materialBindGroupDirect!);
          }
        }
      }
      if (contentDrawable) {
        scenePass ??= openScene();
        scenePass.setPipeline(this.contentPipeline);
        scenePass.setBindGroup(0, layer.bindGroup!);
        scenePass.draw(6);
      }
    });
    closeScene();
    ensureSceneCleared();

    if (this.context && !this.contextConfigured) {
      this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });
      this.contextConfigured = true;
    }
    const out = this.target ?? this.context!.getCurrentTexture();
    const present = enc.beginRenderPass({
      colorAttachments: [{ view: out.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    present.setPipeline(this.presentPipeline);
    present.setBindGroup(0, this.presentBindGroup!);
    present.draw(3);
    present.end();

    q.submit([enc.finish()]);

    this.stats = {
      layers: this.layers.length,
      surfaces: total,
      drawn,
      backdropCopies,
      frameMs: performance.now() - t0,
      fps: this.stats.fps,
      quality: this.quality,
      contentScale: cs,
      materialScale: ms,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    for (const c of this.cleanups) c();
    for (const l of this.layers) {
      for (const s of l.surfaces) s.detach();
      l.texture?.destroy();
      l.uniform.destroy();
    }
    this.layers = [];
    for (const t of [this.scene, this.sceneCopy, this.layerBuf, this.layerCopy, this.emptyTex]) t?.destroy();
    this.surfaceBuf.destroy();
    this.frameMatBuf.destroy();
    this.frameFullBuf.destroy();
    this.postBuf.destroy();
    // No context.unconfigure(): another renderer may already own this canvas.
    this.device.destroy();
  }
}
