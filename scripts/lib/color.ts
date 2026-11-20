/**
 * Colour maths for the contrast check: parse a CSS colour, WCAG 2 relative luminance,
 * contrast ratio, and alpha compositing for translucent colours.
 */

export interface Rgba {
  /** 0-255 */
  r: number;
  g: number;
  b: number;
  /** 0-1 */
  a: number;
}

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN = /^rgba?\(\s*([^)]+)\)$/i;

/** Parses #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() (comma or space syntax), white, black and transparent. */
export function parseColor(input: string): Rgba {
  const value = input.trim().toLowerCase();
  if (value === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (value === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = HEX.exec(value);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length <= 4) digits = [...digits].map((d) => d + d).join('');
    const n = (i: number) => parseInt(digits.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: digits.length === 8 ? round(n(6) / 255, 4) : 1 };
  }

  const fn = RGB_FN.exec(value);
  if (fn) {
    const parts = fn[1]!
      .replace(/\s*\/\s*/, ' / ')
      .split(/[\s,]+/)
      .filter((p) => p !== '/');
    if (parts.length === 3 || parts.length === 4) {
      const channel = (p: string) =>
        p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p);
      const alpha = (p: string | undefined) =>
        p === undefined ? 1 : p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p);
      const [r, g, b, a] = [
        channel(parts[0]!),
        channel(parts[1]!),
        channel(parts[2]!),
        alpha(parts[3]),
      ];
      if ([r, g, b, a].every((x) => Number.isFinite(x))) {
        return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a, 0, 1) };
      }
    }
  }

  throw new Error(`Unsupported colour: "${input}"`);
}

/** sRGB channel (0-255) to linear light, as WCAG 2 defines it. */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance of an opaque colour: 0 (black) to 1 (white). */
export function relativeLuminance(color: Rgba): number {
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** Paints `top` over `bottom` (source-over). The result is opaque when `bottom` is. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

/**
 * WCAG 2 contrast ratio between a foreground and a background, 1 to 21.
 * A translucent foreground is painted over the background first; a translucent
 * background needs `backdrop` (what shows through it), white by default.
 */
export function contrastRatio(fg: Rgba, bg: Rgba, backdrop: Rgba = WHITE): number {
  const base = bg.a < 1 ? composite(bg, backdrop) : bg;
  const front = fg.a < 1 ? composite(fg, base) : fg;
  const l1 = relativeLuminance(front);
  const l2 = relativeLuminance(base);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Lower-case #rrggbb, or #rrggbbaa when translucent. */
export function toHex(color: Rgba): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const alpha = color.a < 1 ? h(color.a * 255) : '';
  return `#${h(color.r)}${h(color.g)}${h(color.b)}${alpha}`;
}

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
