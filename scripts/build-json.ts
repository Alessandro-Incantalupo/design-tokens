/**
 * Writes tokens.json from the CSS. With --check, writes nothing and fails if
 * tokens.json differs from what the CSS gives (CI runs this).
 *
 *   node scripts/build-json.ts [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadModel, validate } from './lib/model.ts';
import { serializeJson, tokensJson } from './lib/report.ts';

const root = resolve(import.meta.dirname, '..');
const target = join(root, 'tokens.json');
const check = process.argv.includes('--check');

const model = loadModel(root);
const problems = validate(model);
if (problems.length) {
  console.error(`The tokens have problems:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const next = serializeJson(tokensJson(model));
if (check) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    // missing counts as out of date
  }
  if (current !== next) {
    console.error('tokens.json is out of date with the CSS. Run: pnpm tokens:build');
    process.exit(1);
  }
  console.log('tokens.json matches the CSS.');
} else {
  writeFileSync(target, next);
  console.log(`Wrote ${target.slice(root.length + 1)}.`);
}
