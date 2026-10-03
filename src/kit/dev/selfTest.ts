/**
 * GPU self test that runs WITHOUT HTML-in-Canvas: compiles every built-in material, renders
 * them plus a synthetic content layer (with each content effect) into an off-screen texture,
 * and reads the pixels back. Exposed on `window.__sfxSelfTest` in dev builds.
 */
import { Renderer, ContentSource, LayerGeometry, SurfaceOptions } from '../gpu/Renderer';
import { BUILTIN_MATERIALS } from '../gpu/wgsl/materials';
import { CONTENT_FX, ContentFx } from '../gpu/wgsl/content';

export interface SelfTestReport {
  compile: Record<string, string>;
  /** Center pixel RGBA per material tile (0-255). */
  materials: Record<string, number[]>;
  /** Fraction of non-background pixels inside each content-fx tile. */
  contentCoverage: Record<string, number>;
  frameMs: number;
  stats: ReturnType<Renderer['getStats']>;
  imageDataUrl: string;
}

const TILE_W = 150;
const TILE_H = 90;
const COLS = 6;

/** Paints text into the layer texture so content effects have something to act on. */
class SyntheticContent implements ContentSource {
  upload(device: GPUDevice, layer: LayerGeometry, texture: GPUTexture) {
    const c = new OffscreenCanvas(texture.width, texture.height);
    const ctx = c.getContext('2d')!;
    ctx.scale(layer.dpr, layer.dpr);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px system-ui, sans-serif';
    for (const el of Array.from(layer.element.querySelectorAll<HTMLElement>('[data-label]'))) {
      const r = el.getBoundingClientRect();
      const lr = layer.element.getBoundingClientRect();
      ctx.fillText(el.dataset.label!, r.left - lr.left + 10, r.top - lr.top + r.height / 2 + 5);
    }
    device.queue.copyExternalImageToTexture({ source: c }, { texture, premultipliedAlpha: true }, [texture.width, texture.height]);
  }
}

export async function runSelfTest(options: { show?: boolean } = {}): Promise<SelfTestReport> {
  const materials = Object.keys(BUILTIN_MATERIALS);
  const fxKinds = (Object.keys(CONTENT_FX) as ContentFx[]).filter((k) => k !== 'none');
  const rows = Math.ceil((materials.length + fxKinds.length) / COLS);
  const cssW = COLS * TILE_W;
  const cssH = rows * TILE_H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:0;top:0;width:${cssW}px;height:${cssH}px;visibility:hidden;pointer-events:none;z-index:-1`;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  const layerEl = document.createElement('div');
  layerEl.style.cssText = 'position:absolute;inset:0';
  host.append(canvas, layerEl);
  document.body.append(host);

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const target = device.createTexture({
    size: { width: Math.round(cssW * dpr), height: Math.round(cssH * dpr) },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  const renderer = await Renderer.create({ canvas, target, device, loop: 'manual', contentSource: new SyntheticContent() });
  renderer.post = { vignette: 0, grain: 0, scanlines: 0 };
  const layer = renderer.addLayer(layerEl, { content: true });

  const tiles: { name: string; el: HTMLElement }[] = [];
  const addTile = (i: number, name: string, opts: SurfaceOptions, label?: string) => {
    const el = document.createElement('div');
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    el.style.cssText = `position:absolute;left:${col * TILE_W + 12}px;top:${row * TILE_H + 12}px;width:${TILE_W - 24}px;height:${TILE_H - 24}px;border-radius:14px`;
    if (label) el.dataset.label = label;
    layerEl.append(el);
    renderer.addSurface(layerEl, el, opts);
    tiles.push({ name, el });
  };

  materials.forEach((m, i) => addTile(i, m, { material: m, value: 0.65 }));
  fxKinds.forEach((fx, j) =>
    addTile(materials.length + j, `fx:${fx}`, { material: 'solid', fx, fxAmount: 0.6, value: 0 }, `${fx} HTML`)
  );

  // A few frames so time and easing advance.
  let now = performance.now();
  for (let f = 0; f < 6; f++) {
    now += 16.7;
    renderer.render(now);
  }
  layer.invalidate();
  renderer.render((now += 16.7));
  const frameMs = renderer.getStats().frameMs;

  // Read back.
  const W = target.width;
  const H = target.height;
  const bytesPerRow = Math.ceil((W * 4) / 256) * 256;
  const buf = device.createBuffer({ size: bytesPerRow * H, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = device.createCommandEncoder();
  enc.copyTextureToBuffer({ texture: target }, { buffer: buf, bytesPerRow }, { width: W, height: H });
  device.queue.submit([enc.finish()]);
  await buf.mapAsync(GPUMapMode.READ);
  const data = new Uint8Array(buf.getMappedRange()).slice();
  buf.unmap();

  const px = (x: number, y: number) => {
    const o = Math.round(y) * bytesPerRow + Math.round(x) * 4;
    return [data[o], data[o + 1], data[o + 2], data[o + 3]];
  };
  const hostRect = host.getBoundingClientRect();
  const report: SelfTestReport = {
    compile: Object.fromEntries(
      Object.entries(renderer.builtinReport).map(([k, r]) => [k, r.ok ? 'ok' : r.messages.map((m) => `${m.line}:${m.column} ${m.message}`).join(' | ')])
    ),
    materials: {},
    contentCoverage: {},
    frameMs,
    stats: renderer.getStats(),
    imageDataUrl: '',
  };
  for (const t of tiles) {
    const r = t.el.getBoundingClientRect();
    const cx = (r.left - hostRect.left + r.width / 2) * dpr;
    const cy = (r.top - hostRect.top + r.height / 2) * dpr;
    if (!t.name.startsWith('fx:')) {
      report.materials[t.name] = px(cx, cy);
    } else {
      let hits = 0;
      let n = 0;
      for (let y = (r.top - hostRect.top) * dpr; y < (r.bottom - hostRect.top) * dpr; y += 2) {
        for (let x = (r.left - hostRect.left) * dpr; x < (r.right - hostRect.left) * dpr; x += 2) {
          const p = px(x, y);
          n++;
          if (p[0] > 200 && p[1] > 200 && p[2] > 200) hits++;
        }
      }
      report.contentCoverage[t.name] = +(hits / Math.max(n, 1)).toFixed(4);
    }
  }

  // Encode an image for visual inspection.
  const img = new ImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(data.subarray(y * bytesPerRow, y * bytesPerRow + W * 4), y * W * 4);
  const oc = new OffscreenCanvas(W, H);
  oc.getContext('2d')!.putImageData(img, 0, 0);
  const blob = await oc.convertToBlob({ type: 'image/png' });
  report.imageDataUrl = await new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(blob);
  });

  if (options.show) {
    const view = document.createElement('img');
    view.src = report.imageDataUrl;
    view.style.cssText = `position:fixed;left:0;top:0;width:${cssW}px;z-index:99999;border:1px solid #333`;
    view.id = 'sfx-selftest-image';
    document.getElementById('sfx-selftest-image')?.remove();
    document.body.append(view);
  }

  renderer.destroy();
  target.destroy();
  host.remove();
  return report;
}
