/**
 * Checks every role pair in every theme against its minimum contrast and prints a
 * table. Exits 1 if any pair fails or the themes are inconsistent.
 *
 *   node scripts/contrast.ts             table of every pair
 *   node scripts/contrast.ts --markdown  the role table for the README
 */
import { resolve } from 'node:path';
import { computeTheme, loadModel, orderedThemes, validate } from './lib/model.ts';
import { MIN_RATIO, ROLES } from './lib/roles.ts';
import { contrastRows } from './lib/report.ts';
import { parseColor, toHex } from './lib/color.ts';

const root = resolve(import.meta.dirname, '..');
const model = loadModel(root);

const problems = validate(model);
if (problems.length) {
  console.error(`The tokens have problems:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const rows = contrastRows(model);

if (process.argv.includes('--markdown')) {
  printRoleTable();
  process.exit(0);
}

const header = ['theme', 'text / mark', 'on', 'use', 'ratio', 'min', ''];
const body = rows.map((r) => [
  r.theme,
  r.fg,
  r.bg,
  r.use,
  r.ratio.toFixed(2),
  `${r.min}:1`,
  r.pass ? 'ok' : 'FAIL',
]);
const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => row[i]!.length)));
const line = (cells: string[]) =>
  cells
    .map((c, i) => c.padEnd(widths[i]!))
    .join('  ')
    .trimEnd();
console.log(line(header));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const row of body) console.log(line(row));

const failed = rows.filter((r) => !r.pass);
console.log(`\n${rows.length} pairs, ${failed.length} failing.`);
if (failed.length) process.exit(1);

/** Markdown: role, value per theme, and the lowest ratio of its checked pairs per theme. */
function printRoleTable() {
  const themes = orderedThemes(model);
  const values = new Map(themes.map((t) => [t.name, computeTheme(model, t.name)]));
  const cols = ['Role', 'Tailwind', ...themes.map((t) => t.name), 'Contrast (min)'];
  console.log(`| ${cols.join(' | ')} |`);
  console.log(`| ${cols.map(() => '---').join(' | ')} |`);
  for (const role of ROLES.filter((r) => r.kind === 'color')) {
    const cells = themes.map(
      (t) => `\`${toHex(parseColor(values.get(t.name)!.get(role.name)!.value))}\``,
    );
    let contrast = '';
    if (role.contrast) {
      const lows = themes.map((t) =>
        Math.min(
          ...rows.filter((r) => r.theme === t.name && r.fg === role.name).map((r) => r.ratio),
        ).toFixed(2),
      );
      contrast = `${lows.join(' / ')} (${role.contrast.use}, ${MIN_RATIO[role.contrast.use]}:1)`;
    }
    const tw = role.tailwind.map((c) => `\`${c}\``).join(' ');
    console.log(`| \`${role.name}\` | ${tw} | ${cells.join(' | ')} | ${contrast} |`);
  }
}
