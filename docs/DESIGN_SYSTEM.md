# MayaStack Design System

This document describes MayaStack's visual foundation: semantic colour tokens, contrast rules, focus and motion conventions, typography, and the heading font's licence and provenance. It belongs to Stage 1 of [the redesign roadmap](plans/ui-redesign-roadmap.md).

## 1. Status

| Part | Status |
|---|---|
| Tokens, `color-scheme`, focus utility, reduced motion, heading font | Implemented (Stage 1: UI-02, PR #14) |
| Existing components use the tokens | Implemented (Stage 1: UI-03) |
| Material selector, Custom Material dialog, material contrast rules, settings-panel header (UI-15) | Approved design (revised 2026-11-18), not implemented. Sections 4, 5, 6 and 9 mark these parts; the current application still has the two colour pickers, with alpha, and the white and black default |

The existing components, the third-party widgets (date picker, toasts, colour picker) and the brand mark use the tokens and the shared focus ring. The earlier Tailwind colours and the `ms-*` brand tokens have been removed. Section 9 records the decisions that were applied.

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
| `inverse`, `on-inverse` | Tooltips (react-tooltip, as in the base-20 breakdown's multipliers and compact subtotals) |
| `toggle-thumb` | The toggle switch thumb |

## 4. Colour roles and rules

- **Gold** marks primary actions, selection and focus. **Jade** marks success and active or on states. **Red** (`danger`) marks errors.
- Never communicate status through colour alone. Pair it with text, an icon, a position, or the relevant state attribute (`aria-invalid`, `aria-current`, `aria-checked`, `disabled` or `aria-disabled`).
- **Gold fills always have a 1 px `accent-fg` border**, in both themes. In the light theme, gold against the surface is only about 2:1, so the border keeps gold controls distinguishable. Use dark `on-accent` text on gold, never white.
- Use `line-strong` for any boundary that identifies a control. `line` is for decoration.
- Disabled controls use `fg-disabled`. WCAG exempts inactive components from contrast requirements, so the disabled state must also be exposed through `disabled` or `aria-disabled`.

**Viewer aids (since UI-13 and UI-10).** These screen-only elements use theme tokens, not the numeral's glyph colour:

| Element | Colour roles |
|---|---|
| Glyph key (under the stage) | Glyphs `accent-fg`, one colour for all three; labels `fg-muted`, on the card's `surface` |
| Tier annotations, start gutter | Powers of 20 in `fg-subtle` |
| Tier annotations, end gutter (Number mode) | Base-20 digits and their brackets in `accent-fg` |
| Annotation gutters' background | The paper's colour as shown: the user's background composited over the theme's `canvas`, made opaque, so the gutters and the paper read as one sheet. `canvas` where no colour is given |

The annotation labels are therefore drawn over a colour the user chooses, not over a theme surface (section 5).

**Material colours (UI-15; approved design, not implemented).** A material is the pair of the numeral's background and glyph colours, which belong to the exported artwork, not to the interface theme (section 11, exceptions 1 and 2):

- **Opaque only:** preset and custom material colours are fully opaque, with no alpha or opacity control; translucent settings are not preserved. Colours stay saved in the existing JSON RGBA format under the existing keys, written with `a: 1`; the material model may use opaque RGB internally, converted at the persistence boundary, with no new storage format or migration.
- **Pair-level fallback:** the background and glyph colours are one pair. A complete, valid, opaque saved pair is kept. If one colour is saved and the other is missing, or either saved colour is invalid or translucent, the complete Limestone pair is used, never a saved colour mixed with a default, and a non-blocking, user-visible notice says that the saved material was unsupported and Limestone has been selected. Users with no saved colours receive Limestone without a notice. The current application still falls back per colour; the exact rules are in [the roadmap](plans/ui-redesign-roadmap.md) (UI-15).
- **Theme-independent:** one catalogue serves both themes. Changing the theme never changes the selected material, its colours or their saved values.
- **Presets:** Limestone (the default for users without saved colours), Dark Stela, Obsidian Basalt and Weathered Limestone; their colours and contrast are in section 5.
- **Tiles:** each preset is a compact rectangular tile split diagonally from lower left to upper right, drawn with CSS: the upper-left triangle in the material's glyph colour, the lower-right triangle in its background colour, inside a visible border. The selected tile has an accent ring and a check indicator, so selection does not rely on colour alone. The Custom tile is a separate button (section 9).

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

`e2e/design-foundation.e2e.ts` re-checks a deliberate set of contrast-critical pairs from the browser's computed values in both themes. It also measures the colours as applied to the components ("design system on the components"): element contrast, the gold controls' borders, focus rings and the themed widgets. When a token changes, update the values in `src/index.css`, run that test, and update this table.

**Tier annotation labels: contrast defect confirmed, correction planned.** The ratios above are between theme tokens. The annotation labels (`fg-subtle` and `accent-fg`, section 4) are drawn over the annotation gutters, whose background is the user's paper colour, not a theme surface, so the table does not cover them.

Measured in the browser on 2026-11-20, as the check brought forward from UI-14 (see [the roadmap](plans/ui-redesign-roadmap.md), UI-14's entry):

- **Method:** Chromium (Playwright) at 1280 × 800 on the production build. The labels' computed `color` was compared with their gutter's computed `background-color`. Five cases were cross-checked against painted pixels, which matched exactly.
- **Threshold:** the labels are 12 px normal text (10 px at 25%), so it is 4.5:1.

Ratios are given as power / digit; values below 4.5:1 are in bold:

| Paper (gutter) | Light theme | Dark theme |
|---|---|---|
| White `#FFFFFF` (the current default) | 6.02 / 6.44 | **2.78 / 1.74** |
| Limestone `#FAF8F5` | 5.68 / 6.08 | **2.62 / 1.64** |
| Weathered Limestone `#C7BC9F` | **3.19 / 3.41** | **1.47 / 1.09** |
| Dark Stela `#1D2026` | **2.71 / 2.53** | 5.87 / 9.40 |
| Obsidian Basalt `#090B0E` | **3.27 / 3.06** | 7.09 / 11.35 |
| Black `#000000` | **3.49 / 3.26** | 7.56 / 12.10 |
| Mid grey `#777777` | **1.34 / 1.44** | **1.61 / 2.58** |

The defect exists today: the default white paper fails in the dark theme. It is not limited to combinations where the theme and the paper have opposite polarity, because Weathered Limestone also fails in the light theme. No single theme-token colour can pass on every paper.

A separate correction was approved on 2026-11-21. It derives the label colours from the gutter's shown colour, independently of the theme, so that both labels reach at least 4.5:1 on every opaque background. It is not part of UI-15. **It is not implemented yet: the label colours above are unchanged.** Not measured: other browsers, forced-colours mode, and translucent backgrounds.

**Material contrast (UI-15; approved design, not implemented).** These rules cover the contrast between a material's background and glyph colours only, not the interface, and make no claim of whole-application WCAG conformance:

- **Presets** target at least 7:1. Calculated from their colours (WCAG 2.x formula):

  | Preset | Background | Glyph | Contrast |
  |---|---|---|---|
  | Limestone (default) | `#FAF8F5` | `#14171D` | 16.93:1 |
  | Dark Stela | `#1D2026` | `#F2CA50` | 10.37:1 |
  | Obsidian Basalt | `#090B0E` | `#E8DFD1` | 14.92:1 |
  | Weathered Limestone | `#C7BC9F` | `#101319` | 9.85:1 |

- **Custom materials** need at least 3:1. Apply does not proceed while the unrounded ratio is below 3:1; there is no separate 4.5:1 advisory tier.
- Neither colour is ever adjusted automatically to make a pair pass.
- The ratio is shown truncated to two decimal places, never rounded up, so a pair just below 3:1 never reads as 3.00:1.
- A failing ratio is explained in visible text, not by colour alone. Changes between pass and fail are announced to assistive technology; individual ratio updates while a colour is dragged are not.

## 6. Focus

All interactive controls must use the shared `focus-ring` utility instead of their own focus styles. This is a required convention, and the application's own controls follow it. Of the third-party elements that cannot take the class, only the date picker's days and its clear button get the same outline, from `src/components/inputs/DateInput.css`. On `:focus-visible` it draws a 2 px outline in `focus`, 2 px away from the control. Because of the offset, the outline sits on the surrounding surface, so it stays visible even around a gold button, where gold on gold would not. Outlines, unlike `box-shadow` rings, remain visible in forced-colours (high contrast) mode.

Text fields with a `well` fill and a 1 px boundary (the number and date inputs) use `focus-ring-inset` instead: the same outline with a -2 px offset, drawn over the field's own boundary, so it adds nothing around the field. It lies between the card and the field's fill, and `focus` meets 3:1 against both (the `focus` row in section 5). Buttons keep `focus-ring`: on a gold fill an inset ring would be gold on gold, and on a colour swatch it would sit on the user's colour.

The render-mode selector (`RenderModeSelector.tsx`) draws the same outer outline on the focused segment's label (`has-focus-visible:outline-2 outline-offset-2 outline-focus`), because its radio is only the small dot inside it. The radio suppresses its own outline (`focus:outline-none`), so there is one indicator, not two.

Do not remove the outline (`outline-none`) without replacing it with `focus-ring`.

**Material controls (UI-15; approved design, not implemented):** the preset tiles and the Custom tile use `focus-ring`, separate from the selected state's accent ring and check. In the Custom Material dialog, react-colorful's sliders get a visible focus indicator in the `focus` token, replacing the limitation below once implemented; each picker, the hex input and the groups of controls have visible, programmatically associated labels.

Two library limitations remain. The colour picker's sliders keep react-colorful's own focus cue (an enlarged pointer). react-datepicker renders its clear button with `tabIndex={-1}`, so it is not in the Tab order and shows the ring only when focused another way. The date picker's month and year selects and its previous and next month buttons keep their existing library or browser focus styles; their focus appearance has not been verified separately.

## 7. Shape, elevation and spacing

- **Radius:** buttons and form fields `rounded` (4 px, since UI-06), cards and popovers `rounded-lg`, pills and round buttons `rounded-full`. A segmented control's track is `rounded-md`, so its corners stay concentric with the `rounded` segments 2 px inside it. There is no zero-radius rule.
- **Shadows:** `shadow-sm` on cards in the light theme only, `shadow-lg` on popovers and floating menus, and `shadow-inner` on inset panels within a card, with a `canvas` fill and a `line` border (the base-20 card's Positional Sum Formula panel, since UI-07, and the numeral viewer's stage, `rounded-md`, since UI-13).
- **Numeral slab (since UI-13):** the numeral in the viewer's stage sits on a screen-only paper (`data-numeral-paper`), an HTML element between the stage content and the numeral image, never part of the SVG. The paper owns the slab's surface: the numeral's background colour (the user's chosen background, alpha included), a fixed 12 px interior padding on all four sides (`p-3`), and the edge and shadow, `ring-1 ring-line` and `shadow-sm`, in both themes. The edge, in the theme's `line`, carries the slab in the dark theme, where the shadow barely shows against `canvas`. The paper paints the background once, across its padding and behind the numeral: on screen, a rule in `src/index.css` makes the SVG's own background rectangle transparent inside the paper, so there is no seam where the padding meets the numeral and a translucent background is never composited twice. The numeral image inside it stays the content and interaction layer: the numeral's image role and name, its zoomed width, the scroll anchoring's reference box, and the positioning context of the Place Tier Guides and Dividing Hairlines, which span their group's width and never extend into the padding. The padding is viewer presentation only: it does not zoom, and the exported SVG and PNG are the SVG alone, with its own background rectangle and geometry unchanged, without the padding, edge or shadow.
- **Viewer DOM vocabulary (since UI-13):** the viewer's layers, outermost first, and the `data-*` attribute marking each, for development, browser inspection and tests. The attributes carry no styling of their own apart from the paper's rule above.
  - **Viewer card** (`data-viewer-card`): the workspace card holding the viewer, in `HomeView`. On desktop screens at least 64rem wide and 40rem tall (the `sticky-viewer` variant in `src/index.css`, since UI-13), it sticks 1rem below the top of the screen while the page scrolls, within its grid area, so it never covers the footer; elsewhere it stays in the flow.
  - **Stage** (`data-numeral-stage`): the scrollable viewport, the only scroll container: the focusable `role="group"` named "Numeral viewer", in `canvas`. It is also marked `data-numeral-backdrop`, the colour the guide colours assume behind a translucent background.
  - **Stage content** (`data-numeral-stage-content`): the stage's inner padded layout container, at least as large as the stage and as large as the paper and its padding; not a scroll container.
  - **Group** (`data-numeral-group`): the stage content's only item, a flex row centred by automatic margins while it fits: the start annotation gutter, the paper and the end annotation gutter, the gutters present only while tier annotations are on.
  - **Annotation gutters** (`data-numeral-annotations="start"` and `"end"`, since UI-10): the screen-only gutters beside the paper, `aria-hidden`, letting the pointer through. Each holds a label box (`data-numeral-annotations-box`) as tall as the numeral image at the current zoom, which holds the annotation layer (`data-tier-annotations="power"` at the start, `"digit"` at the end): one row per tier (`data-tier-annotation`, with `data-exponent`), and, for digits, the bracket elements (`data-tier-annotation-bracket`).
  - **Paper** (`data-numeral-paper`): the visible surface surrounding the numeral image, with its background, 12 px padding, edge and shadow. While annotations are on it is also marked `data-numeral-gutter-bleed`, with the gutters' colour in the `--numeral-gutter-bleed` custom property (below).
  - **Numeral image** (`data-numeral-image`): the zoom wrapper, with `role="img"` and the numeral's dynamic accessible label. It holds the tier-guide underlay (`data-numeral-underlay`, with `data-place-tier-guides`), the SVG artwork and the hairline overlay (`data-tier-hairlines`); both guide layers are `aria-hidden`.
  - **SVG artwork:** selected by its existing class, `svg.mep-svg`. It is deliberately given no data attribute (nor any ARIA): its markup is also the source of the SVG and PNG exports.
  - **Tier cells:** the logical geometry of the numeral, each tier's 80-unit cell in the SVG's coordinates; not DOM elements. The Place Tier Guides and Dividing Hairlines are positioned from them.
  - **Exportable grid:** the existing Show Grid setting, drawn inside the SVG and exported with it. It is distinct from the screen-only tier guides, which are never exported.
  - **Zoom state:** while a zoom animation runs, the stage carries `data-zooming` (section 8).
- **Annotation gutters (since UI-10):** when "Show Tier Annotations" is on, each gutter is 48 px wide (`w-12`), opaque, and sticks to its edge of the stage (`left-0` or `right-0`, above the numeral), so the numeral scrolls under it when the stage scrolls sideways. Each gutter's label box mirrors the numeral image: the same vertical padding as the paper, and the image's height at the current zoom, so each row lines up with its tier. The gutters are shown only where the stage is at least 31rem wide (a container query on the stage, which is a container only while annotations are on); below that they are `display: none`. While they are shown, the stage content and the paper drop their horizontal padding (`@min-[31rem]:px-0`; vertical padding is kept), so the gutters sit flush with the stage's edges and with the paper at every scroll position. At 100% zoom the numeral and its gutters need 446 px (350 + 2 × 48). Where the paper's edge meets a gutter, the paper paints two horizontal offset shadows of the gutters' colour, 8 px to each side, hidden under the opaque gutters (a container-query rule in `src/index.css`, composed before Tailwind's ring and `shadow-sm`, which are kept). This stops the antialiased edge from showing a dark seam at fractional device-pixel positions. In Date mode the end gutter is laid out but empty, so the paper stays centred. The gutters are outside the SVG and never exported.
- **Spacing:** Tailwind's default spacing scale. There are no custom spacing tokens.

## 8. Motion

When the user prefers reduced motion, a global rule in `src/index.css` shortens all animations and transitions to 0.01 ms. They still reach their end state and fire their end events, so behaviour that waits for them keeps working. New CSS animations and transitions need no extra handling, but must not rely on motion to convey information. Animations started from script with the Web Animations API (`Element.animate`) are not covered by the rule: they must check `prefers-reduced-motion` themselves. Known side effect: since `transition-property` defaults to `all`, the rule gives every element a 0.01 ms transition for any property that changes, layout properties set from script included, which otherwise have no transition at all. Until the next frame, such an element keeps its previous value: a measurement made in the same frame as the change (e.g. in a React layout effect) reads the old layout. An element whose layout is measured that way must opt out with `transition-property: none` under the same media query, in a rule after the global one in `src/index.css`. The viewer's elements that do so are the zoom wrapper (`[data-numeral-image]`), the annotation gutters' label box (`[data-numeral-annotations-box]`, whose height sets the centred group's), and the stage content and paper (`[data-numeral-stage-content]`, `[data-numeral-paper]`, whose horizontal padding changes when the gutters are shown or hidden). The global rule itself is unchanged, and every other element keeps its transitions.

**Viewer zoom (since UI-13, slice 6):** a zoom step eases the viewer's paper (`data-numeral-paper`) from where the numeral was drawn to its new layout, over 200 ms with `cubic-bezier(0.4, 0, 0.2, 1)`: a gentle start and a long deceleration, with no overshoot (adjusted from 160 ms with `cubic-bezier(0.2, 0, 0, 1)`, which made about half of the change in the first two frames). Only a transform animates, through the Web Animations API: the numeral's width, the scroll position that keeps the viewed point in place, the scrollable area and the zoom percentage are final at once, and nothing is left on the paper afterwards. The scale is uniform, so the paper's padding and edge scale with the numeral for the animation only. Reset, a new numeral, a change of mode and the first render are never animated. When reduced motion is preferred, read at each zoom, there is no animation and no transform: the zoom is instant, as before, and the zoom wrapper has no transition, so its width is final at once (above). The constants and the transform's calculation are in `src/utils/zoomAnimation.ts`.

**Annotation gutters during a zoom (since UI-10):** the gutters take their final size and place in the layout at once, like the numeral, but are drawn moving with the paper: each gets its own Web Animations transform with the same timing, from where it was drawn before the zoom to its final place sideways, and vertically on the paper's drawn top and bottom. Their opaque background therefore never clears or changes colour during the zoom. While the stage carries `data-zooming`, the labels are hidden (`visibility: hidden` and opacity 0), since the vertical scale would stretch them. When the animation ends or is cancelled, they reappear and their opacity fades back in over 150 ms. The fade is `motion-safe:` only; with reduced motion there is no zoom animation and the labels reappear at once. At 25% the labels are 10 px instead of 12 px (`text-xs`), since a tier's row is then 20 px tall. Showing or hiding the annotations keeps the viewed point in place.

**Zoom controls are click-only:** Zoom in and Zoom out change one level for each activation, through the button's own click (a mouse click, a tap, Enter or Space, or assistive technology), with no handler of their own on the pointer. Nothing happens on `pointerdown`, and holding a button, or dragging or scrolling from it, does not zoom or repeat. The `+` and `-` shortcuts, with the viewer focused, step one level per key press: the key repeating while it is held (`KeyboardEvent.repeat`) is ignored, so holding it does not run through the levels, and a new press steps again. Every step, by button or key, animates the same way (200 ms, as above); Reset and the `0` key are instant.

Toast notifications are covered by the same rule: their entrance animation is set inline by react-hot-toast, and the rule shortens it too (tested in `e2e/design-foundation.e2e.ts`). Separately, react-hot-toast's source switches to a fade without movement when reduced motion is preferred, but keeps its own duration; that library behaviour is not tested here.

## 9. Native controls, widgets and approved decisions

`color-scheme` is `light` on `:root` and `dark` on `:root.dark`. The theme class is set before the first paint (`index.html`), so native scrollbars, selects and spinners follow the active theme from the first paint.

Capped scrolling boxes inside a card (since UI-07, the base-20 card's formula and analytical breakdown; since UI-13, the numeral viewer's stage) add the `scrollbar-themed` utility: a `line-strong` thumb, at least 3:1 against the surfaces it sits on (section 5), on a transparent track. Browsers without `scrollbar-color` keep their native scrollbar. Touch devices with overlay scrollbars still show the scrollbar only while scrolling.

The floating Export trigger covers a band at the bottom of the viewport. `:root` has a `scroll-padding-bottom` of that band's height (4.5rem, from `sm` 7rem), so a control that receives keyboard focus, or is scrolled into view, is placed above the trigger instead of under it (WCAG 2.2, 2.4.11 Focus Not Obscured). It does not change the layout. From `sm`, `main` also has 3.25rem of extra bottom padding (`sm:pb-13`), so the end of the page scrolls at least 120px up, clear of the trigger's 104px band with a gap; below `sm`, the last card's `mb-20` does the same. Content can still pass under the trigger while the page scrolls.

Applied to the existing components (UI-03):

- The date picker (`DateInput.css`), toast notifications (the `<Toaster>` options in `App.tsx`) and colour-picker popover are themed through the tokens, without new dependencies. react-colorful draws its picker areas and pointers white, so `ColorPicker.css` gives them a `line-strong` edge to keep them visible on the popover's surface.
- The logo and favicon keep their geometry and identity, recoloured to a gold disc with dark marks and a contrasting `accent-fg` ring, drawn inside the original radius. The favicon uses the light theme's values, because a static file cannot read the tokens (section 11, exception 3).
- The main heading uses `fg` and the heading font. The "Stack" part of the wordmark uses `accent-fg`.
- The `ms-*` brand tokens have been removed.

**Panel headers.** The viewer and base-20 cards currently begin with an icon-and-title header: an `h2` in the heading font (`font-heading text-lg font-semibold`, `flex items-center gap-2`) holding a 20 px icon in `accent-fg`, hidden from assistive technology, followed by the title, as in the viewer's "Mayan Numeral Stack" (`Layers`) and the base-20 card's "Base-20 Representation" (`Functions`), both in `HomeView.tsx`. *Approved for UI-15, not implemented:* the settings panel follows the same pattern, beginning with a header that holds the tune/settings icon and the title "Stela Material & Glyph Settings". Today that title is the panel's `<legend>`, without an icon; restructuring it into the header must keep the settings `fieldset`'s accessible name.

**Material selector and Custom Material dialog (UI-15; approved design, not implemented):**

- **Selector:** the four presets (section 4) form a native radio group; arrow keys move between them. Custom is a separate button tile, not a radio, and arrow-key navigation never triggers it. When the current pair matches no preset, no radio is checked and the Custom tile shows that the current selection is Custom.
- **Dialog:** a native `<dialog>`, opened modally, centred on desktop and a bottom sheet below `sm`. Closing it returns focus to the Custom tile. Escape behaves as Cancel.
- **Draft state:** the dialog edits a draft. The applied viewer does not change while the draft is edited; Cancel discards every draft change, and Apply is the only action that updates the selected background and glyph pair, and only when the pair meets the custom minimum (section 5).
- **Contents:** a labelled background colour picker and a labelled glyph colour picker (react-colorful, opaque only), a labelled hex input for exact entry, a live preview of the draft, the contrast ratio with its pass or fail explanation, and Apply and Cancel. Invalid hex input leaves the draft colour unchanged and shows a visible validation error; it is never silently coerced.
- **Hex input:** the field keeps invalid text while the user edits, never strips or coerces characters into a different valid colour, and changes the draft colour only once a complete, valid hex value is entered. react-colorful's `HexColorInput` strips non-hex characters and resets invalid text on blur, so it must not be assumed suitable; the component is chosen in implementation (S5).
- **Preview:** the existing renderer with the draft colours, at 100% scale, in a capped, scrollable area. It is not the export source (it does not receive the viewer's `exportRef`) and has no grid, even while the main viewer's Show Grid is on; how the renderer suppresses it (for example an optional grid-visibility prop) is defined in S4, and the preview never changes the main viewer's grid setting. The exported SVG's IDs and markup are unchanged, and no unique grid-pattern IDs are introduced.

## 10. Typography

- **Interface text and numbers:** system fonts (Tailwind's `font-sans`), with `tabular-nums` where digits must line up.
- **Headings:** `font-heading` (Playfair Display, falling back to Georgia and other serifs), applied only to the main heading and section headings, at weight 600: the main heading and the "Base-20 Representation" and "Mayan Numeral" headings (`HEADING_FONT_ELEMENTS` in `e2e/design-foundation.e2e.ts` lists them). Form legends and the wordmark use the system font. Playfair Display's default figures are old-style, so digits in headings, such as the "20" in "Base-20", do not align with the capitals.

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

UI colours (backgrounds, text, borders, outlines and rings, `accent-color`, placeholders) use the semantic tokens. Raw Tailwind palette colours and hex values are allowed only for these documented exceptions:

1. **Exported artwork and its defaults:** the numeral renderer, glyph and SVG components, the `.mep-svg` rule, and the default background and glyph colours in `DisplaySettingsContext`. *Approved for UI-15, not implemented:* the material preset catalogue, wherever it is defined; its values are the approved material colours of the exported SVG and PNG (section 5). These belong to the exported SVG and PNG, not to the interface theme.
2. **Colours the user chooses:** the colour-picker swatch's inline colour, and the black or white text that `utils/colors.ts` picks for it. *Approved for UI-15, not implemented:* the material tiles' inline background and glyph colours, and the Custom Material dialog's draft colours and preview colours.
3. **Static files that cannot read CSS variables:** `favicon.svg`.
4. **CSS keywords:** `transparent`, `currentColor` and `inherit`.
5. **Test files.**

These commands must list only the exceptions above. The first lists nothing. It also matches `ms-*` classes, so the retired brand tokens cannot return unnoticed:

```sh
git grep -nE '\b(bg|text|border|ring|ring-offset|outline|fill|stroke|accent|placeholder|divide|shadow|decoration|caret)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}|ms-[a-z-]+)' -- 'src/*.tsx' 'src/*.ts' ':!*.test.*'
git grep -nE '#[0-9a-fA-F]{3,8}\b' -- 'src/*.tsx' 'src/*.ts' 'src/*.css' index.html favicon.svg ':!*.test.*' ':!src/index.css'
```

Once UI-15 is implemented, the second command will also list the material preset catalogue's values, which exception 1 covers. Every other hex value it lists must still match one of the exceptions above.
