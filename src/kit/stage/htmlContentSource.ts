import type { ContentSource, LayerGeometry } from '../gpu/Renderer';
import { drawElementToTexture, syncElementGeometry } from '../gpu/htmlInCanvas';

/** Feeds layers from the live DOM through HTML-in-Canvas. */
export function createHtmlContentSource(): ContentSource {
  const placed = new WeakMap<Element, string>();
  return {
    upload(device: GPUDevice, layer: LayerGeometry, texture: GPUTexture) {
      drawElementToTexture(device.queue, layer.element, texture);
    },
    syncGeometry(canvas: HTMLCanvasElement, layer: LayerGeometry) {
      // Only tell the browser when the drawn position actually changes.
      const key = `${layer.x},${layer.y},${layer.dpr}`;
      if (placed.get(layer.element) === key) return;
      placed.set(layer.element, key);
      syncElementGeometry(canvas, layer.element, layer.x, layer.y, layer.dpr);
    },
  };
}
