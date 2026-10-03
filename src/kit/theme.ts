import type { ThemeColors, Vec4 } from './gpu/layout';

/** Token names. Each maps to a `--sfx-<name>` CSS variable holding "r g b" (0-255). */
export const THEME_TOKENS = ['primary', 'secondary', 'accent', 'bg', 'surface', 'text', 'danger', 'success'] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];

export const THEMES = ['neon', 'aurora', 'ember', 'mono'] as const;
export type ThemeName = (typeof THEMES)[number];

function parseTriplet(value: string): Vec4 {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return [1, 1, 1, 1];
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255, 1];
}

/** Reads the theme tokens in effect for `el` (CSS variables are the single source of truth). */
export function readTheme(el: Element): ThemeColors {
  const cs = getComputedStyle(el);
  const get = (t: ThemeToken) => parseTriplet(cs.getPropertyValue(`--sfx-${t}`));
  return {
    primary: get('primary'),
    secondary: get('secondary'),
    accent: get('accent'),
    bg: get('bg'),
    surface: get('surface'),
    text: get('text'),
    danger: get('danger'),
    success: get('success'),
  };
}

let parseCtx: CanvasRenderingContext2D | null = null;

/**
 * Converts a tint to straight-alpha RGBA: a theme token name, or any CSS color string.
 * Returns alpha 0 (meaning "use the material's theme color") for undefined.
 */
export function resolveTint(tint: ThemeToken | string | undefined, theme: ThemeColors): Vec4 {
  if (!tint) return [0, 0, 0, 0];
  if ((THEME_TOKENS as readonly string[]).includes(tint)) return theme[tint as ThemeToken];
  parseCtx ??= document.createElement('canvas').getContext('2d');
  if (!parseCtx) return [0, 0, 0, 0];
  parseCtx.fillStyle = '#000';
  parseCtx.fillStyle = tint;
  const norm = String(parseCtx.fillStyle);
  if (norm.startsWith('#')) {
    const n = parseInt(norm.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const m = norm.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const [r, g, b, a = '1'] = m[1].split(',');
  return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)];
}
