import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  parseColor,
  relativeLuminance,
  toHex,
} from '../scripts/lib/color.ts';

describe('parseColor', () => {
  it('reads hex in every length', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#0F52D4')).toEqual({ r: 15, g: 82, b: 212, a: 1 });
    expect(parseColor('#00000080').a).toBeCloseTo(0.502, 3);
    expect(parseColor('#f008').a).toBeCloseTo(0.533, 3);
  });

  it('reads rgb() in comma and space syntax', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgb(16 24 40 / 0.1)')).toEqual({ r: 16, g: 24, b: 40, a: 0.1 });
    expect(parseColor('rgba(0, 0, 0, 50%)').a).toBe(0.5);
    expect(parseColor('rgb(100% 50% 0%)')).toEqual({ r: 255, g: 127.5, b: 0, a: 1 });
  });

  it('reads named white, black and transparent', () => {
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('transparent').a).toBe(0);
  });

  it('refuses what it cannot read', () => {
    expect(() => parseColor('oklch(50% 0.1 250)')).toThrow(/Unsupported colour/);
    expect(() => parseColor('#12345')).toThrow();
  });
});

describe('relativeLuminance (WCAG 2)', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(parseColor('#000'))).toBe(0);
    expect(relativeLuminance(parseColor('#fff'))).toBeCloseTo(1, 10);
  });

  it('weights the channels 0.2126 / 0.7152 / 0.0722', () => {
    expect(relativeLuminance(parseColor('#f00'))).toBeCloseTo(0.2126, 10);
    expect(relativeLuminance(parseColor('#0f0'))).toBeCloseTo(0.7152, 10);
    expect(relativeLuminance(parseColor('#00f'))).toBeCloseTo(0.0722, 10);
  });

  it('uses the linear segment below the 0.04045 threshold', () => {
    // 10/255 = 0.0392: linear part, 0.0392 / 12.92
    expect(relativeLuminance(parseColor('#0a0a0a'))).toBeCloseTo(10 / 255 / 12.92, 10);
    // mid grey #777: ((0.4667 + 0.055) / 1.055) ^ 2.4
    expect(relativeLuminance(parseColor('#777'))).toBeCloseTo(0.1845, 4);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBeCloseTo(21, 10);
    expect(contrastRatio(parseColor('#0f52d4'), parseColor('#0f52d4'))).toBe(1);
  });

  it('does not depend on the order', () => {
    const a = parseColor('#767676');
    const b = parseColor('#ffffff');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('matches known reference pairs', () => {
    // #767676 on white is the classic lightest grey that passes 4.5:1
    expect(contrastRatio(parseColor('#767676'), parseColor('#fff'))).toBeCloseTo(4.54, 2);
    expect(contrastRatio(parseColor('#777777'), parseColor('#fff'))).toBeLessThan(4.5);
    expect(contrastRatio(parseColor('#595959'), parseColor('#fff'))).toBeCloseTo(7.0, 1);
  });

  it('paints a translucent foreground over the background first', () => {
    const halfBlack = parseColor('rgb(0 0 0 / 0.5)');
    const grey = composite(halfBlack, parseColor('#fff'));
    expect(toHex(grey)).toBe('#808080');
    expect(contrastRatio(halfBlack, parseColor('#fff'))).toBeCloseTo(
      contrastRatio(grey, parseColor('#fff')),
      10,
    );
  });

  it('puts a translucent background over the backdrop', () => {
    const ratio = contrastRatio(
      parseColor('#000'),
      parseColor('rgb(255 255 255 / 0)'),
      parseColor('#000'),
    );
    expect(ratio).toBe(1);
  });
});

describe('toHex', () => {
  it('writes lower-case hex, with alpha only when translucent', () => {
    expect(toHex(parseColor('#ABCDEF'))).toBe('#abcdef');
    expect(toHex(parseColor('rgb(0 0 0 / 0.5)'))).toBe('#00000080');
  });
});
