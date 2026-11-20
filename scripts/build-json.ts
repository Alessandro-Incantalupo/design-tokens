/**
 * Writes the generated files from the CSS: tokens.json and surfaces.css. With --check,
 * writes nothing and fails if either differs from what the CSS gives (CI runs this).
 *
 *   node scripts/build-json.ts [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadModel, validate } from './lib/model.ts';
import { serializeJson, tokensJson } from './lib/report.ts';
import { surfacesCss } from './lib/surfaces.ts';

const root = resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');

const model = loadModel(root);
const problems = validate(model);
if (problems.length) {
  console.error(`The tokens have problems:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const outputs: [file: string, content: string][] = [
  ['tokens.json', serializeJson(tokensJson(model))],
  ['surfaces.css', surfacesCss(model)],
];

let stale = false;
for (const [file, next] of outputs) {
  const target = join(root, file);
  if (check) {
    let current = '';
    try {
      current = readFileSync(target, 'utf8');
    } catch {
      // missing counts as out of date
    }
    if (current !== next) {
      console.error(`${file} is out of date with the CSS. Run: pnpm tokens:build`);
      stale = true;
    }
  } else {
    writeFileSync(target, next);
    console.log(`Wrote ${file}.`);
  }
}
if (stale) process.exit(1);
if (check) console.log('tokens.json and surfaces.css match the CSS.');
