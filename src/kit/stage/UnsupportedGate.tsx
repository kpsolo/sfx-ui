import { useState } from 'react';
import type { SupportReport } from '../gpu/support';

// Oldest version verified working with the flag (2026-10-03). Readiness itself is decided by
// feature detection, not by this number.
const MIN_CHROME = 154;
const FLAG = 'chrome://flags/#canvas-draw-element';

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
          ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
        }`}
      >
        {ok ? '✓' : '✕'}
      </span>
      <span>
        <span className="text-slate-100">{label}</span>
        {detail && <span className="block font-mono text-xs text-slate-400">{detail}</span>}
      </span>
      <span className="sr-only">{ok ? 'available' : 'missing'}</span>
    </li>
  );
}

/** Shown instead of the stage when WebGPU or HTML-in-Canvas is unavailable. */
export function UnsupportedGate({ report }: { report: SupportReport }) {
  const h = report.htmlInCanvas;
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const copyFlag = async () => {
    await navigator.clipboard.writeText(FLAG);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const runPreview = async () => {
    setPreviewError(null);
    try {
      const { runSelfTest } = await import('../dev/selfTest');
      setPreview((await runSelfTest()).imageDataUrl);
    } catch (e) {
      setPreviewError(String((e as Error).message ?? e));
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--sfx-bg))] px-6 py-16 text-slate-300">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-sfx-primary">SFX UI</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">This UI renders entirely on the GPU</h1>
        <p className="mt-4 leading-relaxed">
          Every element here is real HTML drawn into a WebGPU canvas with the experimental{' '}
          <a className="text-sfx-primary underline underline-offset-4" href="https://github.com/WICG/html-in-canvas">
            HTML-in-Canvas API
          </a>
          , so shaders can refract, ripple and dissolve live content. Your browser is missing part of that.
        </p>

        <ul className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02] px-5">
          <Check ok={report.webgpu} label="WebGPU" />
          <Check ok={report.adapter !== null} label="GPU adapter" detail={report.adapter ?? 'none'} />
          <Check
            ok={(report.chromeVersion ?? 0) >= MIN_CHROME}
            label={`Chromium ${MIN_CHROME} or newer`}
            detail={report.chromeVersion ? `detected ${report.chromeVersion}` : 'not a Chromium browser'}
          />
          <Check ok={h.drawElementImageToTexture} label="GPUQueue.drawElementImageToTexture()" />
          <Check ok={h.paintEvent && h.requestPaint} label="Canvas paint event + requestPaint()" />
          <Check ok={h.updateElementGeometry} label="canvas.updateElementGeometry()" />
        </ul>

        {h.legacyApi && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            An older, incomplete version of the API is present. Update the browser.
          </p>
        )}

        <h2 className="mt-10 text-lg font-semibold text-white">Enable it</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Use Chrome (Canary, Dev or Stable) {MIN_CHROME}+.</li>
          <li>
            Open{' '}
            <button
              onClick={copyFlag}
              className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-sm text-sfx-primary hover:bg-white/5"
            >
              {FLAG}
            </button>{' '}
            {copied ? <span className="text-emerald-300">copied</span> : <span className="text-slate-500">(click to copy)</span>} and set it to
            Enabled.
          </li>
          <li>Relaunch the browser and reload this page.</li>
        </ol>

        {import.meta.env.DEV && report.adapter && (
          <section className="mt-10 border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold text-white">Developer: GPU self-test</h2>
            <p className="mt-1 text-sm text-slate-400">
              Renders every material and content effect off-screen with synthetic content (no HTML-in-Canvas needed).
            </p>
            <button
              onClick={runPreview}
              className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5"
            >
              Run self-test
            </button>
            {previewError && <p className="mt-2 font-mono text-xs text-rose-300">{previewError}</p>}
            {preview && <img src={preview} alt="Rendered materials and content effects" className="mt-4 w-full rounded-lg border border-white/10" />}
          </section>
        )}
      </div>
    </main>
  );
}
