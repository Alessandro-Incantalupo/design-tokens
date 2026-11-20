/**
 * Reads tokens.css and the theme files into one model, checks that the themes are
 * complete and consistent, and computes every role's value per theme the way the
 * browser would.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseCss, resolveVars, type CssRule } from './css.ts';
import { ROLES } from './roles.ts';

export interface Theme {
  name: string;
  /** The selector list of the theme's main block, as written. */
  selector: string;
  /** True for the theme that also applies to :root. */
  isDefault: boolean;
  /** Custom properties the theme declares. */
  declarations: Map<string, string>;
}

export interface TokenModel {
  /** Custom properties from tokens.css (palette, scale, brand, shared roles). */
  base: Map<string, string>;
  themes: Theme[];
}

export interface Computed {
  /** The value as written in the CSS. */
  declared: string;
  /** With every var() replaced. */
  value: string;
}

export interface Source {
  name: string;
  css: string;
}

/** Builds the model from CSS text: tokens.css and one source per theme file. */
export function buildModel(tokensCss: string, themeSources: Source[]): TokenModel {
  const baseRules = parseCss(tokensCss);
  const base = new Map<string, string>();
  for (const rule of baseRules) {
    if (rule.media || !rule.selectors.every(isRootSelector)) {
      throw new Error(
        `tokens.css: only :root blocks are expected, found "${rule.selectors.join(', ')}"`,
      );
    }
    for (const [k, v] of customProperties(rule)) base.set(k, v);
  }

  const themes = themeSources.map(({ name, css }) => readTheme(name, css));
  const defaults = themes.filter((t) => t.isDefault);
  if (defaults.length !== 1) {
    throw new Error(`Exactly one theme must also apply to :root; found ${defaults.length}`);
  }
  return { base, themes };
}

/** Reads tokens.css and themes/*.css from the package folder. */
export function loadModel(root: string): TokenModel {
  const themeDir = join(root, 'themes');
  const sources = readdirSync(themeDir)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => ({ name: basename(f, '.css'), css: readFileSync(join(themeDir, f), 'utf8') }));
  return buildModel(readFileSync(join(root, 'tokens.css'), 'utf8'), sources);
}

function readTheme(name: string, css: string): Theme {
  const rules = parseCss(css);
  const attribute = new RegExp(`^\\[data-theme=(['"]?)${name}\\1\\]$`);
  const main = rules.find((r) => !r.media && r.selectors.some((s) => attribute.test(s)));
  if (!main) throw new Error(`themes/${name}.css: no [data-theme='${name}'] block`);

  const declarations = customProperties(main);
  for (const rule of rules) {
    if (rule === main) continue;
    // Any other block must repeat the main one exactly (the prefers-color-scheme fallback).
    const same =
      sameEntries(rule.declarations, main.declarations) &&
      rule.selectors.every((s) => s.startsWith(':root'));
    if (!same) {
      throw new Error(
        `themes/${name}.css: the block "${rule.selectors.join(', ')}" differs from the [data-theme='${name}'] block`,
      );
    }
  }
  return {
    name,
    selector: main.selectors.join(', '),
    isDefault: main.selectors.some(isRootSelector),
    declarations,
  };
}

function isRootSelector(selector: string): boolean {
  return selector === ':root' || selector === ':where(:root)';
}

function customProperties(rule: CssRule): Map<string, string> {
  return new Map([...rule.declarations].filter(([k]) => k.startsWith('--')));
}

function sameEntries(a: Map<string, string>, b: Map<string, string>): boolean {
  return a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
}

/**
 * Every custom property's value in a theme, as the browser computes it on an element
 * with that data-theme: the theme's own declarations resolve there; everything else is
 * inherited from :root, where tokens.css and the default theme apply.
 */
export function computeTheme(model: TokenModel, themeName: string): Map<string, Computed> {
  const theme = model.themes.find((t) => t.name === themeName);
  if (!theme) throw new Error(`Unknown theme ${themeName}`);
  const fallback = model.themes.find((t) => t.isDefault)!;

  const rootDeclared = new Map([...model.base, ...fallback.declarations]);
  const root = resolver(rootDeclared, () => undefined);
  if (theme.isDefault) return root.all();
  const own = resolver(theme.declarations, (name) => root.get(name));
  return new Map([...root.all(), ...own.all()]);
}

function resolver(
  declared: Map<string, string>,
  inherited: (name: string) => Computed | undefined,
) {
  const cache = new Map<string, Computed>();
  const resolving = new Set<string>();
  const get = (name: string): Computed | undefined => {
    if (!declared.has(name)) return inherited(name);
    const hit = cache.get(name);
    if (hit) return hit;
    if (resolving.has(name)) throw new Error(`${name} refers to itself`);
    resolving.add(name);
    const value = resolveVars(declared.get(name)!, (ref) => get(ref)?.value);
    resolving.delete(name);
    const computed = { declared: declared.get(name)!, value };
    cache.set(name, computed);
    return computed;
  };
  return {
    get,
    all: () => new Map([...declared.keys()].map((k) => [k, get(k)!])),
  };
}

/** Problems that make the token set unfit to ship; empty when all is well. */
export function validate(model: TokenModel): string[] {
  const problems: string[] = [];
  const roleNames = new Set<string>(ROLES.map((r) => r.name));
  const fallback = model.themes.find((t) => t.isDefault)!;
  const expected = [...fallback.declarations.keys()].sort();

  for (const theme of model.themes) {
    const keys = [...theme.declarations.keys()].sort();
    const missing = expected.filter((k) => !theme.declarations.has(k));
    const extra = keys.filter((k) => !fallback.declarations.has(k));
    if (missing.length) problems.push(`${theme.name}: missing ${missing.join(', ')}`);
    if (extra.length) problems.push(`${theme.name}: not in ${fallback.name}: ${extra.join(', ')}`);
    for (const key of keys) {
      if (!roleNames.has(key)) problems.push(`${theme.name}: ${key} is not a registered role`);
    }
    let computed: Map<string, Computed> | undefined;
    try {
      computed = computeTheme(model, theme.name);
    } catch (error) {
      problems.push(`${theme.name}: ${(error as Error).message}`);
    }
    if (computed) {
      for (const role of ROLES) {
        if (!computed.has(role.name))
          problems.push(`${theme.name}: role ${role.name} has no value`);
      }
    }
  }
  for (const key of model.base.keys()) {
    if (
      key.startsWith('--') &&
      roleNames.has(key) &&
      model.themes.some((t) => t.declarations.has(key))
    ) {
      problems.push(`${key} is set in tokens.css and in a theme: keep it in one place`);
    }
  }
  return problems;
}

export function defaultTheme(model: TokenModel): Theme {
  return model.themes.find((t) => t.isDefault)!;
}

/** Themes with the default first, then by name. */
export function orderedThemes(model: TokenModel): Theme[] {
  return [...model.themes].sort((a, b) =>
    a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1,
  );
}
