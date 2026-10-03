import { detectHtmlInCanvas, isHtmlInCanvasReady, HtmlInCanvasSupport } from './htmlInCanvas';

export interface SupportReport {
  webgpu: boolean;
  adapter: string | null;
  htmlInCanvas: HtmlInCanvasSupport;
  chromeVersion: number | null;
  ready: boolean;
}

function chromeVersion(): number | null {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } })
    .userAgentData?.brands;
  const b = brands?.find((x) => x.brand === 'Chromium' || x.brand === 'Google Chrome');
  if (b) return Number(b.version);
  const m = navigator.userAgent.match(/Chrome\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function detectSupport(): Promise<SupportReport> {
  const htmlInCanvas = detectHtmlInCanvas();
  let adapter: string | null = null;
  if (navigator.gpu) {
    try {
      const a = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (a) adapter = [a.info?.vendor, a.info?.architecture].filter(Boolean).join(' ') || 'available';
    } catch {
      adapter = null;
    }
  }
  const webgpu = Boolean(navigator.gpu);
  return {
    webgpu,
    adapter,
    htmlInCanvas,
    chromeVersion: chromeVersion(),
    ready: webgpu && adapter !== null && isHtmlInCanvasReady(htmlInCanvas),
  };
}
