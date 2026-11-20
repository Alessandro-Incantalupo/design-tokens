# @a.incantalupo/design-tokens

Design tokens as plain CSS custom properties, with no framework and no build step. They come in three layers: a palette, a brand accent you can override, and roles that components use. There are light and dark themes, switched with a `data-theme` attribute or by the system setting. You also get a Tailwind CSS 4 bridge and a `tokens.json` export. Every text and control pair is checked for contrast in CI.

## Install

```sh
npm install @a.incantalupo/design-tokens
```

## Use

The main entry (`@a.incantalupo/design-tokens`, which is `index.css`) loads everything: palette, scale, brand, and the light and dark themes. Components read roles:

```css
body {
  background: var(--surface);
  color: var(--text);
  font-family: var(--body-font);
}
.card {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}
.hint {
  color: var(--text-muted);
}
:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

**Plain HTML**

```html
<link rel="stylesheet" href="/node_modules/@a.incantalupo/design-tokens/index.css" />
```

**Tailwind CSS 4**

```css
@import 'tailwindcss';
@import '@a.incantalupo/design-tokens';
@import '@a.incantalupo/design-tokens/tailwind.css';
```

```html
<div class="bg-surface-raised border border-border rounded-card shadow-card">
  <p class="text-muted">Last sync 2 minutes ago</p>
  <button class="bg-accent text-on-accent hover:bg-accent-strong rounded-control">Save</button>
</div>
```

The bridge uses `@theme inline`, so each utility reads the variable where it is used (`background-color: var(--surface)`). A `data-theme` on any element then restyles everything inside it. Only roles are bridged: palette colours never become class names. Tailwind is an optional peer dependency, needed only for this file.

**Angular** (global styles, for example with PrimeNG)

```css
/* src/styles.css */
@import '@a.incantalupo/design-tokens';
```

Or list `node_modules/@a.incantalupo/design-tokens/index.css` under `styles` in `angular.json`. To skin PrimeNG, point its semantic tokens at the roles. Here is a sketch for a PrimeNG preset (check its docs for your version):

```ts
const scheme = {
  primary: {
    color: 'var(--accent)',
    contrastColor: 'var(--on-accent)',
    hoverColor: 'var(--accent-strong)',
    activeColor: 'var(--accent-strong)',
  },
};
providePrimeNG({
  theme: {
    preset: definePreset(Aura, {
      semantic: {
        focusRing: { color: 'var(--focus-ring)' },
        colorScheme: { light: scheme, dark: scheme },
      },
    }),
    options: { darkModeSelector: '[data-theme="dark"]' },
  },
});
```

**Astro**

```astro
---
// src/layouts/Base.astro
import '@a.incantalupo/design-tokens';
---
```

**SvelteKit**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '@a.incantalupo/design-tokens';
</script>
```

To avoid a flash of the wrong theme, render `data-theme` on `<html>` on the server (from a cookie or a site setting), not from `localStorage` after the page loads.

## The three layers

1. **Palette** (`tokens.css`): raw values. Colours are `--palette-neutral-50` to `-950`, plus `blue`, `red`, `green` and `amber` ramps, `--palette-white` and `--palette-black`. The palette also has a type scale (`--type-xs` to `--type-4xl` and `--type-leading-*`) and spacing (`--space-1` to `--space-16`). Components don't use palette colours directly.
2. **Brand** (`tokens.css`): the accent, in one block for both themes. Light themes read `--brand-accent`, `--brand-accent-strong`, `--brand-on-accent`, `--brand-accent-subtle` and `--brand-accent-text`. Dark themes read the same five names with a `-dark` suffix.
3. **Roles** (`themes/*.css`, plus the shared ones in `tokens.css`): what components use. A theme sets every colour role and the shadows. Fonts, radii and the focus ring size are the same in every theme.

Roles have no `--color-` prefix on purpose. The Tailwind bridge maps `--color-surface: var(--surface)`. If a token had the same name as its Tailwind key, it would refer to itself.

## Roles

| Role                 | Tailwind                               | light     | dark      | Lowest contrast (light / dark) |
| -------------------- | -------------------------------------- | --------- | --------- | ------------------------------ |
| `--surface`          | `bg-surface`                           | `#f9fafc` | `#151a21` |                                |
| `--surface-raised`   | `bg-surface-raised`                    | `#ffffff` | `#242b34` |                                |
| `--surface-sunken`   | `bg-surface-sunken`                    | `#f2f4f7` | `#070a0f` |                                |
| `--text`             | `text-default`                         | `#151a21` | `#f9fafc` | 15.86 / 13.67 (small text)     |
| `--text-muted`       | `text-muted`                           | `#47515e` | `#cfd5dc` | 7.31 / 9.66 (small text)       |
| `--border`           | `border-border` `divide-border`        | `#e3e6ec` | `#38404d` | decorative, not checked        |
| `--border-strong`    | `border-border-strong`                 | `#6a7482` | `#9aa2ae` | 4.29 / 5.54 (non-text)         |
| `--accent`           | `bg-accent` `border-accent`            | `#0f52d4` | `#6d9ffe` | 5.99 / 5.46 (non-text)         |
| `--accent-strong`    | `hover:bg-accent-strong`               | `#0b43ae` | `#a0c1fe` |                                |
| `--on-accent`        | `text-on-accent`                       | `#ffffff` | `#070a0f` | 6.60 / 7.59 (text)             |
| `--accent-subtle`    | `bg-accent-subtle`                     | `#f0f5fe` | `#0e2654` |                                |
| `--on-accent-subtle` | `text-on-accent-subtle`                | `#0b43ae` | `#a0c1fe` | 7.90 / 8.11 (small text)       |
| `--link`             | `text-link`                            | `#0b43ae` | `#a0c1fe` | 7.84 / 7.85 (small text)       |
| `--link-hover`       | `hover:text-link-hover`                | `#151a21` | `#f9fafc` | 15.86 / 13.67 (small text)     |
| `--focus-ring`       | `outline-focus-ring` `ring-focus-ring` | `#0b43ae` | `#a0c1fe` | 7.84 / 7.85 (non-text)         |
| `--danger`           | `bg-danger` `border-danger`            | `#b31220` | `#fa706a` |                                |
| `--on-danger`        | `text-on-danger`                       | `#ffffff` | `#070a0f` | 6.94 / 7.16 (text)             |
| `--danger-subtle`    | `bg-danger-subtle`                     | `#fef2f1` | `#491513` |                                |
| `--danger-text`      | `text-danger`                          | `#92131b` | `#fea69e` | 8.17 / 7.59 (small text)       |
| `--success`          | `bg-success` `border-success`          | `#1d7339` | `#46bc69` |                                |
| `--on-success`       | `text-on-success`                      | `#ffffff` | `#070a0f` | 5.89 / 8.17 (text)             |
| `--success-subtle`   | `bg-success-subtle`                    | `#eafaec` | `#15301b` |                                |
| `--success-text`     | `text-success`                         | `#1a5d2f` | `#7fd994` | 7.19 / 8.33 (small text)       |
| `--warning`          | `bg-warning` `border-warning`          | `#f3a504` | `#f3a504` |                                |
| `--on-warning`       | `text-on-warning`                      | `#070a0f` | `#070a0f` | 9.62 / 9.62 (text)             |
| `--warning-subtle`   | `bg-warning-subtle`                    | `#fffaf4` | `#392401` |                                |
| `--warning-text`     | `text-warning`                         | `#6a4603` | `#fece8c` | 7.65 / 9.80 (small text)       |

There are also these roles: `--card-shadow` and `--overlay-shadow` (`shadow-card`, `shadow-overlay`), `--body-font` and `--code-font` (`font-body`, `font-code`), `--control-radius`, `--card-radius` and `--pill-radius` (`rounded-control`, `rounded-card`, `rounded-pill`), and `--focus-ring-width` and `--focus-ring-offset`. `text-danger` is the readable red for text, and `bg-danger` is the fill. The same split applies to `success` and `warning`.

The table above comes from `pnpm contrast --markdown`.

## Themes and rebranding

- **Switch themes** with `data-theme="light"` or `data-theme="dark"` on `<html>` or any element. Themes nest. With no `data-theme` on `<html>`, the page follows the system setting. Set `data-theme="light"` on `<html>` to stay light.
- **Rebrand** by overriding the brand layer once, for both themes. Defaults have zero specificity (`:where(:root)`), so your block wins wherever it sits:

  ```css
  :root {
    --brand-accent: #0f766e;
    --brand-accent-strong: #115e59;
    --brand-on-accent: #ffffff;
    --brand-accent-subtle: #f0fdfa;
    --brand-accent-text: #134e4a;
    --brand-accent-dark: #2dd4bf;
    --brand-accent-strong-dark: #5eead4;
    --brand-on-accent-dark: #042f2e;
    --brand-accent-subtle-dark: #042f2e;
    --brand-accent-text-dark: #5eead4;
  }
  ```

  You can also set these on an element that carries `data-theme`, for example one tenant's section. Keep `on-accent` at 4.5:1 on the accent. Keep `accent-text` at 7:1 on every surface and on `accent-subtle`.

- **Add a theme**: create a `[data-theme='name']` block that sets every role `themes/light.css` sets. The repo's checks require this for the themes they ship.

## Inverse surfaces

An area in the other theme's colours, such as a dark call-to-action band on a light page, is an inverse surface:

```html
<section data-surface="inverse" class="bg-surface text-default">
  <h2>Ready to start?</h2>
  <a class="bg-accent text-on-accent rounded-control" href="/contact">Book a call</a>
  <a class="border border-border-strong rounded-control" href="/cv.pdf">Download the CV</a>
</section>
```

It re-sets every role inside it: on a light page it takes the dark theme's roles, on a dark page the light ones. Components inside keep the classes they use everywhere else, so a button copied from the hero stays readable. Don't make separate `on-band`-style roles for such an area: a component then has to know where it sits, and the one that doesn't is invisible.

`surfaces.css` is generated from the two theme files (`pnpm tokens:build`), so its values are the ones the contrast check already covers. The main entry includes it; with your own imports, add `@import '@a.incantalupo/design-tokens/surfaces.css';` after the themes. "The page" is the theme on `<html>`, or the system's when `<html>` has no `data-theme`. Inside a section with its own `data-theme`, give the area an explicit `data-theme` instead.

## Contrast rules

`pnpm contrast` resolves every role in every theme and checks each pair. It fails below these minimums:

| Use        | Minimum | Roles                                                                                                                                    |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| small text | 7:1     | `text`, `text-muted`, `link`, `link-hover`, `on-accent-subtle`, `danger-text`, `success-text`, `warning-text`, on every surface they use |
| text       | 4.5:1   | `on-accent` (on `accent` and `accent-strong`), `on-danger`, `on-success`, `on-warning`, on their fills                                   |
| non-text   | 3:1     | `focus-ring`, `border-strong` and `accent` against each surface                                                                          |

"Small text" covers roles that are regularly set under 16 px: table cells, help and error lines, captions and dense admin screens. They need 7:1, which is stricter than WCAG AA, because small grey text is what people struggle to read. Labels on fills are 4.5:1, which assumes button text of 16 px or more. If your buttons are smaller, choose a darker accent. `--border` is decorative, so use `--border-strong` for anything a user must see, such as a field edge. Colour is never the only signal: underline links in running text, and put error messages in words.

## tokens.json

`tokens.json` is generated from the CSS, and CI fails if it drifts. It contains:

- the palette, scale and brand values;
- every role with its description, Tailwind classes and contrast rule;
- every role's value per theme, both resolved and as written;
- every checked pair with its ratio.

```js
import tokens from '@a.incantalupo/design-tokens/tokens.json' with { type: 'json' };
tokens.themes.dark.roles['--text-muted'].value; // '#cfd5dc'
```

## Development

Node and pnpm versions are pinned in `mise.toml` (`mise install`).

```sh
pnpm install
pnpm check          # format, typecheck, tests, contrast, tokens.json drift
pnpm tokens:build   # regenerate tokens.json after editing the CSS
pnpm contrast       # the full contrast table
```

## Licence

MIT © Alessandro Incantalupo
