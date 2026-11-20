import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCss } from '../scripts/lib/css.ts';
import { loadModel } from '../scripts/lib/model.ts';
import { INVERSE, lightAndDark, surfacesCss } from '../scripts/lib/surfaces.ts';

const root = resolve(import.meta.dirname, '..');
const model = loadModel(root);
const { light, dark } = lightAndDark(model);
const rules = parseCss(surfacesCss(model));

function ruleFor(selector: string, media?: string) {
  const rule = rules.find((r) => r.selectors.includes(selector) && r.media === (media ?? null));
  expect(rule, `${selector}${media ? ` in ${media}` : ''}`).toBeDefined();
  return rule!;
}

describe('surfaces.css', () => {
  it('gives an inverse surface on a light page every dark role', () => {
    const rule = ruleFor(INVERSE);
    expect(rule.declarations.get('color-scheme')).toBe('dark');
    for (const [name, value] of dark.declarations) expect(rule.declarations.get(name)).toBe(value);
  });

  it('gives it the light roles on a dark page, picked or from the system', () => {
    for (const rule of [
      ruleFor(`:root[data-theme='dark'] ${INVERSE}`),
      ruleFor(`:root:not([data-theme]) ${INVERSE}`, '(prefers-color-scheme: dark)'),
    ]) {
      expect(rule.declarations.get('color-scheme')).toBe('light');
      for (const [name, value] of light.declarations)
        expect(rule.declarations.get(name)).toBe(value);
    }
  });

  it('re-sets exactly the roles a theme sets, nothing more', () => {
    for (const rule of rules) {
      const props = [...rule.declarations.keys()].filter((k) => k.startsWith('--')).sort();
      expect(props).toEqual([...light.declarations.keys()].sort());
    }
  });
});
