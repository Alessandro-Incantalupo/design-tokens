/**
 * Every role the package defines: what it is for, its Tailwind utilities, and which
 * surfaces it must be readable on. The contrast check and tokens.json read this list;
 * the checks fail if a role here is missing from a theme, or a theme has a role that
 * isn't here.
 */

/**
 * How a role is used decides how much contrast it needs:
 * - small text, 7:1: text that is regularly set under 16 px (table cells, help and error
 *   lines under a field, captions, badges, links in dense admin screens);
 * - text, 4.5:1: text set at 16 px or more (button and fill labels);
 * - non-text, 3:1: something you must see to use the page (a field's edge, the focus
 *   ring, a filled control's shape).
 */
export type ContrastUse = 'small text' | 'text' | 'non-text';

export const MIN_RATIO: Record<ContrastUse, number> = {
  'small text': 7,
  text: 4.5,
  'non-text': 3,
};

export type RoleKind = 'color' | 'shadow' | 'font' | 'radius' | 'size';

export interface Role {
  /** The CSS custom property, e.g. --surface. */
  name: `--${string}`;
  kind: RoleKind;
  description: string;
  /** Tailwind utilities from tailwind.css, as examples of the class names. */
  tailwind: string[];
  /** Colour roles: the backgrounds it is checked against, and how it is used. */
  contrast?: { use: ContrastUse; on: `--${string}`[] };
}

const SURFACES = ['--surface', '--surface-raised', '--surface-sunken'] as const;

export const ROLES: Role[] = [
  {
    name: '--surface',
    kind: 'color',
    description: 'Page background.',
    tailwind: ['bg-surface'],
  },
  {
    name: '--surface-raised',
    kind: 'color',
    description: 'Cards, panels, menus and dialogs that sit above the page.',
    tailwind: ['bg-surface-raised'],
  },
  {
    name: '--surface-sunken',
    kind: 'color',
    description: 'Wells below the page: table headers, code blocks, read-only fields.',
    tailwind: ['bg-surface-sunken'],
  },
  {
    name: '--text',
    kind: 'color',
    description: 'Body text and headings.',
    tailwind: ['text-default'],
    contrast: { use: 'small text', on: [...SURFACES] },
  },
  {
    name: '--text-muted',
    kind: 'color',
    description: 'Secondary text: captions, help lines, table metadata. Often 12-14 px.',
    tailwind: ['text-muted'],
    contrast: { use: 'small text', on: [...SURFACES] },
  },
  {
    name: '--border',
    kind: 'color',
    description: 'Dividers and card edges. Decorative: nothing depends on seeing it.',
    tailwind: ['border-border', 'divide-border'],
  },
  {
    name: '--border-strong',
    kind: 'color',
    description: 'Edges you must see to use a control: inputs, checkboxes, toggles.',
    tailwind: ['border-border-strong'],
    contrast: { use: 'non-text', on: [...SURFACES] },
  },
  {
    name: '--accent',
    kind: 'color',
    description: 'Primary buttons, selected states, active indicators.',
    tailwind: ['bg-accent', 'border-accent'],
    contrast: { use: 'non-text', on: [...SURFACES] },
  },
  {
    name: '--accent-strong',
    kind: 'color',
    description: 'The accent under the pointer or pressed.',
    tailwind: ['hover:bg-accent-strong'],
  },
  {
    name: '--on-accent',
    kind: 'color',
    description: 'Text and icons on the accent fill.',
    tailwind: ['text-on-accent'],
    contrast: { use: 'text', on: ['--accent', '--accent-strong'] },
  },
  {
    name: '--accent-subtle',
    kind: 'color',
    description: 'A tinted background: a selected row, an active menu item, a chip.',
    tailwind: ['bg-accent-subtle'],
  },
  {
    name: '--on-accent-subtle',
    kind: 'color',
    description: 'Text on the tinted accent background.',
    tailwind: ['text-on-accent-subtle'],
    contrast: { use: 'small text', on: ['--accent-subtle'] },
  },
  {
    name: '--link',
    kind: 'color',
    description: 'Links. Underline links inside running text: colour is never the only signal.',
    tailwind: ['text-link'],
    contrast: { use: 'small text', on: [...SURFACES] },
  },
  {
    name: '--link-hover',
    kind: 'color',
    description: 'Links under the pointer.',
    tailwind: ['hover:text-link-hover'],
    contrast: { use: 'small text', on: [...SURFACES] },
  },
  {
    name: '--focus-ring',
    kind: 'color',
    description: 'The keyboard focus outline.',
    tailwind: ['outline-focus-ring', 'ring-focus-ring'],
    contrast: { use: 'non-text', on: [...SURFACES] },
  },
  ...status('danger', 'Errors and destructive actions'),
  ...status('success', 'Confirmations and positive states'),
  ...status('warning', 'Warnings that need attention'),
  {
    name: '--card-shadow',
    kind: 'shadow',
    description: 'Resting elevation of a card.',
    tailwind: ['shadow-card'],
  },
  {
    name: '--overlay-shadow',
    kind: 'shadow',
    description: 'Menus, popovers and dialogs above the page.',
    tailwind: ['shadow-overlay'],
  },
  {
    name: '--body-font',
    kind: 'font',
    description: 'Font stack for all interface text (the system font: no download).',
    tailwind: ['font-body'],
  },
  {
    name: '--code-font',
    kind: 'font',
    description: 'Font stack for code and tabular IDs.',
    tailwind: ['font-code'],
  },
  {
    name: '--control-radius',
    kind: 'radius',
    description: 'Corners of buttons and inputs.',
    tailwind: ['rounded-control'],
  },
  {
    name: '--card-radius',
    kind: 'radius',
    description: 'Corners of cards, panels and dialogs.',
    tailwind: ['rounded-card'],
  },
  {
    name: '--pill-radius',
    kind: 'radius',
    description: 'Fully rounded ends: badges, chips, toggles.',
    tailwind: ['rounded-pill'],
  },
  {
    name: '--focus-ring-width',
    kind: 'size',
    description: 'Thickness of the focus outline.',
    tailwind: [],
  },
  {
    name: '--focus-ring-offset',
    kind: 'size',
    description: 'Gap between a control and its focus outline.',
    tailwind: [],
  },
];

function status(name: string, what: string): Role[] {
  return [
    {
      name: `--${name}`,
      kind: 'color',
      description: `${what}: the fill of a button, badge or banner.`,
      tailwind: [`bg-${name}`, `border-${name}`],
    },
    {
      name: `--on-${name}`,
      kind: 'color',
      description: `Text and icons on the ${name} fill.`,
      tailwind: [`text-on-${name}`],
      contrast: { use: 'text', on: [`--${name}`] },
    },
    {
      name: `--${name}-subtle`,
      kind: 'color',
      description: `A tinted ${name} background for an inline message.`,
      tailwind: [`bg-${name}-subtle`],
    },
    {
      name: `--${name}-text`,
      kind: 'color',
      description: `${what} as text: a field's error line, a message on the ${name}-subtle background.`,
      tailwind: [`text-${name}`],
      contrast: { use: 'small text', on: [...SURFACES, `--${name}-subtle`] },
    },
  ];
}
