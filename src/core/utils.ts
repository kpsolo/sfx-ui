/**
 * Converts a hex color string (e.g. #38bdf8 or #38bdf8ff) to normalized RGBA vec4 floats [0..1]
 */
export function hexToRgba(hex: string, alpha = 1.0): [number, number, number, number] {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length === 6) {
    const num = parseInt(cleanHex, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
      alpha,
    ];
  }
  if (cleanHex.length === 8) {
    const num = parseInt(cleanHex, 16);
    return [
      ((num >> 24) & 255) / 255,
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
    ];
  }
  return [1.0, 1.0, 1.0, alpha];
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
