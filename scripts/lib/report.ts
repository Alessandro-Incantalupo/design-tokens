/**
 * The two outputs built from the model: the contrast rows and tokens.json.
 */
import { contrastRatio, parseColor, toHex } from './color.ts';
import { computeTheme, orderedThemes, type TokenModel } from './model.ts';
import { MIN_RATIO, ROLES, type ContrastUse } from './roles.ts';

export interface ContrastRow {
  theme: string;
  fg: string;
  bg: string;
  use: ContrastUse;
  min: number;
  /** Rounded down to two decimals, so a shown value never passes by rounding. */
  ratio: number;
  pass: boolean;
}

export function contrastRows(model: TokenModel): ContrastRow[] {
  const rows: ContrastRow[] = [];
  for (const theme of orderedThemes(model)) {
    const values = computeTheme(model, theme.name);
    const color = (name: string) => parseColor(values.get(name)!.value);
    const page = color('--surface');
    for (const role of ROLES) {
      if (!role.contrast) continue;
      for (const bg of role.contrast.on) {
        const exact = contrastRatio(color(role.name), color(bg), page);
        const min = MIN_RATIO[role.contrast.use];
        rows.push({
          theme: theme.name,
          fg: role.name,
          bg,
          use: role.contrast.use,
          min,
          ratio: Math.floor(exact * 100) / 100,
          pass: exact >= min,
        });
      }
    }
  }
  return rows;
}

export const GENERATED_NOTE =
  'Generated from the CSS by scripts/build-json.ts (pnpm tokens:build). Do not edit by hand.';

/** The data in tokens.json: layers, roles, every role's value per theme, and contrast. */
export function tokensJson(model: TokenModel) {
  const pick = (prefixes: string[]) =>
    Object.fromEntries([...model.base].filter(([k]) => prefixes.some((p) => k.startsWith(p))));
  const rootValues = computeTheme(model, orderedThemes(model)[0]!.name);
  const kindOf = new Map(ROLES.map((r) => [r.name as string, r.kind]));

  const themes = Object.fromEntries(
    orderedThemes(model).map((theme) => {
      const values = computeTheme(model, theme.name);
      return [
        theme.name,
        {
          selector: theme.selector,
          default: theme.isDefault,
          roles: Object.fromEntries(
            ROLES.map((role) => {
              const v = values.get(role.name)!;
              const value =
                kindOf.get(role.name) === 'color' ? toHex(parseColor(v.value)) : v.value;
              return [role.name, { value, declared: v.declared }];
            }),
          ),
        },
      ];
    }),
  );

  return {
    $comment: GENERATED_NOTE,
    contrastRules: {
      'small text': `${MIN_RATIO['small text']}:1, text regularly set under 16 px`,
      text: `${MIN_RATIO.text}:1, text set at 16 px or more`,
      'non-text': `${MIN_RATIO['non-text']}:1, edges and indicators you must see to use the page`,
    },
    palette: pick(['--palette-']),
    scale: pick(['--type-', '--space-']),
    brand: Object.fromEntries(
      [...model.base.keys()]
        .filter((k) => k.startsWith('--brand-'))
        .map((k) => {
          const v = rootValues.get(k)!;
          return [k, { value: toHex(parseColor(v.value)), declared: v.declared }];
        }),
    ),
    roles: ROLES.map((role) => ({
      name: role.name,
      kind: role.kind,
      description: role.description,
      tailwind: role.tailwind,
      ...(role.contrast
        ? {
            contrast: {
              use: role.contrast.use,
              min: MIN_RATIO[role.contrast.use],
              on: role.contrast.on,
            },
          }
        : {}),
    })),
    themes,
    contrast: contrastRows(model),
  };
}

export function serializeJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
