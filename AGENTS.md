# AGENTS.md

A CSS-only package of design tokens. What ships: `index.css`, `tokens.css`, `themes/*.css`, `tailwind.css`, `tokens.json`. Everything in `scripts/` and `test/` is tooling and isn't published.

## Rules

- Components use roles only. Palette and brand tokens never appear in `tailwind.css`.
- A new role needs four things: an entry in `scripts/lib/roles.ts` (description, Tailwind classes, contrast use), a value in every theme file, a line in `tailwind.css`, and a row in the README table (`pnpm contrast --markdown`).
- A role name must never equal its Tailwind key. Use `--surface` for the token and `--color-surface: var(--surface)` in the bridge. A key that reads itself makes Tailwind emit a variable that refers to itself.
- `themes/dark.css` has the same declarations twice: once under `[data-theme='dark']` and once in the `prefers-color-scheme` fallback. Edit both. The checks fail if they differ.
- Defaults sit under `:where(:root)` so that site overrides win in any order. Keep it that way.
- Colours are hex, so the contrast check can read them.
- `tokens.json` is generated. After any CSS change, run `pnpm tokens:build`.

## Before you call a change done

```sh
pnpm check
```

This runs the format check, typecheck, tests, the contrast check and the tokens.json drift check. CI runs the same steps, plus `pnpm pack --dry-run`. Never run `npm publish`: the maintainer publishes.
