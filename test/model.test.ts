import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveVars, parseCss } from '../scripts/lib/css.ts';
import { buildModel, computeTheme, loadModel, validate } from '../scripts/lib/model.ts';
import { contrastRows, serializeJson, tokensJson } from '../scripts/lib/report.ts';
import { ROLES } from '../scripts/lib/roles.ts';

const root = resolve(import.meta.dirname, '..');

describe('parseCss', () => {
  it('reads rules, selector lists, @media and skips @import and comments', () => {
    const rules = parseCss(`
      @import './a.css';
      /* a comment with { braces } */
      :where(:root), [data-theme='x'] { --a: 1px; --font: 'A B', serif; }
      @media (prefers-color-scheme: dark) { :root:not([data-theme]) { --a: 2px } }
    `);
    expect(rules).toHaveLength(2);
    expect(rules[0]!.selectors).toEqual([':where(:root)', "[data-theme='x']"]);
    expect(rules[0]!.declarations.get('--font')).toBe("'A B', serif");
    expect(rules[1]!.media).toBe('(prefers-color-scheme: dark)');
  });
});

describe('resolveVars', () => {
  const vars: Record<string, string> = { '--a': '#fff', '--b': 'var(--a)' };
  const lookup = (n: string) => (vars[n] ? resolveVars(vars[n]!, lookup) : undefined);

  it('follows chains and uses fallbacks', () => {
    expect(resolveVars('var(--b)', lookup)).toBe('#fff');
    expect(resolveVars('var(--missing, var(--a))', lookup)).toBe('#fff');
    expect(resolveVars('0 1px var(--a)', lookup)).toBe('0 1px #fff');
  });

  it('fails on an undefined variable without fallback', () => {
    expect(() => resolveVars('var(--nope)', lookup)).toThrow('--nope is not defined');
  });
});

// A miniature package: every role set in the default theme, a few in a second theme.
const tokensCss = `:where(:root) { --palette-ink: #111111; --palette-paper: #ffffff; --brand-accent: #0f52d4; }`;
function roleBlock(selector: string, overrides: Record<string, string> = {}) {
  const decls = ROLES.map((r) => {
    const value =
      overrides[r.name] ??
      (r.kind === 'color'
        ? r.name.startsWith('--surface') || r.name.endsWith('-subtle') || r.name === '--border'
          ? 'var(--palette-paper)'
          : r.name.startsWith('--on-') && !r.name.endsWith('-subtle')
            ? 'var(--palette-paper)'
            : 'var(--palette-ink)'
        : '1px');
    return `${r.name}: ${value};`;
  });
  return `${selector} { ${decls.join(' ')} }`;
}

describe('model', () => {
  it('computes a theme from its own block, inheriting the rest from :root', () => {
    const model = buildModel(tokensCss, [
      {
        name: 'light',
        css: roleBlock(":where(:root), [data-theme='light']", {
          '--accent': 'var(--brand-accent)',
        }),
      },
      {
        name: 'dark',
        css: roleBlock("[data-theme='dark']", {
          '--surface': 'var(--palette-ink)',
          '--text': 'var(--palette-paper)',
        }),
      },
    ]);
    expect(validate(model).filter((p) => !p.includes('failing'))).toEqual([]);
    expect(computeTheme(model, 'light').get('--accent')).toEqual({
      declared: 'var(--brand-accent)',
      value: '#0f52d4',
    });
    expect(computeTheme(model, 'dark').get('--surface')!.value).toBe('#111111');
    expect(computeTheme(model, 'dark').get('--palette-paper')!.value).toBe('#ffffff');
  });

  it('flags a theme that misses a role or adds an unknown one', () => {
    const light = roleBlock(":where(:root), [data-theme='light']");
    const dark = roleBlock("[data-theme='dark']").replace('--text-muted:', '--text-mute:');
    const problems = validate(
      buildModel(tokensCss, [
        { name: 'light', css: light },
        { name: 'dark', css: dark },
      ]),
    );
    expect(problems).toContain('dark: missing --text-muted');
    expect(problems.some((p) => p.includes('--text-mute is not a registered role'))).toBe(true);
  });

  it('fails when the prefers-color-scheme copy drifts from the theme block', () => {
    const light = roleBlock(":where(:root), [data-theme='light']");
    const dark =
      roleBlock("[data-theme='dark']") +
      `@media (prefers-color-scheme: dark) { ${roleBlock(':root:not([data-theme])', { '--text': '#123456' })} }`;
    expect(() =>
      buildModel(tokensCss, [
        { name: 'light', css: light },
        { name: 'dark', css: dark },
      ]),
    ).toThrow(/differs from the \[data-theme='dark'\] block/);
  });

  it('needs exactly one default theme', () => {
    const a = roleBlock("[data-theme='a']");
    const b = roleBlock("[data-theme='b']");
    expect(() =>
      buildModel(tokensCss, [
        { name: 'a', css: a },
        { name: 'b', css: b },
      ]),
    ).toThrow(/Exactly one theme/);
  });

  it('reports failing contrast pairs', () => {
    const model = buildModel(tokensCss, [
      {
        name: 'light',
        css: roleBlock(":where(:root), [data-theme='light']", { '--text-muted': '#999999' }),
      },
    ]);
    const muted = contrastRows(model).filter((r) => r.fg === '--text-muted');
    expect(muted.every((r) => !r.pass && r.min === 7)).toBe(true);
  });
});

describe('tokens.json', () => {
  const model = loadModel(root);
  const data = tokensJson(model);

  it('is what the CSS gives (no drift)', () => {
    expect(readFileSync(join(root, 'tokens.json'), 'utf8')).toBe(serializeJson(data));
  });

  it('has every role with a resolved value in every theme', () => {
    expect(Object.keys(data.themes)).toEqual(['light', 'dark']);
    for (const theme of Object.values(data.themes)) {
      for (const role of ROLES) {
        const entry = theme.roles[role.name]!;
        expect(entry.value).not.toContain('var(');
        if (role.kind === 'color') expect(entry.value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
      }
    }
    expect(data.themes['light']!.roles['--accent']).toEqual({
      value: '#0f52d4',
      declared: 'var(--brand-accent)',
    });
  });

  it('has the layers and a passing contrast list', () => {
    expect(data.palette['--palette-neutral-50']).toBe('#f9fafc');
    expect(data.brand['--brand-accent']!.value).toBe('#0f52d4');
    expect(data.scale['--space-4']).toBe('1rem');
    expect(data.contrast.length).toBeGreaterThan(0);
    expect(data.contrast.every((r) => r.pass)).toBe(true);
  });

  it('finds no problems in the shipped themes', () => {
    expect(validate(model)).toEqual([]);
  });
});
