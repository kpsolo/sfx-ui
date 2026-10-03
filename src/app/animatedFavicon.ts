/**
 * Animates the tab icon. Chromium renders SVG favicons as a single static frame, so this redraws
 * the favicon.svg design (rotating gradient ring and wordmark, glass sweep) on a small canvas
 * and swaps the <link rel="icon"> to it. Static under prefers-reduced-motion.
 */
const SIZE = 64;
const FRAME_MS = 80; // ~12 fps is plenty for a 16-32 px icon
const COLORS = ['#38bdf8', '#818cf8', '#f43f5e'];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function draw(ctx: CanvasRenderingContext2D, t: number) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Rotating gradient (matches the SVG's 3 s gradientTransform rotation).
  const angle = ((t / 3000) % 1) * Math.PI * 2;
  const dx = Math.cos(angle) * 26;
  const dy = Math.sin(angle) * 26;
  const grad = ctx.createLinearGradient(32 - dx, 32 - dy, 32 + dx, 32 + dy);
  COLORS.forEach((c, i) => grad.addColorStop(i / (COLORS.length - 1), c));

  roundRect(ctx, 4, 4, 56, 56, 14);
  ctx.fillStyle = '#06080d';
  ctx.fill();

  // Glass sweep every 2.4 s, clipped to the tile.
  const phase = (t % 2400) / 2400;
  if (phase < 0.6) {
    ctx.save();
    roundRect(ctx, 6, 6, 52, 52, 12);
    ctx.clip();
    const x = -40 + (phase / 0.6) * 130;
    const sweep = ctx.createLinearGradient(x, 0, x + 24, 0);
    sweep.addColorStop(0, 'rgba(255,255,255,0)');
    sweep.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    sweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.setTransform(1, 0, Math.tan((-20 * Math.PI) / 180), 1, 0, 0);
    ctx.fillStyle = sweep;
    ctx.fillRect(x, 0, 24, SIZE);
    ctx.restore();
  }

  roundRect(ctx, 4, 4, 56, 56, 14);
  ctx.lineWidth = 4;
  ctx.strokeStyle = grad;
  ctx.stroke();

  ctx.fillStyle = grad;
  ctx.font = '700 18px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SFX', 32, 39.5);
}

export function startAnimatedFavicon(): () => void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!link || !ctx || typeof ctx.roundRect !== 'function') return () => {};

  const original = link.href;
  link.type = 'image/png';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setInterval> | null = null;

  const paint = () => {
    draw(ctx, performance.now());
    link.href = canvas.toDataURL('image/png');
  };
  const sync = () => {
    if (timer) clearInterval(timer);
    timer = null;
    paint();
    if (!motion.matches) timer = setInterval(paint, FRAME_MS);
  };

  sync();
  motion.addEventListener('change', sync);
  return () => {
    if (timer) clearInterval(timer);
    motion.removeEventListener('change', sync);
    link.type = 'image/svg+xml';
    link.href = original;
  };
}
