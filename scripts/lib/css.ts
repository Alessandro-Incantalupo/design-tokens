/**
 * A small CSS reader for this package's own files: rules, @media blocks and
 * declarations, and var() resolution. Not a general CSS parser: it handles what the
 * token files use (flat rules, one level of @media, @theme blocks, @import lines).
 */

export interface CssRule {
  /** Selector list, split on top-level commas; for an at-rule block such as @theme, its prelude. */
  selectors: string[];
  /** The @media prelude this rule sits in, if any. */
  media: string | null;
  /** Property to value, in source order, whitespace collapsed. */
  declarations: Map<string, string>;
}

export function parseCss(source: string): CssRule[] {
  return parseBlock(stripComments(source), null);
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseBlock(source: string, media: string | null): CssRule[] {
  const rules: CssRule[] = [];
  let i = 0;
  while (i < source.length) {
    const open = indexOutside(source, '{', i);
    const semi = indexOutside(source, ';', i);
    // A statement such as @import ends at ";" before any block opens.
    if (semi !== -1 && (open === -1 || semi < open)) {
      i = semi + 1;
      continue;
    }
    if (open === -1) {
      if (source.slice(i).trim() !== '')
        throw new Error(`Unexpected CSS: ${source.slice(i).trim()}`);
      break;
    }
    const prelude = collapse(source.slice(i, open));
    const close = matching(source, open);
    const body = source.slice(open + 1, close);
    if (prelude.startsWith('@media')) {
      if (media) throw new Error('Nested @media is not supported');
      rules.push(...parseBlock(body, collapse(prelude.slice('@media'.length))));
    } else {
      const selectors = prelude.startsWith('@') ? [prelude] : splitTopLevel(prelude, ',');
      rules.push({ selectors, media, declarations: parseDeclarations(body) });
    }
    i = close + 1;
  }
  return rules;
}

function parseDeclarations(body: string): Map<string, string> {
  if (indexOutside(body, '{', 0) !== -1) throw new Error('Nested rules are not supported');
  const declarations = new Map<string, string>();
  for (const part of splitTopLevel(body, ';')) {
    const colon = part.indexOf(':');
    if (colon === -1) throw new Error(`Not a declaration: "${part}"`);
    const property = part.slice(0, colon).trim();
    const value = collapse(part.slice(colon + 1));
    if (declarations.has(property)) throw new Error(`${property} is declared twice in one block`);
    declarations.set(property, value);
  }
  return declarations;
}

/** Splits on a separator outside quotes and brackets; drops empty parts. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => collapse(p)).filter((p) => p !== '');
}

function indexOutside(text: string, target: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === target) return i;
  }
  return -1;
}

function matching(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  throw new Error('Unclosed block');
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Replaces every var(--name, fallback) in a value, innermost first, using `lookup`.
 * `lookup` returns undefined for an undefined variable; then the fallback is used, and
 * without one this throws.
 */
export function resolveVars(value: string, lookup: (name: string) => string | undefined): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const start = value.indexOf('var(', i);
    if (start === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, start);
    const end = closingParen(value, start + 3);
    const inner = value.slice(start + 4, end);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
    const found = lookup(name);
    if (found !== undefined) out += found;
    else if (fallback !== undefined) out += resolveVars(fallback, lookup);
    else throw new Error(`${name} is not defined`);
    i = end + 1;
  }
  return out;
}

function closingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  throw new Error(`Unclosed var() in "${text}"`);
}
