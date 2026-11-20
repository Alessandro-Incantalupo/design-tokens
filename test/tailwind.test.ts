import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../scripts/lib/roles.ts';
import { parseCss } from '../scripts/lib/css.ts';

const root = resolve(import.meta.dirname, '..');
const bridge = readFileSync(join(root, 'tailwind.css'), 'utf8');

async function build(classes: string[]) {
  const compiler = await compile(`${bridge}\n@tailwind utilities;`, { base: root });
  return compiler.build(classes);
}

describe('tailwind.css', () => {
  it('turns every documented utility into a rule that reads its role', async () => {
    for (const role of ROLES) {
      for (const cls of role.tailwind) {
        const css = await build([cls]);
        expect(css, `${cls} for ${role.name}`).toContain(`var(${role.name})`);
      }
    }
  });

  it('keeps text-danger (readable) apart from bg-danger (fill)', async () => {
    const css = await build(['text-danger', 'bg-danger', 'text-muted', 'text-default']);
    expect(css).toMatch(/\.text-danger \{\s*color: var\(--danger-text\)/);
    expect(css).toMatch(/\.bg-danger \{\s*background-color: var\(--danger\)/);
    expect(css).toMatch(/\.text-muted \{\s*color: var\(--text-muted\)/);
    expect(css).toMatch(/\.text-default \{\s*color: var\(--text\)/);
  });

  it('emits no theme variables (none refers to itself)', async () => {
    const all = ROLES.flatMap((r) => r.tailwind);
    const css = await build(all);
    expect(css).not.toMatch(/:root/);
  });

  it('only maps to roles, never to the palette or brand', () => {
    const [theme] = parseCss(bridge);
    const roleNames = new Set<string>(ROLES.map((r) => r.name));
    for (const [key, value] of theme!.declarations) {
      const target = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
      expect(target && roleNames.has(target), `${key}: ${value}`).toBe(true);
    }
  });
});
