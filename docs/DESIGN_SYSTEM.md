# MayaStack Design System

This document describes MayaStack's visual foundation: semantic colour tokens, contrast rules, focus and motion conventions, typography, and the heading font's licence and provenance. It belongs to Stage 1 of [the redesign roadmap](REDESIGN_ROADMAP.md).

## 1. Status

| Part | Status |
|---|---|
| Tokens, `color-scheme`, focus utility, reduced motion, heading font | Implemented (Stage 1, PR 1) |
| Existing components use the tokens | Planned (Stage 1, PR 2) |

Until PR 2, existing components still use their earlier Tailwind colours and the `ms-*` brand tokens. Section 9 lists the approved decisions that PR 2 applies.

## 2. Source of truth

`src/index.css` is the source of truth for all palette values. Light values are defined in `@theme static`, and dark values override the same variables under `.dark`. One token name therefore works in both themes, so components need no `dark:` colour variants.

`@theme static` keeps every variable in the compiled CSS even before a utility uses it, so plain CSS (such as third-party widget overrides) can rely on `var(--color-…)`.

Do not copy palette values into components or tests. Browser tests read the computed values.

## 3. Tokens

Each token is available as a Tailwind colour (`bg-surface`, `text-fg`, `border-line-strong`, `outline-focus`, …) and as a CSS variable (`var(--color-surface)`).

| Token | Role |
|---|---|
| `canvas` | Page background: warm parchment (light), obsidian (dark) |
| `surface` | Cards and panels |
| `surface-raised` | Menus, popovers, toasts |
| `surface-hover`, `surface-active` | Hovered and pressed secondary controls and menu rows |
| `well` | Input fields |
| `line` | Decorative separators only. Never the only boundary of a control. |
| `line-strong` | Control boundaries: inputs, selects, secondary buttons, toggle tracks |
| `fg` | Main text |
| `fg-muted` | Labels and secondary text |
| `fg-subtle` | Hints and placeholders |
| `fg-disabled` | Inactive controls only |
| `accent`, `accent-hover`, `accent-active` | Ceremonial gold fills for primary actions and selection |
| `on-accent` | Text and marks on gold |
| `accent-fg` | Gold text, borders, radio and selection indicators |
| `accent-subtle` | Selected tint |
| `jade` | Success, and active or on states |
| `danger` | Errors |
| `focus` | The keyboard focus outline |
| `inverse`, `on-inverse` | Tooltips |
| `toggle-thumb` | The toggle switch thumb |

## 4. Colour roles and rules

- **Gold** marks primary actions, selection and focus. **Jade** marks success and active or on states. **Red** (`danger`) marks errors.
- Never communicate status through colour alone. Pair it with text, an icon, a position, or the relevant state attribute (`aria-invalid`, `aria-current`, `aria-checked`, `disabled` or `aria-disabled`).
- **Gold fills always have a 1 px `accent-fg` border**, in both themes. In the light theme, gold against the surface is only about 2:1, so the border keeps gold controls distinguishable. Use dark `on-accent` text on gold, never white.
- Use `line-strong` for any boundary that identifies a control. `line` is for decoration.
- Disabled controls use `fg-disabled`. WCAG exempts inactive components from contrast requirements, so the disabled state must also be exposed through `disabled` or `aria-disabled`.

## 5. Contrast

The baseline is WCAG 2.2 AA: at least 4.5:1 for text, 3:1 for large text, and 3:1 for user interface boundaries, state indicators and focus indicators (non-text contrast).

Ratios for the main pairs, calculated from the values in `src/index.css` (light / dark):

| Pair | Kind | Light | Dark |
|---|---|---|---|
| `fg` on `canvas`, `surface`, `surface-raised` | Text | 15.38–17.31 | 11.33–14.09 |
| `fg` on `surface-hover`, `surface-active` | Text | 12.98–14.59 | 8.66–10.18 |
| `fg-muted` on `surface`, `canvas`, `surface-raised` | Text | 8.14–9.17 | 7.46–9.27 |
| `fg-subtle` (placeholder) on `well`, `surface`, `surface-raised` | Text | 5.88–6.02 | 5.38–6.95 |
| `accent-fg` on `surface`, `canvas` | Text | 5.72–6.29 | 9.83–10.72 |
| `on-accent` on `accent`, `accent-hover`, `accent-active` | Text | 6.08–8.23 | 7.09–10.72 |
| `fg` on `accent-subtle` | Text | 14.66 | 9.50 |
| `jade` on `surface` | Text | 5.19 | 6.58 |
| `danger` on `surface`, `well`, `surface-raised` | Text | 6.38–6.54 | 6.55–8.46 |
| `on-inverse` on `inverse` | Text | 13.51 | 14.09 |
| `line-strong` against `surface`, `well`, `canvas`, `surface-raised` | Non-text | 3.75–4.22 | 4.30–5.56 |
| `line-strong` against `surface-hover`, `surface-active` (hovered and pressed controls) | Non-text | 3.17–3.56 | 3.29–3.87 |
| `accent-fg` border against `surface`, `surface-raised` | Non-text | 6.29–6.44 | 8.62–9.83 |
| `jade` toggle track against `surface` | Non-text | 5.19 | 6.58 |
| `toggle-thumb` against `jade` and `line-strong` tracks | Non-text | 4.22–5.32 | 5.35–7.17 |
| `focus` against `canvas`, `surface`, `surface-raised`, `well` | Non-text | 5.72–6.44 | 8.62–11.13 |
| `accent` fill against `surface` | Non-text | **2.05** (hence the border rule) | 8.12 |

`e2e/design-foundation.e2e.ts` re-checks a deliberate set of contrast-critical pairs from the browser's computed values in both themes. When a token changes, update the values in `src/index.css`, run that test, and update this table.

## 6. Focus

All interactive controls must use the shared `focus-ring` utility instead of their own focus styles. This is a required convention: it is defined in PR 1, and PR 2 applies it to the existing components, which until then keep their earlier focus styles. On `:focus-visible` it draws a 2 px outline in `focus`, 2 px away from the control. Because of the offset, the outline sits on the surrounding surface, so it stays visible even around a gold button, where gold on gold would not. Outlines, unlike `box-shadow` rings, remain visible in forced-colours (high contrast) mode.

Do not remove the outline (`outline-none`) without replacing it with `focus-ring`.

## 7. Shape, elevation and spacing

- **Radius:** controls `rounded-md`, cards and popovers `rounded-lg`, pills and round buttons `rounded-full`. There is no zero-radius rule.
- **Shadows:** `shadow-sm` on cards in the light theme only, `shadow-lg` on popovers and floating menus.
- **Spacing:** Tailwind's default spacing scale. There are no custom spacing tokens.

## 8. Motion

When the user prefers reduced motion, a global rule in `src/index.css` shortens all animations and transitions to 0.01 ms. They still reach their end state and fire their end events, so behaviour that waits for them keeps working. New animations need no extra handling, but must not rely on motion to convey information.

Toast notifications are covered by the same rule: their entrance animation is set inline by react-hot-toast, and the rule shortens it too (tested in `e2e/design-foundation.e2e.ts`). Separately, react-hot-toast's source switches to a fade without movement when reduced motion is preferred, but keeps its own duration; that library behaviour is not tested here.

## 9. Native controls, widgets and approved decisions

`color-scheme` is `light` on `:root` and `dark` on `:root.dark`. The theme class is set before the first paint (`index.html`), so native scrollbars, selects and spinners follow the active theme from the first paint.

Approved for PR 2, which applies the tokens to existing components:

- The date picker, toast notifications and colour-picker popover are themed through the tokens, without new dependencies.
- The logo and favicon keep their geometry and identity, recoloured to a gold disc with dark marks and a contrasting `accent-fg` ring.
- The main heading uses `fg` and the heading font. The "Stack" part of the wordmark uses `accent-fg`.
- The `ms-*` brand tokens are removed once no component uses them.

## 10. Typography

- **Interface text and numbers:** system fonts (Tailwind's `font-sans`), with `tabular-nums` where digits must line up.
- **Headings:** `font-heading` (Playfair Display, falling back to Georgia and other serifs), applied only to the main heading and section headings, at weight 600. In PR 1 no element uses it yet; PR 2 applies it.

### Heading font licence and provenance

- **Font:** Playfair Display, the unmodified official variable font `PlayfairDisplay[wght].ttf` (weights 400–900), served as TTF from `public/fonts/playfair-display/`.
- **Licence:** SIL Open Font License 1.1, Copyright 2017 The Playfair Display Project Authors, with the Reserved Font Name "Playfair Display". `OFL.txt` and `FONTLOG.txt` are distributed next to the font, unmodified.
- **Source:** the [google/fonts](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/playfairdisplay) repository, directory `ofl/playfairdisplay`, at commit `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`. Its `METADATA.pb` builds the font from the designer's repository [clauseggers/Playfair](https://github.com/clauseggers/Playfair) at commit `80a334101928546b04fa9e709ad4b2f11f8a9e10`.

| File | Bytes | Git blob (matches the source commit) | SHA-256 |
|---|---|---|---|
| `PlayfairDisplay[wght].ttf` | 300,724 | `7a09eb71f10622fd083134ac9ed46f59b21bee18` | `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6` |
| `OFL.txt` | 4,449 | `13153890847ba9bde8a852596d1515261156e474` | `566be814f8e96e93dfa16101331557eb6b5467e9e03f627c0910fe93ca12300e` |
| `FONTLOG.txt` | 3,005 | `af2786edb7454da990e7f6e07a19143b95653d1c` | `5bdf831796b209470b531bba8de75c7db8c2c28b473b350d6e0c1195f3d8f86e` |

To verify a copy, `git hash-object <file>` must print the blob hash above.

Do not subset, convert (including to WOFF2), rename or otherwise modify the font file, and do not load it from a CDN. Under the OFL, subsetting and format changes create a Modified Version, which may not use the Reserved Font Name without written permission from the copyright holder (OFL condition 3; [OFL FAQ](https://openfontlicense.org/ofl-faq/) 2.2, 2.6–2.8, 5.3).

## 11. Colour rule and exceptions

UI colours (backgrounds, text, borders, outlines and rings, `accent-color`, placeholders) use the semantic tokens. Raw Tailwind palette colours, the `ms-*` brand tokens and hex values are allowed only for these documented exceptions:

1. **Exported artwork and its defaults:** the numeral renderer, glyph and SVG components, the `.mep-svg` rule, and the default background and glyph colours in `DisplaySettingsContext`. These belong to the exported SVG and PNG, not to the interface theme.
2. **Colours the user chooses:** the colour-picker swatch's inline colour, and the black or white text that `utils/colors.ts` picks for it.
3. **Static files that cannot read CSS variables:** `favicon.svg`.
4. **CSS keywords:** `transparent`, `currentColor` and `inherit`.
5. **Test files.**

After PR 2, these commands must list only the exceptions above:

```sh
git grep -nE '\b(bg|text|border|ring|ring-offset|outline|fill|stroke|accent|placeholder|divide|shadow|decoration|caret)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}|ms-[a-z-]+)' -- 'src/*.tsx' 'src/*.ts' ':!*.test.*'
git grep -nE '#[0-9a-fA-F]{3,8}\b' -- 'src/*.tsx' 'src/*.ts' 'src/*.css' index.html favicon.svg ':!*.test.*' ':!src/index.css'
```
