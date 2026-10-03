/**
 * Thin adapter over the WICG HTML-in-Canvas API (Chromium 155+ shape):
 *   <canvas content="drawable"> with `drawable` children,
 *   canvas `paint` event (changedElements) + requestPaint(),
 *   GPUQueue.drawElementImageToTexture(), canvas.updateElementGeometry().
 * Everything that touches the experimental API lives here so a future rename is a one-file change.
 * Explainer: https://github.com/WICG/html-in-canvas
 */

interface GPUDrawElementImageSource {
  source: Element;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
}

interface GPUDrawElementImageDestination {
  texture: GPUTexture;
  size?: GPUExtent3DStrict;
  premultipliedAlpha?: boolean;
  colorSpace?: PredefinedColorSpace;
}

interface HtmlInCanvasQueue {
  drawElementImageToTexture(source: GPUDrawElementImageSource, destination: GPUDrawElementImageDestination): void;
}

interface UpdateElementGeometryOptions {
  preserveHitTestOrder?: boolean;
  clip?: DOMRectInit;
  canvasTransform?: DOMMatrixInit;
}

interface HtmlInCanvasElement extends HTMLCanvasElement {
  requestPaint(): void;
  updateElementGeometry(element: Element, options?: UpdateElementGeometryOptions): void;
}

export interface CanvasPaintEvent extends Event {
  readonly changedElements: readonly Element[];
}

export interface HtmlInCanvasSupport {
  drawElementImageToTexture: boolean;
  requestPaint: boolean;
  updateElementGeometry: boolean;
  paintEvent: boolean;
  /** Pre-155 names (layoutsubtree / texElementImage2D / copyElementImageToTexture). */
  legacyApi: boolean;
}

export function detectHtmlInCanvas(): HtmlInCanvasSupport {
  const canvasProto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const queueProto = typeof GPUQueue !== 'undefined' ? (GPUQueue.prototype as unknown as Record<string, unknown>) : {};
  const gl2Proto =
    typeof WebGL2RenderingContext !== 'undefined'
      ? (WebGL2RenderingContext.prototype as unknown as Record<string, unknown>)
      : {};
  return {
    drawElementImageToTexture: typeof queueProto.drawElementImageToTexture === 'function',
    requestPaint: typeof canvasProto.requestPaint === 'function',
    updateElementGeometry: typeof canvasProto.updateElementGeometry === 'function',
    paintEvent: 'onpaint' in HTMLCanvasElement.prototype,
    legacyApi:
      'layoutSubtree' in HTMLCanvasElement.prototype ||
      typeof gl2Proto.texElementImage2D === 'function' ||
      typeof queueProto.copyElementImageToTexture === 'function',
  };
}

export function isHtmlInCanvasReady(s: HtmlInCanvasSupport): boolean {
  return s.drawElementImageToTexture && s.requestPaint && s.updateElementGeometry && s.paintEvent;
}

/**
 * Attributes that opt a canvas into laying out (not painting) its children. Chrome 154 (flag)
 * only honours the original `layoutsubtree`; the explainer's newer `content="drawable"` is set
 * too so later builds keep working. Verified in Chrome 154 on 2026-10-03.
 */
export const DRAWABLE_CANVAS_ATTRS = { layoutsubtree: '', content: 'drawable' } as const;

/** Attribute that marks a direct canvas child as drawable. */
export const DRAWABLE_CHILD_ATTRS = { drawable: '' } as const;

/**
 * Two destination shapes exist in the wild:
 *  - 'explainer' (current WICG explainer): { texture, size, premultipliedAlpha }
 *  - 'nested'    (Chrome 154 behind the flag): { destination: { texture, premultipliedAlpha } }
 *    — verified 2026-10-03; the snapshot is rasterized at the canvas backing-store scale.
 * The first call tries the explainer shape and falls back; the working shape is remembered.
 */
let uploadShape: 'explainer' | 'nested' | null = null;

/** Rasterizes the element's current snapshot into the texture (premultiplied). */
export function drawElementToTexture(queue: GPUQueue, element: Element, texture: GPUTexture) {
  const q = queue as unknown as HtmlInCanvasQueue;
  const explainer = () =>
    q.drawElementImageToTexture(
      { source: element },
      { texture, size: { width: texture.width, height: texture.height }, premultipliedAlpha: true }
    );
  const nested = () =>
    q.drawElementImageToTexture({ source: element }, {
      destination: { texture, premultipliedAlpha: true },
    } as unknown as GPUDrawElementImageDestination);

  if (uploadShape === 'nested') return nested();
  if (uploadShape === 'explainer') return explainer();
  try {
    explainer();
    uploadShape = 'explainer';
  } catch (e) {
    if (!(e instanceof TypeError)) throw e;
    nested();
    uploadShape = 'nested';
  }
}

/**
 * Tells the browser where the element is drawn so hit testing, focus rings and the
 * accessibility tree line up. Canvas grid units are backing-store pixels, so an element drawn
 * at (x, y) device px with dpr scaling maps its CSS border box through translate * scale(dpr).
 */
export function syncElementGeometry(canvas: HTMLCanvasElement, element: Element, x: number, y: number, dpr: number) {
  (canvas as HtmlInCanvasElement).updateElementGeometry(element, {
    canvasTransform: new DOMMatrix().translate(x, y).scale(dpr),
  });
}

export function requestCanvasPaint(canvas: HTMLCanvasElement) {
  (canvas as HtmlInCanvasElement).requestPaint();
}
