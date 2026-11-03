# MayaStack UI Redesign Roadmap

This document is the single source of truth for the agreed MayaStack UI redesign: its decisions, tasks, progress and next step. Sections A–F track the plan; section G keeps the approved requirements, unchanged, as the detailed reference for every task.

## A. Purpose and working rules

The goal is to evolve MayaStack into a modern, approachable, accessible and visually distinctive Mayan numeral converter, while preserving the correctness and reliability of its existing functionality.

This roadmap does not authorize implementation of every listed task. Each task requires a separate, explicitly requested piece of work, following `CLAUDE.md` and the workflow in section G §11.

### Working rules

- Verify this roadmap against the current repository state at the beginning of every redesign task.
- Preserve agreed decisions unless they are explicitly revised.
- Do not infer approval from a suggestion or an old conversation summary.
- Do not silently expand the scope.
- Do not mark work complete until its acceptance criteria and required validation have been verified.
- Record deviations, blockers and changes to the plan in the plan-change log (section E).
- Keep completed tasks in this document as a concise historical record.
- When this roadmap and the repository disagree, investigate and correct the status rather than trusting either source blindly.

### Maintenance protocol

**At the beginning of a redesign task:**

1. Read this roadmap.
2. Check the current branch, working tree and recent Git history, without disturbing existing work.
3. Verify the selected task's status against the actual code and tests.
4. Identify its scope, acceptance criteria and dependencies.
5. Summarize the task and the intended changes, and get approval before implementing when approval is needed.

**Before implementation:** confirm the task to be worked on and follow the existing review and approval workflow. Do not implement deferred or proposed ideas, or broaden the scope, without permission. Ask when the task or its acceptance criteria are ambiguous.

**After implementation and validation:**

- Update the task's status and record the actual validation results.
- Mark a task `completed` only when its acceptance criteria are met and the required checks have passed.
- If the work is partial, leave it `in progress` and list what remains. If it cannot proceed, mark it `blocked` with the reason. If it is deferred or the plan changes, record the decision and its rationale.
- Add commit and PR references only when they exist and have been verified. Never record tests, merges or completed work that did not happen.

**At the end of a phase:** review its acceptance criteria, verify the relevant tests and implementation, update the statuses, identify the next recommended task, and summarize what changed and what remains.

**Scope of maintenance:** update this roadmap for work that is part of the UI redesign, or for changes that materially affect its decisions, dependencies or progress. Unrelated bug fixes and infrastructure work do not belong here.

### Branches and pull requests

By default, each task has its own branch and pull request. Closely related tasks may share one branch and one pull request as an exception, only with the user's approval, and each such grouping is recorded in the plan-change log (section E). The approved exceptions so far:

| Group | Tasks | Reason |
|---|---|---|
| Input controls | UI-05, UI-06 | Same phase; UI-06 depends on UI-05 and changes the same number input |
| Preferences and tier guides | UI-08, UI-09 | Same phase; UI-09 is the first feature to use the UI-08 persistence mechanism (G §4.7). Separated on 2026-10-31: UI-08 was merged alone in PR #23, and UI-09 continues on its own branch, `feat/ui-09-tier-guides` (plan-change log) |
| Viewer refinement and annotations | UI-13, UI-10 | One combined phase (2026-10-31). UI-13's viewer and zoom refinement comes first, so that UI-10's annotations are built on the refined viewer instead of being reworked for new positioning, scaling, interactions, responsive behaviour and accessibility. UI-13's slices 1–4 were merged on 2026-11-01 in PR #25 from the shared branch `feat/ui-13-viewer-refinement`, which that pull request ended; UI-13's slice 4.1 followed on its own branch, `feat/ui-13-resize-anchoring`, merged in PR #26, and UI-10's branch is decided when it starts (plan-change log) |

When tasks share a branch:

- Each task keeps its own entry, status, acceptance criteria and evidence in section C. Grouping does not merge or change them.
- Tasks are implemented in dependency order. Each commit belongs to one task and names its ID.
- **Review checkpoint:** when a task's commits are complete and validated, stop for review (G §11, step 8), and start the next task only after approval.
- The pull request's description reports the scope and validation of each task separately.
- If a later task turns out larger or riskier than expected, open the pull request for the completed tasks and continue the rest on a new branch, recording the change in the plan-change log.

For every branch: record roadmap progress in the same branch, not in a separate pull request; add fixes from review as new commits; and after the merge, start further work on a new branch from the updated `main`.

**Incidental fixes:** a fix that the current task needs may be proposed for inclusion when it is small and directly related, even if it touches a neighbouring file. It stays separately identifiable, in its own commit with appropriate regression coverage, and is not included without approval when it expands the approved scope. Unrelated fixes are proposed separately (`CLAUDE.md` §4).

Task statuses are `not started`, `in progress`, `blocked`, `completed` and `deferred`. Task IDs are stable: they are never renumbered or reused, even when the order of work changes.

## B. Confirmed design decisions

Detailed requirements are in section G; the design system itself is documented in [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

- **Visual identity:** obsidian and warm parchment surfaces, ceremonial gold and selective jade accents, with light and dark themes designed intentionally rather than inverted (G §3.3).
- **Colour roles:** gold for primary actions, selection and focus; jade for success and active or on states; red for errors. Status is never communicated by colour alone. Gold fills always have a 1 px `accent-fg` border, in both themes, with dark text on gold.
- **Foundation:** semantic colour tokens in `src/index.css` (light values in `@theme static`, dark values under `.dark`), WCAG 2.2 AA contrast, a shared `focus-ring` utility (2 px outline, 2 px offset; on text fields `focus-ring-inset`, with a -2 px offset, since UI-06), a reduced-motion rule and `color-scheme` per theme. Details and contrast tables are in `docs/DESIGN_SYSTEM.md`.
- **Typography:** one display font, Playfair Display, for the main heading and section headings only: the unmodified official file, self-hosted with its OFL licence, never subset, converted or loaded from a CDN. Interface text and numbers use system fonts, with `tabular-nums` where digits must align.
- **Brand mark:** the logo and favicon keep their geometry and identity, recoloured to a gold disc with dark marks and a contrasting `accent-fg` ring. The main heading uses `fg`; "Stack" in the wordmark uses `accent-fg`.
- **Shape:** no zero-radius rule; buttons and form fields `rounded` (revised in UI-06 from `rounded-md`), cards and popovers `rounded-lg`, pills `rounded-full` (G §3.4, `docs/DESIGN_SYSTEM.md` §7).
- **Workspace:** a two-column workspace based on the first design-reference concept, without a permanent third panel (G §3.1–§3.2).
- **Product decisions:** Number mode starts at `0`; Zero sets it to `0` and Clear empties the field (revised in UI-06; G §4.1 had Clear reset to `0`); Random generates 1–10 significant digits (revised in UI-06; G §4.2 had 1–500); the input accepts up to 128 significant digits (reduced in UI-07 from the 500 of G §4; enough for a googol, 101 digits, and 2^256, 78 digits); quick steps +1, +5, +20 and +400, with decrement controls, the 8,000 preset and a custom increment deferred (revised in UI-06, see section D); Copy number; a significant-digit count; a compact breakdown with on-demand exact contributions and Copy Formula; the existing shell zero glyph is kept; display preferences, including colours, are remembered (G §4).
- **Number input:** follows the input card of the third design-reference concept (approved 2026-10-28, UI-06): an "Input Type" title with the Number/Date modes as a segmented control beside it, a full-width field with a visible "Decimal integer" label and the count beside it, Random, Copy and Clear inside the field, and a row of quick steps with Zero at its end. Its mockup wording and styling framework are not taken over, and the date picker is unchanged.
- **Viewer and export:** the exportable grid stays an independent setting; tier guides and annotations are screen-only and never exported; export output does not depend on zoom, scroll or theme; Export stays reachable when the result is off-screen (G §5–§6).
- **Viewer (UI-13, approved 2026-11-01):** follows the third design-reference concept's viewer within the existing 5/7 grid: a full-width stage in the `canvas` token, a centred slab (the numeral's SVG, with a screen-only edge and shadow) and a header with a compact zoom toolbar. 100% zoom is 1 CSS pixel per SVG unit at every viewport width; the eight zoom steps from 25% to 400% stay. Wheel, Ctrl + wheel, browser zoom and touch scrolling stay native. The renderer, glyph geometry and exported artwork are unchanged.
- **Domain:** the date mode is a component-wise numerical representation of a Gregorian date, not a Mayan calendar conversion. A Long Count mode is deferred (G §2, §10.1).

## C. Phases and tasks

| ID | Task | Phase | Status | Depends on | Old stage |
|---|---|---|---|---|---|
| UI-01 | Fix theme defects | 0 Theme defects | completed | none | 0 |
| UI-02 | Design-system foundation | 1 Design system | completed | UI-01 | 1 (PR 1) |
| UI-03 | Apply the foundation to existing components | 1 Design system | completed | UI-02 | 1 (PR 2) |
| UI-04 | Two-column workspace layout | 2 Workspace | completed | UI-03 | 2 |
| UI-05 | Initial value, Clear and significant-digit count | 3 Input controls | completed | UI-04 | 3 |
| UI-06 | Random, quick steps, Clear and Zero, and Copy number | 3 Input controls | completed | UI-05 | 3 |
| UI-07 | Base-20 breakdown and Copy Formula | 4 Breakdown | completed | UI-04 | 4 |
| UI-08 | Shared persistence for display preferences | 5 Preferences and viewer aids | completed | UI-03 | 6 (persistence) |
| UI-09 | Screen-only tier guides | 5 Preferences and viewer aids | completed | UI-04, UI-08 | 5 |
| UI-10 | Screen-only annotations (evaluate, then implement if suitable) | 8 Viewer refinement and annotations | not started | UI-09, UI-13 | 5 |
| UI-11 | Export controls in the redesigned workspace | 6 Export | not started | UI-04 | 6 (export) |
| UI-12 | Educational explanations | 7 Education | not started | UI-04 | 7 |
| UI-13 | Viewer interaction polish | 8 Viewer refinement and annotations | in progress | UI-04, UI-09 | 8 |
| UI-14 | Final responsive, accessibility, regression and visual validation | 9 Final validation | not started | UI-01–UI-13, UI-15 | 9 |
| UI-15 | Material presets and settings-panel refinement | 10 Material presets | not started | UI-08, UI-09, UI-10, UI-13 | none (new) |

By default, each task has its own branch and pull request. The approved exceptions, currently UI-05 with UI-06, UI-08 with UI-09 (separated after UI-08's merge), and UI-13 with UI-10 (whose shared branch ended with PR #25, which merged UI-13's slices 1–4), are listed in section A, "Branches and pull requests".

**Order of work (revised 2026-10-31):** UI-08, then UI-09, on their shared branch; then the combined phase 8, UI-13 followed by UI-10, on its shared branch; then UI-11 and UI-12; then UI-14. Phase numbers identify the original roadmap phases and are not execution-order numbers. The combined phase 8 is intentionally scheduled before phases 6 and 7; existing phase numbers and task IDs remain unchanged. Only the order of work and UI-10's dependency on UI-13 changed (plan-change log). UI-15, approved on 2026-11-01, comes after the combined phase 8 (UI-13 and UI-10); its place relative to UI-11 and UI-12 is not yet decided (plan-change log); the proposed sequence below places it after UI-11.

**Proposed sequence (2026-11-01):** the approved working direction after the UI-13 viewer investigation, not a record of completed work; each slice stays subject to review and adjustment (plan-change log):

1. Close and manually approve UI-13 slices 1–4. Done: merged in PR #25 on 2026-11-01.
2. UI-13 slice 4.1, resize anchoring. Done: merged in PR #26.
3. The separate UI-07 breakdown layout bugfix (UI-13's entry, "Prerequisite"). Done: merged in PR #27.
4. UI-13 slice 5a, the viewer header and toolbar. Implemented and validated on the branch `feat/ui-13-viewer-header-toolbar`; review, commit and pull request pending.
5. UI-13 slice 5b, the tier-direction indicator.
6. UI-13 slice 5c, the compact glyph key.
7. UI-13 slice 5d, hybrid stage sizing from `lg`.
8. UI-13 slice 5e, the conditional sticky viewer from `lg`.
9. UI-10, power annotations.
10. UI-11, including the Export trigger's overlap.
11. UI-15, material presets and settings refinement.
12. UI-14, final validation.

UI-12 is not placed in this sequence; its place, and UI-15's relative to it, stay to be decided. UI-13's optional slice 6, the zoom animation, is not placed either.

References to "Stage N" in section G correspond to the tasks in the "Old stage" column. Unless a task says otherwise, its validation is: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, `git diff --check`, and a visual review at 375, 768 and 1280 px in the light and dark themes. Export-related tasks also follow G §6 and §9.

### UI-01: Fix theme defects

- **Status:** completed.
- **Goal:** light and dark tokens were not scoped correctly, the theme selector's selected state used undefined classes, and the first paint could show the wrong theme.
- **Acceptance:** G §8, Stage 0.
- **Evidence:** PR #12 (commit `0c5a806`, merge `0c8517c`). Tests: `e2e/theme.e2e.ts`, `src/components/ThemeSelector.test.tsx`.

### UI-02: Design-system foundation

- **Status:** completed.
- **Goal:** a reusable foundation for the redesign, with no component changes.
- **Scope:** semantic colour tokens for both themes, `color-scheme`, the `focus-ring` utility, the reduced-motion rule, the self-hosted Playfair Display font with its licence and provenance, and `docs/DESIGN_SYSTEM.md`.
- **Acceptance:** G §8, Stage 1; the token, contrast, font and export-independence checks in `e2e/design-foundation.e2e.ts`.
- **Evidence:** PR #14 (commit `189033e`, merge `8162e67`).

### UI-03: Apply the foundation to existing components

- **Status:** completed. Its acceptance criteria were verified on 2026-10-26 on the branch `feat/ui-03-apply-design-system`, before it was committed.
- **Evidence:** PR #19 (commit `d295e5d`, merge `80971cd`).
- **Goal:** the existing interface adopts the design system, without changing layout, behaviour, labels or exported artwork.
- **Scope:**
  - Semantic tokens instead of raw colour classes in components, `index.html` body classes and `App.tsx`.
  - Gold primary controls with the `accent-fg` border; `focus-ring` on interactive controls.
  - Theme the date picker (`DateInput.css`, using the tokens), the toasts (`<Toaster>` options) and the colour-picker popover, without new dependencies.
  - Recolour the logo and favicon (see section B), and apply the heading font and colours to the main heading and section headings.
  - Remove the `ms-*` tokens once nothing uses them.
  - Out of scope: layout, labels, export artwork and its default colours, the first-paint script, and the proposals in section D.
- **Acceptance:**
  - UI colours use semantic tokens; only the exceptions documented in `docs/DESIGN_SYSTEM.md` §11 remain, as shown by its check commands.
  - Element-level contrast in both themes, measured in the browser: at least 4.5:1 for the number input's text and placeholder, the Export button label (default and hover), error text and muted labels; at least 3:1 for input boundaries against their card and for the toggle tracks and thumb.
  - Gold-filled controls have the `accent-fg` border, checked in their default, hover, pressed and focused states in both themes.
  - Keyboard focus shows the `focus-ring` outline on the number input, a radio button, a zoom button, the Export trigger and dialog controls, a theme option, the colour swatch and a date-picker day.
  - The date picker, toasts and colour-picker popover follow the active theme.
  - The heading font is used only by the main heading and section headings (`HEADING_FONT_ELEMENTS` in `e2e/design-foundation.e2e.ts` lists them).
  - The first-paint and storage-failure theme behaviour from UI-01 is unchanged.
  - SVG and PNG exports are unchanged: the export and artwork files are untouched, the existing export tests pass, and a one-off comparison against `main` (determinism shown first) finds identical SVG text and PNG pixels.
  - No layout, behaviour or label changes; no horizontal overflow at 375 px.
- **Relevant files:** `index.html`, `src/App.tsx`, `src/views/HomeView.tsx`, `src/components/` (theme selector, inputs, display settings, base-20 display, viewer, export panel and menu, logo), `src/components/inputs/DateInput.css`, `favicon.svg`, `src/index.css`.
- **Validation:** the standard checks; the colour-rule check commands; the export comparison; screenshots. `e2e/theme.e2e.ts` brand-colour assertions are updated deliberately to the accent tokens.
- **Validation results (2026-10-26):**
  - Colour rules (`docs/DESIGN_SYSTEM.md` §11): the class rule finds nothing; the hex rule finds only exceptions 1–3 (`SvgBackground`, `SvgGrid`, `colors.ts` and `favicon.svg`). No `ms-*` token remains.
  - Criteria 2–5 are covered by eight new tests in `e2e/design-foundation.e2e.ts` ("design system on the components", in both themes): element contrast, the gold controls' borders in default, hover, pressed and focused states, focus rings on the listed controls, and the themed date picker, toast and colour-picker popover. All eight fail against the `main` build, so they test the change.
  - The heading font: `HEADING_FONT_ELEMENTS` lists the main heading and the two section headings, and the test enters a number so the section headings exist.
  - First paint and blocked storage: the `e2e/theme.e2e.ts` tests pass. They now check the `--color-canvas` value each theme declares in the stylesheet, instead of the removed `--color-ms-brand-500`, and the selected theme option's `accent-fg` ring.
  - Exports: 19 SVG and PNG cases (numbers from 0 to 500 digits, a date, grid on and off, both themes, a custom size) were captured from `main` at `1481e77` twice to show they are repeatable, then compared with the branch. Every SVG is byte-identical and every PNG has the same size and decoded pixels. The export and artwork files are unchanged, and the existing export tests pass.
  - Layout: screenshots at 375, 768 and 1280 px in both themes, in five states (a result, the export dialog, the theme menu, the colour picker, the calendar): no horizontal overflow, and the page sizes match `main` in every state.
  - Standard checks: `npm test` 215 passed; `npm run test:e2e` 53 passed; `npm run lint` 0 errors (4 earlier warnings in `src/hooks/useElementOnScreen.ts`); `npm run build` passed; `git diff --check` clean.
  - Some full `npm test` runs during the work timed out in existing tests under load (the `scripts/git/sync-main.test.mjs` setup and the 500-digit view tests). The same tests also timed out on unchanged `main`, and reruns passed. This is not caused by UI-03 and is outside the redesign.
- **Implementation notes:** the gold buttons' padding is 1 px smaller, so with their new border they keep their original size. The toasts' edge is an inset outline, so they keep the library's size. `ColorPicker.css` gives the colour picker's areas and pointers a `line-strong` edge, because react-colorful draws them white. The date picker's days and clear button get the `focus-ring` outline from `DateInput.css`.
- **Known follow-ups, not part of UI-03:**
  - The date picker's clear button is not reachable with the keyboard: react-datepicker renders it with `tabIndex={-1}` (on `main` too). See section D.
  - At 375 px the fixed Export trigger covers the colour-picker popover's corner, and a toast can briefly cover the Export trigger and the dialog's Export button (on `main` too). This belongs to the Export trigger placement decided with UI-04 and UI-11.
  - The colour picker's sliders keep react-colorful's own focus cue (an enlarged pointer). See section D.
  - Playfair Display's old-style figures make the "20" in "Base-20 Representation" sit lower than the capitals. See section D.

### UI-04: Two-column workspace layout

- **Status:** completed. Its acceptance criteria were verified on 2026-10-27 on the branch `feat/ui-04-workspace-layout`, before it was committed.
- **Evidence:** PR #20 (commit `30edea2`, merge `8600117`).
- **Goal:** the approved responsive two-column workspace, with a prominent numeral viewer.
- **Scope and acceptance:** G §3.2 and §8, Stage 2. Export must stay reachable when the result is off-screen (G §6).
- **Approved layout (2026-10-27),** following the first design-reference concept:
  - From 1024 px: the input, base-20 representation and display settings cards on the left, in that order, in 5 of 12 columns; the viewer card on the right, in 7 of 12.
  - Below 1024 px: one column in the order input, viewer, base-20, settings, so the numeral follows the input directly.
  - The viewer keeps its 480 px maximum height and the meaning of 100% zoom; the numeral is not enlarged.
  - The floating Export trigger stays, with only the adjustments needed to avoid collisions. Moving Export into the viewer header is not part of UI-04 (see UI-11).
  - All four cards stay in place for empty, invalid and valid input. Without a valid result, the viewer and the base-20 card each show a short instruction instead of a result, and there are no viewer controls or Export (an initial value is UI-05).
  - The section headings become `h2`. The emoji in labels and the theme menu's Escape and arrow keys are deferred (section D).

### UI-05: Initial value, Clear and significant-digit count

- **Status:** completed. Approved at its review checkpoint on 2026-10-28, on the branch `feat/ui-05-06-input-controls`, which it shared with UI-06 (section A).
- **Evidence:** PR #21, shared with UI-06 (commit `5408013`, merge `95af270`).
- **Changed later by UI-06:** Clear now empties the field, and a separate Zero sets it to `0`. The count is above the field rather than below it and reads "N digits". The arrow-key hint is the field's title and a visually hidden description instead of visible text.
- **Scope and acceptance:** G §4.1 and §4.4, and the matching parts of §8, Stage 3. Tests that assume an initially empty input are updated deliberately (G §4.1).
- **Approved scope (2026-10-28),** after the UI-05 preflight:
  - Number mode starts at `0`, with the existing shell zero glyph, its base-20 representation and Export.
  - A secondary Clear button in the number input card sets the input to `0` from any text, stays enabled at `0` and keeps the focus.
  - A count for valid input only, such as "1 significant digit" or "500 significant digits" (128 at most since UI-07), without the limit; hidden for empty, invalid and over-limit input and in Date mode.
  - Leading zeros typed or pasted before a valid integer are removed in the field, keeping the caret or selection on the same digits, so typing 5 after the initial 0 gives 5. Invalid, over-long and whitespace-padded text is left as it is, with its message.
  - While the number input has focus, Up and Down add or subtract exactly 1 from a valid integer, with bigint arithmetic. The value stays as it is at 0 and at the 500-digit maximum (128 digits since UI-07), and empty or invalid text is not changed. Arrow keys with modifiers keep their usual effect. A visible hint and `aria-keyshortcuts` describe the keys.
  - The count and the hint are linked with `aria-describedby`, after the error message, without a new live region.
  - The zoom level is kept when the value changes, including through Clear and the arrow keys. Date mode, the date picker's clear button, the viewer, rendering and export are unchanged.
  - Not included: select-on-focus (section D) and the UI-06 controls.
- **Validation (2026-10-28, on the branch, before any commit):**
  - `npm test`: 16 files, 308 tests passed.
  - `npx tsc -b --noEmit`: no errors.
  - `npm run lint`: 0 errors and the 4 existing warnings.
  - `npm run build`: succeeded.
  - `npm run test:e2e`: 82 passed.
  - Negative controls:
    - Against a build of `main` (`8600117`), 12 of the 14 new or updated UI-05 browser tests failed as expected. The other two check preserved behaviour (clipboard shortcuts, Date mode).
    - With the caret restoration removed, three unit tests and the browser editing test failed.
  - Screenshots at 375, 768 and 1280 px in both themes, with no page overflow or console errors.
### UI-06: Random, quick steps, Clear and Zero, and Copy number

- **Status:** completed. Its acceptance criteria were verified on 2026-10-28 on the branch `feat/ui-05-06-input-controls`, which it shared with UI-05 (section A), and it was merged with UI-05 in PR #21.
- **Evidence:** PR #21, shared with UI-05 (commit `3e987b7`, merge `95af270`).
- **Scope and acceptance:** G §4.2, the parts of G §4.3 kept below, and the matching parts of §8, Stage 3, as revised on 2026-10-28 (plan-change log). The number input follows the third design-reference concept (section B).
- **Approved scope (2026-10-28):**
  - **Label:** the field's visible and accessible label is "Decimal integer". The significant-digit count moves beside it, still for valid input only.
  - **In the field:** icon buttons Random, Copy and Clear, named "Random number", "Copy number" and "Clear input".
  - **Clear** empties the field, from any text, including `0`. **Zero** sets it to `0`, from any text, including empty text. Both stay available and keep the focus. The initial value is still `0`.
  - **Quick steps** +1, +5, +20 and +400 add exactly their amount to a valid integer, with bigint arithmetic, and give canonical text. Their native titles add the third concept's notes: "+5 (1 Bar)", "+20 (Tier ×1)" and "+400 (Tier ×2)".
  - **Unavailable steps:** a step that would go past 10^500 − 1 (10^128 − 1 since UI-07) is unavailable, never clamped; landing exactly on it is allowed. All steps are unavailable while the input is empty or invalid, and the text is not changed. Unavailable buttons use `aria-disabled`, keep their focus and are linked to a visible reason.
  - **Whitespace:** text with surrounding whitespace is stepped as `validateNumberInput` and the arrow keys accept it, giving canonical text. The validation is not tightened.
  - **Random** replaces any text, including empty or invalid text, with a positive integer whose length is chosen uniformly from 1 to 10 digits (`MAX_RANDOM_DIGITS`; first planned as 1 to 500, revised in review). The input's 500-digit maximum was unchanged (reduced to 128 in UI-07). The first digit is 1–9. It uses `crypto.getRandomValues` with rejection sampling, with no `Number` arithmetic on the value. A visually hidden polite status gives the digit count, not the number.
  - **Copy** copies the valid integer as canonical text, through the reusable `copyText` helper (`src/utils/clipboard.ts`), and reports success or failure in the existing toasts. It is unavailable for empty or invalid input, with a visible reason.
  - **Unchanged:** the Up and Down arrow keys still add or subtract 1. Date mode, the viewer, rendering and export, and the zoom through value changes, are unchanged.
  - **Not included, deferred in section D:** decrement controls, the 8,000 preset and a custom increment.
- **Refinements requested in review (2026-10-28):**
  - The number input fills its card's width (no `max-w-sm`) and is taller.
  - Random, Copy and Clear get native titles that match their names.
  - Zero gets a gold tint and an `accent-fg` border on hover and keyboard focus.
  - The Number/Date selector follows the third concept: an icon and the stable title "Input Type" on the left, and the modes on the right as a compact segmented control, the selected one gold. It still uses native radio buttons in a fieldset named by its legend, without the extra `radiogroup` label. The date picker and the modes' behaviour are unchanged.
- **Visual polish requested in review (2026-10-28):**
  - The arrow-key hint is no longer visible text: the field has the title "Enter a decimal integer. Use ↑/↓ to change by 1.", and the hint stays as a visually hidden description with `aria-keyshortcuts`.
  - The count reads "1 digit" or "N digits", smaller and secondary. The count itself is unchanged.
  - The field keeps its 1 px `line-strong` boundary, now with an inset shadow; the red error border and the focus ring stay. A borderless field was tried and reverted after a contrast review: no field fill reaches 3:1 against the card (at most 1.30:1 in the light theme and 1.49:1 in the dark one, against 4.12:1 and 4.91:1 for `line-strong`), and a boundary shown only on hover would not help on touch screens or before any interaction.
  - Zero's title is "0 (Shell)".
  - The selector is lower and has no container border. The Number option reads "Number (Decimal)". The Date option stays "Date": the third concept's "Date (Long Count)" would describe a conversion the date mode does not do (G §2). On a phone, the options wrap under the title, on the right.
- **Visual refinements requested in review (2026-10-28):**
  - Buttons and the form fields are `rounded` instead of `rounded-md`: the decimal and date inputs, Random, Copy and Clear, the steps and Zero. The others already were. Left as they are: the selector's track (`rounded-md`, concentric with its segments), the round theme button, the Export pill and the toggle switch (`rounded-full`), and the cards, popovers, settings group, count badge and base-20 boxes, which are not buttons or fields.
  - The steps' row is 4 px further from the field (`mt-4`).
  - The number and date inputs draw the focus ring over their own boundary (`focus-ring-inset`, a -2 px offset). Buttons keep the outer ring, because an inset one would be gold on gold on the Export buttons and the selected segment.
  - The four workspace cards have 16 px padding (`p-4`) instead of 24 px; the gap between them stays 24 px.
- **Validation (2026-10-28, on the branch, before any commit):**
  - `npm test`: 18 files, 401 tests. 5 of 7 full runs passed. Each of the other 2 had one HomeView test that renders a 500-digit numeral exceed the 5 s default timeout. A run with the verbose reporter had 7 timeouts, all in files UI-06 does not touch (the Git workflow scripts, DateInput and exportUtils). Running only `src/`, the baseline and the branch both passed twice, in about the same time (57–60 s). Alone, the slowest affected test takes about 2 s.
  - `npx tsc -b --noEmit`: no errors.
  - `npm run lint`: 0 errors and the 4 existing warnings.
  - `npm run build`: succeeded.
  - `npm run test:e2e`: 87 passed.
  - `git diff --check`: clean.
  - Negative controls:
    - With steps clamped at the maximum and Clear setting `0` again, 18 unit and component tests failed.
    - Against a build of `5408013`, 45 of the 53 tests in the two changed browser test files failed, most of them because of the new label.
  - Screenshots at 375, 768 and 1280 px in both themes, with no page overflow or console errors.
- **Validation of the review refinements (2026-10-28, rerun):**
  - Focused unit and component tests (random number, clipboard, number input and steps, mode selector, HomeView): all passed. The full unit suite was not rerun.
  - `npx tsc -b --noEmit`: no errors.
  - `npm run lint`: 0 errors and the 4 existing warnings.
  - `npm run build`: succeeded.
  - The affected browser tests (`workspace-layout`, `design-foundation`, `numeral-viewport`): 79 passed.
  - Screenshots at 375, 768 and 1280 px in both themes, with no page overflow or console errors.
- **Validation of the visual polish (2026-10-28, rerun):** focused tests for NumberInput, RenderModeSelector and HomeView: 178 passed; `npx tsc -b --noEmit`: no errors; `npm run lint`: 0 errors and the 4 existing warnings; `git diff --check`: clean; the affected browser tests: 79 passed; screenshots at 375, 768 and 1280 px in both themes, with no page overflow or console errors. The full unit suite was not rerun.
- **Validation of the visual refinements (2026-10-28, rerun):** focused tests for the input components and HomeView: 182 passed; `npx tsc -b --noEmit`: no errors; `npm run lint`: 0 errors and the 4 existing warnings; `npm run build`: succeeded; `git diff --check`: clean; the affected browser tests, now also checking the inset ring on both fields and its 3:1 contrast against the card and the field's fill: 79 passed; screenshots at 375, 768 and 1280 px in both themes, including keyboard focus on the fields and buttons, with no page overflow or console errors. The full unit suite was not rerun.

### UI-07: Base-20 breakdown and Copy Formula

- **Status:** completed. Approved at its review checkpoint on the branch `feat/ui-07-base20-breakdown` and merged in PR #22 on 2026-10-31, which completes phase 4.
- **Evidence:** PR #22 (commit `7e83681`, merge `be8a42a`).
- **Scope and acceptance:** G §4.5 and §8, Stage 4, as approved on 2026-10-28 (below). Number mode only: Date mode, the numeral renderer and SVG/PNG export are unchanged.
- **Approved scope (2026-10-28),** after the UI-07 preflight, following design-reference concepts 3 (formula, badge, Copy Formula) and 4 (breakdown table):
  - **Card:** the `h2` stays "Base-20 Representation". A tier badge on its right, wrapping under it on narrow screens, reads "12 tiers · 20⁰–20¹¹" ("1 tier · 20⁰" for 0), from the number of base-20 digits, and in words for screen readers.
  - **Formula:** the inner label "Number" becomes "Base-20 Expansion". Every tier is a term, zero-valued tiers included, joined by "+", with `<sup>` exponents that screen readers hear as "20 to the power of n". It wraps, between terms only, in a height-capped box that becomes a focusable region named "Base-20 expansion formula" once it overflows. The notation tooltip is removed in Number mode.
  - **Copy Formula** copies plain text in a fixed format, e.g. `3 × 20² + 0 × 20¹ + 2 × 20⁰ = 1202`: `×`, Unicode superscripts, " + " and the exact decimal value, without thousands separators. It reuses `copyText`, with its own toasts for success (only once the clipboard has accepted the text), failure and an unavailable clipboard, none of which tells users to copy by hand.
  - **Analytical breakdown:** a disclosure button, collapsed by default, opens a table of Tier, Multiplier (20ⁿ), Digit (cₙ) and Subtotal (cₙ × 20ⁿ), highest tier first, in a region about 300 px tall with a sticky header, focusable while it scrolls. Its values come from `getPlaceValues`; multipliers and subtotals have exact `en-US` thousands separators (`formatGroupedInteger`). The column headers' names say the notation in words.
  - Not included: Date-mode changes, copying the breakdown, renderer copy options and the other section D proposals.
- **Implementation notes:**
  - Number mode uses a new `Base20Expansion` component, so `Base20Display` and `toBase20String`, which Date mode uses, are unchanged.
  - Long table values wrap anywhere (`overflow-wrap: anywhere`), so a line can end inside a group of three digits. Breaking only after a separator, with `<wbr>`, was measured first: at the 500-digit limit of the time, opening the breakdown took 2.6–3.2 s at 375 px (a 2.3–2.7 s long task, 63,216 extra elements). With the fallback it takes about 0.45–0.63 s (long tasks of 0.33–0.50 s), most of it the browser's layout of 385 rows of values up to 666 characters long; at 100 digits it takes about 75 ms.
- **Validation (2026-10-29, on the branch, before any commit):**
  - `npm test`: 22 files, 454 tests passed, in one run.
  - `npx tsc -b --noEmit`: no errors.
  - `npm run lint`: 0 errors and the 4 existing warnings.
  - `npm run build`: succeeded.
  - `npm run test:e2e`: 97 passed, in one run.
  - `git diff --check`: clean.
  - After two later visual refinements (each "+" kept with the term before it; a wider Digit column from 640 px), the focused component and HomeView tests (64) and the two changed browser test files (67) were rerun and passed. The full suites were not rerun.
  - Negative controls against `55ff3e7`: 8 of the 37 HomeView tests and 21 of the 67 tests in the two changed browser test files failed; the Date-mode regression tests passed, as intended.
  - Exports: no renderer, glyph, SVG or export file changed, and the existing export tests passed.
  - Screenshots at 375, 768 and 1280 px in both themes, at 0 (breakdown closed), 1202 and 500 digits (breakdown open), with no page overflow or console errors.
- **Refinements (approved 2026-10-30),** after the review checkpoint, following design-reference concept 3. Superseding the 2026-10-28 scope where they differ:
  - **Visual:** an outline Layers icon (`aria-hidden`) before the `h2`. The formula is in an inset panel (`canvas` fill, `line` border, `shadow-inner`) labelled "Positional Sum Formula" (uppercase on screen), with Copy Formula beside the label and the formula in monospace, its digits bold in `accent-fg`. The disclosure button spans the expansion's width, with the chevron on the right. The table's headers are uppercase on screen, except their notation; the tiers read "Tier n"; the Digit column is centred, in `accent-fg`; a multiplier reads "20ⁿ = value" on one line where it fits, and a long value wraps from the next line.
  - **Functional:** whether the breakdown is open is kept by `HomeView`, as the user's latest choice, so it survives Clear, invalid input and Date mode. Closing sets it at once; the table stays only to fade out (`animate-fade-out`) and is removed when that ends, or at once if the expansion is removed first. The breakdown fades in (`animate-fade-in`) only when the user opens it. The fades animate opacity and a 4 px slide, never the height, and end at once with reduced motion. The formula region is named "Positional Sum Formula" by its label; the breakdown region is named by its button, and the caption reads "Place-value contribution of each base-20 tier", so the name is not repeated.
  - Unchanged: the copied formula, the exact `bigint` values, Date mode, the renderer and SVG/PNG export.
- **Typing with the breakdown open (measured 2026-10-30):** 20 ArrowUp presses at 500 digits and 375 px, on the production build. Closed: 40–48 ms median per press (Event Timing), at most one long task. Open: 112–120 ms median, 160–216 ms at most, a long task on every press (median frame about 94 ms, about 85 ms of it script), so the cost is rendering all 385 rows again, not layout. Not optimised: a proposal is in section D.
- **Validation of the refinements (2026-10-30, before any commit):**
  - `npm test`: 22 files, 466 tests passed. The first run failed as a whole when it started, before any test ran; a second run's result was not captured; the third passed.
  - `npx tsc -b --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded.
  - `npx playwright test`: 98 passed and 1 failed, in one run. The failure, in `e2e/design-foundation.e2e.ts`, listed the new icon's `svg` and `path` among the elements that inherit the heading font; its expected list was updated deliberately, and that file then passed (22 tests).
  - Screenshots at 375, 768 and 1280 px in both themes, at 0 (breakdown closed), 1202 and 500 digits (breakdown open), with no page overflow or console errors.
- **Second refinements (requested 2026-10-30),** at the review checkpoint. Superseding the earlier entries where they differ:
  - **Disclosure:** always tinted (`surface-hover`), darker on hover (`surface-active`), with the shared `focus-ring`. The chevron points down while closed and turns up (`rotate-180`) while open. The name, `aria-expanded`, keyboard use and fades are unchanged.
  - **Multipliers:** the column shows only "20ⁿ". Its exact value, with thousands separators, is in a react-tooltip tooltip (the project's existing tooltip library), on hover or keyboard focus: `role="tooltip"`, `aria-describedby` on the focused or hovered notation while it shows, closed with Escape, and the pointer can move onto it. One tooltip serves every row and formats only the value it shows. Long values wrap anywhere and scroll inside it (at most 24rem or the screen width less 2rem wide, and 22rem or 60vh tall). Each multiplier's notation is focusable (one Tab stop per row); the other cells are not.
  - **Columns:** Tier, Multiplier and Digit have fixed widths (4, 5 and 3rem on phones; 5, 7 and 6rem from 640 px), and Subtotal takes the rest. Cells are `px-1.5` on phones (`px-2` from 640 px), and header words may break as a last resort. With classic scrollbars at 375 px the previous widths overflowed the region sideways; headless browser tests hide scrollbars, so this was not caught before.
  - **Scrollbars:** the formula and breakdown boxes use a new `scrollbar-themed` utility (a `line-strong` thumb on a transparent track). The formula was already capped (`max-h-64`), focusable once it overflows, and its label and Copy Formula sit outside the scrolling box; this is unchanged.
  - **Export trigger at 768 px:** the floating trigger covers a band at the bottom of the viewport, so a control scrolled into that band, such as the disclosure's chevron, is hidden behind it. `:root` now has a `scroll-padding-bottom` of that band (4.5rem, 7rem from 640 px), so keyboard focus moves such a control above the trigger. The layout and the trigger are unchanged; content can still pass under the trigger while the page scrolls (see section D).
  - **Rows memoized:** `BreakdownRow` is a `memo` component with primitive props, so when the number changes only the rows whose digit changed render again.
  - Unchanged: the formula text, the copied formula, the exact `bigint` values, Date mode, the renderer, SVG/PNG export and the 500-digit maximum (reduced to 128 in the third refinements below).
- **Performance by input size (measured 2026-10-30, while the maximum was 500 digits; historical):** the production build at 375 px, 3 runs per size, 20 ArrowUp presses per run (Event Timing; presses under 16 ms counted as 16 ms). Final code:

  | Digits (tiers, at most) | Opening the breakdown | Press, closed: median / slowest | Press, open: median / slowest | Long tasks per 20 presses, open |
  |---|---|---|---|---|
  | 50 (39) | 50–59 ms | 16–24 / 24–32 ms | 16–20 / 32–40 ms | 0 |
  | 100 (77) | 69–131 ms | 24 / 24–40 ms | 24 / 32–40 ms | 0 |
  | 128 (99) | 69–106 ms | 24–32 / 32–56 ms | 24–32 / 40–64 ms | 0 |
  | 500 (385) | 255–338 ms | 40–48 / 56–80 ms | 56–72 / 80–104 ms | 1–4 (52–226 ms in all) |

  Before these refinements, on the same machine and procedure, 500 digits took 618–849 ms to open and 160–188 ms per press with the breakdown open (184–240 ms at most, a long task on every press); 50 to 128 digits were already within 24–40 ms. Showing only "20ⁿ" (the values are no longer formatted for every row) brought 500 digits to 246–397 ms and 80 ms; memoizing the rows to 48–64 ms per press, with 0–2 long tasks. At 128 digits or fewer, memoizing made no measurable difference.
- **Validation of the second refinements (2026-10-30, before any commit):**
  - Focused tests (Base20Expansion, HomeView, PowerOf20, base20, formatInteger): 108 passed. A negative control, without `memo`, failed the new row-rendering test.
  - `npm test`: 22 files, 471 tests passed, in one run.
  - `npx tsc -b --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded. `git diff --check`: clean.
  - `npx playwright test`: 107 passed, in one run.
  - Screenshots at 375, 768 and 1280 px in both themes, with scrollbars shown: the disclosure closed, hovered, focused and open; the formula and table at 1202 and 500 digits; the tooltips of 20² and 20³⁸⁴; and the disclosure in the Export trigger's band before and after keyboard focus. No page overflow, sideways scrolling or console errors.
- **Third refinements (requested 2026-10-31),** at the review checkpoint. Superseding the earlier entries where they differ:
  - **Maximum of 128 significant digits (approved 2026-10-31):** `MAX_SIGNIFICANT_DIGITS` is 128, down from 500, in its one definition in `src/utils/numberInput.ts`. The validation message, the steps' reason, `MAX_NUMBER_VALUE` (10^128 − 1), the arrow keys and the quick steps derive from it. Leading zeros and whitespace are still not counted, and the raw input stays limited to 1,000 characters. Random keeps its separate 10-digit maximum. A googol (10^100, 101 digits) and 2^256 (78 digits) are accepted. The largest number has 99 tiers (20⁰–20⁹⁸) instead of 385. Its numeral is 350 × 7,920 units, so the Small (600 × 13,577 px) and Medium (1,200 × 27,154 px) PNG presets are now within the PNG limits; Large (2,400 × 54,309 px) is still refused. The export code is unchanged.
  - **Rationale:** at 500 digits the breakdown had 385 rows with values of up to 666 characters, and the original-size PNG (350 × 30,800 px) was close to the 32,767 px limit. At 128 digits every interaction measured below stays under about 65 ms with no long tasks while typing, and the table and formula stay readable.
  - **Compact subtotals:** a subtotal with 6 or more trailing zeros is shown as "coefficient × 10ᵏ": whole groups of three trailing zeros move into the exponent (a multiple of 3), so the coefficient keeps its grouping and up to two trailing zeros, e.g. 2,560,000,000 as "2,560 × 10⁶" and 4,915,200,000,000,000,000 as "4,915,200 × 10¹²". `toCompactInteger` (`src/utils/formatInteger.ts`) works on the decimal digits, without `Number`. Zero and values with fewer trailing zeros are written in full. Screen readers hear "2,560 times 10 to the power of 6". "× 10ᵏ" never breaks; a long coefficient wraps anywhere. A compact subtotal is focusable and shows its exact grouped value in the same tooltip as the multipliers; values written in full have no tooltip. Presentation only: the subtotals, the formula and Copy Formula are unchanged.
  - **Tooltip:** the longest value is now 170 characters, which wraps onto at most 5 lines within the tooltip's maximum width (24rem, or the screen width less 2rem), so the tooltip no longer scrolls: its inner scrolling box and maximum height are removed. A popover was therefore not needed.
  - **Export trigger:** from 640 px, `main` has extra bottom padding (`sm:pb-13`), so at the end of the page every card ends at least 8 px above the floating trigger, and the disclosure can always be scrolled fully above it. Before, the last card ended about 23 px under the trigger's top edge. Below 640 px, the last card's existing margin already did this. The keyboard `scroll-padding-bottom` is kept. Content can still pass under the trigger while the page scrolls; a layout that never overlaps stays with UI-11 (section D).
  - Unchanged: the memoized rows, the disclosure (tinted, chevron on the right, down/up), the formula area and its themed scrollbar, Date mode, the renderer and SVG/PNG output.
- **Performance at the 128-digit maximum (measured 2026-10-31):** the same procedure as above (production build, 375 px, 3 runs, 20 ArrowUp presses per run), on the final code:

  | Input | Opening the breakdown | Press, closed: median / slowest | Press, open: median / slowest | Long tasks per 20 presses |
  |---|---|---|---|---|
  | 128 digits, 98 tiers (the input measured on 2026-10-30) | 89–112 ms (one long task, 67–89 ms) | 24 / 24–32 ms | 24–32 / 40–64 ms | 0 |
  | 10^128 − 21 to the maximum, 99 tiers | 119–161 ms (one long task, 93–129 ms) | 24–32 / 32–40 ms | 32–40 / 56 ms | 0 |

  Compared with 2026-10-30 (69–106 ms to open; 24–32 / 40–64 ms per press), typing is unchanged and opening is about 20 ms slower, from the compact subtotals and their tooltip anchors.
- **Validation of the third refinements (2026-10-31, before any commit):**
  - Focused tests (formatInteger, numberInput, base20, exportUtils, randomNumber, Base20Expansion, Base20Display, NumberInput, FloatingExportMenu, GlyphStackGroup, MayanExportPanel, HomeView): 12 files, 399 passed. The affected browser tests, in two focused runs: 37 and 41 passed.
  - `npm test`: 22 files, 488 tests passed, in one run.
  - `npx tsc -b --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded. `git diff --check`: clean.
  - `npx playwright test`: 113 passed, in one run.
  - Screenshots at 375, 768 and 1280 px in both themes, with scrollbars shown: 0, 2,576,001,200 (compact subtotals) and the 128-digit maximum, the breakdown closed, focused and open, the formula area, the multiplier and subtotal tooltips, and the end of the page with the Export trigger. No page overflow, clipping or console errors. Two screenshot runs at 375 px in the dark theme once found no tooltip after hovering the 20⁹⁸ notation; it did not recur in two later full runs or in isolation, and the browser tests of the same hover passed.
- **Fourth refinements (requested 2026-10-31),** a final polish pass. Superseding the earlier entries where they differ:
  - **Compact notation confirmed:** powers of ten with exponents that are multiples of 3, as implemented in the third refinements. The subtotals, `toCompactInteger`, the formula and Copy Formula are unchanged.
  - **Subtotal wrapping:** a long subtotal or coefficient now breaks only after a thousands separator. A `<wbr>` follows each comma, so a line ends with "," and a group of three digits is never split. The cell is `overflow-wrap: break-word`, so a group can break only where even one would not fit. "× 10ᵏ" still never breaks. The text read by screen readers and copied by selection is unchanged. This replaces the "wrap anywhere" fallback of 2026-10-29: at 128 digits the breakdown has about 500 `<wbr>` elements, not 63,000. Opening it at 10^128 − 1 at 375 px took one long task of 86–134 ms with them and 100–107 ms without, 3 runs each with the same script, which is within run-to-run noise. Measured at 375 px with classic scrollbars: before, the Subtotal column (87 px) broke inside a group 52–62 times per table and took at most 5 lines; now it never does, and takes at most 6 lines, because a line holds two whole groups where it held two and part of a third. At 1280 px (163 px), at most 3 lines, with no split groups.
  - **Column widths unchanged:** three groups ("000,000,000,") need 78 px of text in Segoe UI and 82 px in Arial, plus 12 px of padding. Narrowing Tier to 60 px and Digit to 46 px (Subtotal 93 px) fits them in Segoe UI only, with 3 px to spare. Narrowing further (Tier 56 px) leaves "Tier 98" (44 px of text) no room in Segoe UI or Arial, and less than none in wider fonts. The app uses the system font stack, so the saving holds on Windows only, and the Multiplier column is already set by its header word ("MULTIPLIER", 68 px of text in 80 px). The fixed widths stay as they are.
  - **Tab stops unchanged:** each multiplier and each compact subtotal stays focusable: 191 stops at 10^128 − 1, and 3 at 1202. The exact grouped value exists only in the tooltip. react-tooltip opens it on hover or focus, and sets `aria-describedby` on the anchor only while it is open, so focus is the only way to reach it from the keyboard or a screen reader. The alternatives considered were:
    - **Hover-only tooltips:** these would remove keyboard access to the values.
    - **Visually hidden exact values in each cell:** screen readers would read every value twice when moving through the table, up to 128 digits each time, and sighted keyboard users would still have no way to reach them.
    - **One stop per row:** this would put two different values behind one anchor.
    - **A roving tabindex or a grid:** these were excluded for this pass.

    The stops exist only while the breakdown is open, it is closed by default, and closing it removes all of them. A single "show exact values" control, or removing the compact subtotals' stops because "c × 10ᵏ" is already exact and read in full, would each change approved behaviour. They are not implemented and would need approval.
  - Unchanged: the tooltip, which still wraps anywhere; the formula; Copy Formula; Date mode; the renderer; and SVG/PNG export.
- **Validation of the fourth refinements (2026-10-31, before any commit):**
  - `Base20Expansion.test.tsx`: 40 passed, including a new test that a long subtotal has a `<wbr>` after every comma and nowhere else, with its read and spoken text unchanged. New browser tests at 375 px (dark) and 1280 px (light) check, for all 99 rows at 10^128 − 1, that no group of digits spans two lines, that "× 10ᵏ" stays on one line and that nothing overflows. Both would fail on the previous code, where a value was a single text node; this was reasoned, not run.
  - `npx tsc -b --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded. `git diff --check`: clean.
  - `npm test`: 22 files, 489 tests passed, in one run.
  - `npx playwright test`: 115 passed, in one run.
  - Screenshots of the breakdown at 375, 768 and 1280 px in both themes, with scrollbars shown, at two 128-digit numbers. No sideways scrolling or page overflow.
- **Focus under the sticky header (found in the final review, 2026-10-31):**
  - **Fix:** when tabbing backwards through the breakdown, the browser scrolls each focused value to the top of the box, where the sticky header (about 45 px tall) could hide it. At 10^128 − 1, 5–6 of 30 Shift+Tab presses left it fully hidden (WCAG 2.2, 2.4.11). The scrolling box now has `scroll-pt-14` (56 px), which keeps the value and its focus ring (2 px outline, 2 px offset) below the header. `scroll-pt-12` (48 px) would leave the ring 1 px under it. Nothing else changed.
  - **Test:** a new browser test, at 375 and 1280 px, presses Shift+Tab 30 times from the last focusable value. After each press it checks that the focused value is in the table, that the top of its focus ring is at or below the header's measured bottom edge, and that it ends inside the box. Run before the fix, it failed at both widths (press 8: the ring 7 px under the header); with the fix it passes.

### UI-08: Shared persistence for display preferences

- **Status:** completed. Implemented and validated on 2026-10-31 on the branch `feat/ui-08-09-preferences-tier-guides`, approved at its review checkpoint, and merged alone in PR #23 (commit `1eff291`, merge `506e8a8`); UI-09 continues on its own branch (section A).
- **Goal:** one persistence mechanism for display preferences, including background and glyph colours, before other tasks add preferences. Before UI-08, only the theme and grid visibility are saved (`src/context/DisplaySettingsContext.tsx`), under the unprefixed keys `theme` and `showGrid`.
- **Scope and acceptance:** G §4.7, and the persistence parts of §8, Stage 6, as approved on 2026-10-31 (below).
- **Approved scope (2026-10-31),** after the UI-08/UI-09 preflight:
  - **Architecture:** the existing settings context (`DisplaySettingsProvider`, `useDisplaySettings`) stays. No versioned settings record, no new dependency, no reset-preferences control and no cross-tab synchronization.
  - **Storage keys:** one consistent, namespaced scheme, with a separate key per preference: `mayastack:theme`, `mayastack:showGrid`, `mayastack:backgroundColor`, `mayastack:glyphColor` and, from UI-09, `mayastack:showTierGuides` (renamed in UI-09's revision, before any release, to `mayastack:showTierHairlines`, with `mayastack:showPlaceTierGuides` added; plan-change log). The prefix keeps them apart from other projects served from the same origin (`apogouv.github.io`).
  - **No migration:** the unprefixed `theme` and `showGrid` keys are not read, migrated or removed; they are ignored. A theme or grid setting saved before UI-08 is therefore not carried over, and the defaults apply until the user chooses again. This is an explicit decision (plan-change log), superseding for these two keys the requirements to preserve existing settings and not to discard existing customizations (G §4.7, §8 Stage 6), which stay as first written.
  - **First paint:** the inline theme script in `index.html` reads `mayastack:theme` instead of `theme`, in step with the context, so the theme is still applied before the first paint without a flash.
  - **Colours:** the background and glyph colours, including alpha, are saved as JSON RGBA values, e.g. `{"r":255,"g":255,"b":255,"a":1}`, and restored on the first render. They reach the SVG and PNG exports through the renderer as today; the export code is unchanged.
  - **Validation:** stored values are validated strictly before they are applied. A colour must have integer `r`, `g` and `b` from 0 to 255 and a finite `a` from 0 to 1, and exactly those four fields (made stricter at implementation, on request: a value with any other field is rejected, not trimmed). Malformed JSON, missing, unexpected or wrongly typed fields and out-of-range values fall back to the existing defaults, never to a clamped or rounded value. Invalid theme and boolean values also fall back to their defaults. Unavailable or failing storage keeps today's behaviour: settings start from their defaults and still change for the visit.
  - **Writes:** the colours change continuously while the picker is used, and are saved after about 300 ms without further change. A pending colour is saved at once when the provider unmounts and on the page-lifecycle events that precede leaving or hiding the page (such as `pagehide` and `visibilitychange` to hidden), so the final colour is not lost.
  - **Tests:** tests that seed or read the unprefixed keys (e.g. `DisplaySettingsContext.test.tsx`, `e2e/theme.e2e.ts`, `e2e/design-foundation.e2e.ts`, `e2e/workspace-layout.e2e.ts`) are updated deliberately to the new keys.
- **Implementation notes:**
  - `DisplaySettingsContext.tsx` keeps one key constant per preference and the existing `readStored`/`writeStored`. Each preference is read once, in its `useState` initializer. `showTierGuides`/`setShowTierGuides` are added to the context, off by default and saved like the grid, without any control or rendering (UI-09; replaced in UI-09's revision by `showTierHairlines` and `showPlaceTierGuides`).
  - Preferences are saved when they change, never on mount (corrected at the review checkpoint: before, the theme, grid and tier-guide effects also wrote on mount, and the theme was written again on every OS colour-scheme change). A small local hook, `useSaveOnChange`, saves a value only when it differs from the one held in a ref (the initial value, then the last saved), so React Strict Mode's repeated mount effects save nothing. The theme saved is the one chosen, not the resolved one, so an OS colour-scheme change under the system theme saves nothing; choosing the system theme still removes `mayastack:theme`. The writes stay in effects rather than in the setters, which are also called with updater functions (`toggleTheme`), which Strict Mode calls twice.
  - `parseRgbaColor` and `serializeRgbaColor` (`src/utils/colors.ts`) read and write the colour JSON. react-colorful's `RgbaColorPicker` produces integer channels and an alpha rounded to 2 decimals, which the validation accepts unchanged.
  - The colour setters update the state at once and put the colour, serialized, in a pending map (one entry per key, the latest value), restarting one 300 ms timer. The save reads the map, not React state, so it cannot save a stale colour; it runs when the timer fires, on `pagehide`, on `visibilitychange` to hidden, and in the provider's unmount cleanup. Colours are never written on mount. The unused `useDebounce` hook is unchanged: it debounces a value and clears its timer on unmount, so it would lose the final colour.
  - `ColorPicker`, the renderer and the export code are unchanged.
- **Validation (2026-10-31, on the branch, before any commit):**
  - `npm test`: 23 files, 546 tests passed (after the review correction; 540 before it). New: `src/utils/colors.test.ts`, and colour, debounce, lifecycle, old-key, invalid-value, storage-failure, tier-guide, no-write-on-mount (with and without Strict Mode), one-write-per-change and OS colour-scheme tests in `DisplaySettingsContext.test.tsx`.
  - `npx tsc -b --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded. `git diff --check`: clean.
  - `npm run test:e2e`: 121 passed, in one run. New browser tests: an unprefixed `theme` is ignored from the first paint, a chosen theme is applied by the first-paint script after a reload, valid saved colours are rendered and exported while invalid ones are ignored, and a colour is saved 300 ms after the last change or, with timers paused, by an immediate reload, then restored and exported with its alpha.
  - Negative control: with the unmount, `pagehide` and `visibilitychange` saves removed, 5 unit tests and the reload browser test failed; the code was then restored.
  - Negative controls for the review correction: with the unchanged-value check removed (saving on mount), 8 unit tests failed; with the theme saved whenever the resolved theme changes, the OS colour-scheme test failed. The code was restored each time. All of the checks above were rerun after the correction, with the results given.
- **Next action:** none.

### UI-09: Screen-only tier guides

- **Status:** completed. Implemented on its own branch `feat/ui-09-tier-guides` (UI-08 was merged alone in PR #23; plan-change log): first implemented and validated on 2026-10-31, then refined on 2026-10-31 after design concept 4 (revised scope, below), and given a visual refinement the same day (below); a pre-merge audit on 2026-11-01 added test coverage only (below). Approved at its final review and merged in PR #24 on 2026-11-01, which completes phase 5.
- **Evidence:** PR #24 (commit `d1dedfa`, the pull request's head; merge commit `8daca18`, whose parents are `506e8a8`, the previous `main`, and `d1dedfa`).
- **Scope and acceptance:** G §5.2 and the tier-guide parts of §8, Stage 5, using the UI-08 persistence mechanism, as approved on 2026-10-31 and revised the same day (below).
- **Approved scope (2026-10-31),** after the UI-08/UI-09 preflight, as first approved. Superseded where the revised scope below says so:
  - **Appearance:** subtle horizontal lines between the tiers, in the current glyph colour at low opacity, so the guides relate to the user's palette. No alternating bands and no labels. The guides must not obstruct the glyphs.
  - **Control:** off by default. An independent toggle labelled "Show Tier Guides" (without a colon), in the viewer's controls, beside but outside the "Zoom controls" group. It is saved as `mayastack:showTierGuides` through the UI-08 mechanism. The Show Grid control stays in its current settings card.
  - **Alignment:** the guides stay aligned with the tiers while zooming (25% to 400%) and scrolling. In Date mode, they are calculated independently for each numeral group, whose tier counts may differ.
  - **Implementation:** an HTML overlay inside the viewer's zoom wrapper, outside the exported SVG. The numeral data, conversion, glyph rendering, export dimensions and exported SVG/PNG output are unchanged.
  - **Interaction and accessibility:** the guides do not intercept pointer interaction and do not affect keyboard use or screen readers.
  - **Grid:** the exportable grid stays independent and unchanged.
  - Not included: annotations, and anything that couples the guides to them (UI-10).
- **Revised scope (2026-10-31),** approved after inspecting design concept 4 (`design-reference/concept-4/code.html`), whose settings panel distinguishes "Show Place Tier Guides" (a shaded card behind each tier) from "Tier Dividing Hairlines" (a line between tiers). It supersedes the first scope's "no alternating bands" and its control (plan-change log):
  - **Two guides, each independent and off by default:**
    - **Dividing Hairlines:** the lines of the first scope, unchanged in geometry, alignment, 1 px thickness, solid style and colour (the glyph colour at 0.2 of its alpha). Labelled "Show Dividing Hairlines:", saved as `mayastack:showTierHairlines` (`showTierHairlines`/`setShowTierHairlines`).
    - **Place Tier Guides:** a subtle shaded band per actual tier of each numeral group, covering the tier's 80-unit cell less a small inset at its top and bottom, so adjacent bands are visibly apart. The glyph colour at low opacity (about 0.06, a named constant to tune at visual review). No hover effects, labels or annotations. In Date mode, each group has bands only for its own tiers: the space above a shorter group stays unshaded. Labelled "Show Place Tier Guides:", saved as `mayastack:showPlaceTierGuides` (`showPlaceTierGuides`/`setShowPlaceTierGuides`).
  - **Renamed preference:** `showTierGuides` and `mayastack:showTierGuides` become `showTierHairlines` and `mayastack:showTierHairlines`. No migration: the old key never had a control in a released version (UI-08 added it without a control, and UI-09's control was never merged), so it is ignored.
  - **Control:** both switches leave the viewer and join the settings panel, whose legend becomes "Stela Material & Glyph Settings" (the `fieldset`/`legend` structure stays; no heading or icon). The background colour, glyph colour and Show Grid controls, unchanged, form an "Exported appearance" group. A nested "Viewer guides" group, with the hint "Shown on screen only, not included in exports.", holds the two switches, Place Tier Guides first. Both use the existing `ToggleSwitch` with its normal layout.
  - **Screen-only:** neither guide is ever part of the SVG or PNG exports, which stay byte-identical with the guides on or off. The hairlines are drawn above the bands.
  - **Glyph appearance:** the bands must not tint, darken or otherwise alter the glyphs.
- **Visual refinement (2026-10-31),** requested after the revised scope was implemented. It supersedes the revised scope's colours and the cards' lack of hover, and keeps everything else (plan-change log):
  - **Colours from the viewer background, never from the glyph colour.** `getGuideColors` (`src/utils/guideColors.ts`) chooses both guides' colours from the numeral's background as the viewer shows it: a translucent background is composited over the panel's `canvas` colour for the theme (`VIEWER_BACKDROP`, checked against the stylesheet by a browser test). Each guide has a dark ink, used over light backgrounds, and a light ink, used over dark ones; its opacity is the lowest that gives the composited guide its contrast target (WCAG 2.x relative luminance), rounded up to a whole 1/255. The inks switch where black and white contrast equally with the background; elsewhere the opacities change gradually with it.
  - **Dividing Hairlines: gold-toned, 3:1.** Inks: a deep bronze, rgb(34 22 0), and a pale gold, rgb(250 232 180), after the reference rgb(77 70 53 / 0.3), which reaches only about 1.2:1 on the concept's own background and cannot reach 3:1 on mid-tone backgrounds. Target: 3:1 against the background and against a resting card (WCAG 2.1 SC 1.4.11), reached for every background tested; never below the reference's 0.3 opacity. Geometry, 1 px thickness and solid style unchanged.
  - **Place Tier Guides: subtle cards, supplementary.** Inks: the reference rgb(39 42 48) and a light neutral, rgb(225 226 235). Target: 1.25:1 against the background at rest and 1.5:1 when hovered, deliberately below 3:1. The cards shade each place but are not needed to read it: the glyphs and the gaps between tiers show the places, the hairlines mark the boundaries at 3:1, and a 3:1 card would be a heavy panel behind every glyph. The reference at its own 0.4 would be about 2.3:1 on white.
  - **Shared side inset:** cards and hairlines are both 94% of their group's width, centred: `TIER_GUIDE_SIDE_INSET`, 3% of the group's width at each side, in one calculation. The cards' vertical geometry is unchanged.
  - **Cards behind the glyphs (approved option "underlay"):** the background-derived colour would tint the glyphs if the cards lay over the SVG, so on screen they lie behind it. The cards' layer, placed before the SVG in the zoom wrapper (NumeralViewport's new `underlay` slot), paints the numeral's background and the cards; a screen-only rule in `src/index.css`, applied only while the layer precedes the SVG, makes the SVG's background rectangle (its first child) transparent and positions the SVG above the layer. The glyphs and the grid are therefore drawn over the cards exactly as over the background, at any alpha, and the exported SVG and PNG, serialized from the markup without page styles, are unchanged. The hairlines stay in the overlay above the SVG, in the gaps between tiers, never over a glyph. The visual order is: background, cards, glyphs and grid, hairlines.
  - **Hover:** the card under a mouse or pen pointer is stronger (its hover opacity) with a subtle shadow, over a 150 ms transition that the app's reduced-motion rule removes. Both layers keep `pointer-events: none`: the hovered card is found by geometry from the pointer's position over the zoom wrapper (`findPlaceTierBand`), with passive `pointermove` and `pointerleave` listeners on the wrapper and a passive `scroll` listener on the viewer, attached only while the cards are shown. Touch shows no hover; nothing is focusable; the layers stay `aria-hidden`.
  - **Not included:** material colour presets and the settings panel's further refinement, approved separately as UI-15 (its entry in this section). UI-09 changes no background, glyph or grid colour, default or control; its guides adapt to whatever background is chosen.
- **Implementation notes** (as implemented after the visual refinement):
  - `src/utils/tierGuides.ts`: `getNumeralSize`, `getTierHairlines` (renamed from `getTierGuideLines`), `getPlaceTierBands` and `findPlaceTierBand`, pure helpers that follow MayanRenderer's layout (groups `widthPerGroup` wide and `spacing` apart, tiers `heightPerGlyphStack` tall, every group aligned at the bottom). A group of n tiers has n − 1 hairlines and n bands, both 94% as wide as the group (`TIER_GUIDE_SIDE_INSET`, 0.03 at each side, one shared calculation). A hairline's top is (maxTiers − k) / maxTiers; a band's top is ((maxTiers − 1 − e) × height + inset) / total height and its height (height − 2 × inset) / total height, so no rounding accumulates. `PLACE_TIER_BAND_INSET` is 2 SVG units. Invalid layout values throw a `RangeError` (a spacing of 0 is valid), as does an inset that is negative, not finite, or leaves no band. `findPlaceTierBand` returns the band under a point given as fractions of the numeral, or none in a gap, an inset or above a shorter group.
  - `src/utils/guideColors.ts`: `relativeLuminance`, `contrastRatio`, `compositeOver` and `getGuideColors`, with the inks, targets, minimum hairline opacity, hover shadows and `VIEWER_BACKDROP` as named constants. Invalid channels or alphas throw a `RangeError`. No dependency.
  - `src/components/TierGuides.tsx`: `PlaceTierGuides`, the cards' layer (the underlay, with the background, the cards and the hover), and `TierHairlines`, the hairlines' overlay. Both are context-free, `absolute inset-0 pointer-events-none` and `aria-hidden`, without any SVG element; HomeView renders each only while its setting is on. The cards' layer carries `data-numeral-underlay`, which the stylesheet rule keys on.
  - **Glyph appearance:** with the cards behind the SVG, an opaque glyph's pixels are exactly those without cards, and a translucent glyph shows the card through it as it shows the background (browser pixel tests at alpha 1 and 0.5). The grid, drawn in the SVG, is now drawn over the cards, untinted. Glyphs lie from about 41 to 75 units within their 80-unit cell and are at most 46 units wide, so each card (2 to 78 units, 94% of the group) covers its tier's glyphs completely. (Before the visual refinement, the bands lay over the SVG in the glyph colour, which left opaque glyphs within one channel step of unchanged.)
  - `NumeralViewport` has two screen-only slots in the zoom wrapper, which is `relative`: `underlay`, before the numeral, and `overlay`, after it. The `controls` slot and its wrapping row were removed with the viewer's toggle, so the zoom controls are as on `main`. `ToggleSwitch` is unchanged from `main` (its `className` prop was removed).
  - `DisplaySettings`: the legend "Stela Material & Glyph Settings", with nested `fieldset`s "Exported appearance" and "Viewer guides" (described by its hint through `aria-describedby`).
  - `HomeView` gives MayanRenderer and both guide layers one layout per mode (`NUMERAL_LAYOUTS`, the existing values: 80 units per tier, 350 or 100 per group, 25 apart, scale 1), and computes the guide colours from the background colour and the resolved theme.
  - Unchanged: MayanRenderer, the glyph components, SvgBackground, SvgGrid, the export code and the conversion. The settings context gains the two preferences in place of `showTierGuides`, with the existing `readSavedBoolean` and `useSaveOnChange`.
  - Tests changed deliberately: the UI-08 test of the tier-guide preference covers both new preferences and their controls in the settings panel; the tests that found the settings card by "SVG Display Settings" (`HomeView.test.tsx`, `e2e/workspace-layout.e2e.ts`, `e2e/design-foundation.e2e.ts`) use the new legend, and the label-contrast list adds the new labels and hint.
  - Visual review of the first scope (light and dark, 375 to 1280 px; 25%, 100% and 400%; Date mode; custom colours): the lines sit at the tier boundaries, about 5 units below the glyphs above them. With the grid on, its fixed `#ddd` stroke covers every fourth grid line's hairline, so the hairlines are hard to tell from it, most visibly on a dark or transparent background; the grid is unchanged (G §5.1).
- **Validation of the visual refinement (2026-10-31, on the branch, before any commit):**
  - `npm test`: 26 files, 610 tests passed in the full run (an earlier full run timed out in `scripts/git/*.test.mjs` hooks and in a 128-digit export test of `HomeView.test.tsx` under parallel load; the Git script tests passed alone, 56 of 56). Timeouts as they stand, checked at the pre-merge audit (2026-11-01): UI-09's "exports the same SVG with both guides on or off", which renders and serializes the 128-digit numeral twice, has a 15 s timeout; the existing "exports the complete numeral of the largest number under its short filename", also 128 digits, keeps the default timeout, as on `main`. Which test originally timed out, and so the reason for the 15 s timeout, could not be verified independently: neither the timeout nor that run's log is in Git history or in a kept test report. New: `src/utils/guideColors.test.ts` (luminance and contrast, compositing, light, dark, intermediate, coloured and translucent backgrounds, 3:1 hairlines, the cards' targets, the ink switch, gradual opacities, determinism, no glyph colour, invalid input). Rewritten or extended: `src/utils/tierGuides.test.ts` (the shared side inset, `findPlaceTierBand`), `src/components/TierGuides.test.tsx` (both layers, the underlay, hover by geometry, touch, scrolling under a still pointer, removal), `HomeView.test.tsx` (layer placement, colours from the background and not the glyphs, inset geometry against the SVG) and `NumeralViewport.test.tsx` (the `underlay` slot).
  - `npx tsc -b --noEmit` and `npx tsc -p tsconfig.e2e.json --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded, with Vite's warning that the main chunk (506.87 kB) exceeds 500 kB. `git diff --check`: clean.
  - `npm run test:e2e`: 144 tests: 143 passed in the full run, which ran slowly (7.6 min) and in which `e2e/design-foundation.e2e.ts` "keeps the toast entrance animation by default", unrelated, timed out waiting for the toast's animation; it passed when rerun alone and in a rerun of its whole file (22 of 22). The tier-guide tests (23) add: the backdrop colours against the stylesheet in both themes; rendered colours on white, mid-grey, navy, black and transparent backgrounds in both themes, composited, with hairlines at 3:1 against the background and a card, cards from 1.24 to 1.27:1, and no change with the glyph colour; the layer order and the screen-only rule; exports identical with both guides on and a card hovered; exact opaque glyph pixels and the expected composite at 50% alpha over the cards; hover on one card only, with a shadow and a 150 ms transition, cleared in gaps and on leaving, following the content while the viewer scrolls under the pointer, without taking the pointer; no transition with reduced motion.
  - Negative controls: without the rule making the SVG's background transparent, and separately without the rule positioning the SVG, the layer-order test and both glyph-pixel tests failed; `src/index.css` was restored byte for byte each time.
  - Pre-merge audit (2026-11-01), test coverage only, with no change to the application, its styles or the export: the screen-only rule depends on the SVG's background rectangle being its first child, which was tested only with the grid off. `HomeView.test.tsx` ("keeps both guides and the exportable grid independent of one another") now checks, with both guides and the grid on, that the SVG's first child is the background rectangle, followed by the grid's rectangle filled with `url(#grid)`. A browser test, "keep the exportable grid painted over the cards, with only the background transparent", checks with both guides and the grid on, on a dark background: the first child is the background rectangle, transparent on screen, and the grid's rectangle keeps its pattern fill; along a row of the top tier's card, all 16 vertical grid lines show over the card, which shows between them, and without the grid the row is the card alone; with both guides off, the SVG paints its own background again under the same 16 grid lines. `npx vitest run src/views/HomeView.test.tsx`: 51 passed. `npx playwright test e2e/numeral-viewport.e2e.ts`: 52 passed (24 tier-guide tests). `npx tsc -p tsconfig.e2e.json --noEmit`: no errors; ESLint on both test files: clean. The full suites were not rerun.
  - Visual review (screenshots: light and dark themes; white, transparent, black, mid-grey, navy and parchment backgrounds; cards only, hairlines only, both, both with the grid; Number and Date mode; 25%, 100% and 400%; a scrolled 128-digit numeral; hover; 375 px): the cards read as subtle panels behind the glyphs, the hovered one clearly stronger; the hairlines are visible in the gaps without dominating at 100% and above; the grid now shows over the cards. Concerns: at 25% the 4-unit gap is under 1 px, so the cards nearly merge and the hairlines dominate; over light backgrounds the 3:1 hairline reads as a warm grey more than gold, and over saturated cool backgrounds (navy) as grey.
- **Validation (2026-10-31, on the branch, before any commit), after the revision** (before the visual refinement):
  - `npm test`: 25 files, 588 tests passed. Rewritten or extended: `src/utils/tierGuides.test.ts` (band count, position, insets, Date-mode groups, the largest number, inset and layout validation, a spacing of 0), `src/components/TierGuides.test.tsx` (each layer alone and both, the hairlines unchanged by the bands and above them, colours, `aria-hidden`, pointer pass-through, no SVG), `DisplaySettingsContext.test.tsx` (both preferences: off by default, saved and restored independently, both on, invalid and missing values, the unreleased old key ignored, the grid unaffected), `HomeView.test.tsx` (the panel's groups and hint, switch order, each guide alone and both, independence from the grid, saved preferences, export identity, both guides against the rendered SVG in both modes) and `NumeralViewport.test.tsx` (the `controls` tests removed with the slot).
  - `npx tsc -b --noEmit` and `npx tsc -p tsconfig.e2e.json --noEmit`: no errors. `npm run lint`: 0 errors and the 4 existing warnings. `npm run build`: succeeded, with Vite's warning that the main chunk (504.32 kB) exceeds 500 kB (502.46 kB before the revision; whether it exceeded 500 kB before UI-09 was not checked). `git diff --check`: clean.
  - `npm run test:e2e`: 134 passed (121 before UI-09, 13 for the tier guides): defaults, the settings panel and independent persistence after reloads; both guides aligned at 25%, 100% and 400%, while a 128-digit numeral is scrolled, and in Date mode with groups of 2, 1 and 3 tiers, each band containing its tier's stack and nothing above shorter groups; colours and layer order; identical SVG and PNG exports with both on; glyph pixels with an alpha of 1 and 0.5 against the expected composite; the pointer passing through both layers; keyboard order (Show Grid, then the two switches; Reset, then the viewer); the panel at 375, 768 and 1280 px; and the updated panel name in `e2e/workspace-layout.e2e.ts` and the label-contrast list in `e2e/design-foundation.e2e.ts`.
  - Negative control: with the bands drawn in black instead of the glyph colour, both glyph-pixel tests failed; the code was restored byte for byte.
  - Visual review (screenshots, light and dark, Number and Date mode, 25%, 100% and 400%, the panel at 375 and 768 px): the bands read as faint cards with the hairlines in the gaps between them; the space above shorter Date groups stays unshaded. The 4-unit gap is about 3–4 px at 100% and under 1 px at 25%, where the bands nearly merge.
  - Before the revision (first scope): 569 unit tests (568 passed in the full run, the unrelated `scripts/git/sync-main.test.mjs` timeout passing alone) and 132 browser tests passed, with negative controls for `relative` and `pointer-events-none`.
- **Next action:** none.

### UI-10: Screen-only annotations

- **Status:** not started.
- **Scope and acceptance:** G §5.3 and the annotation parts of §8, Stage 5. Approved for evaluation; implemented only if the evaluation supports it.
- **Combined phase (2026-10-31):** part of phase 8, "Viewer refinement and annotations", with UI-13, on one shared branch (section A). UI-13's viewer and zoom refinement comes first, so the annotations are not reworked for new positioning, scaling, interactions, responsive behaviour and accessibility. The phase follows UI-09.
- **After UI-13 (2026-11-01):** UI-13's detailed scope is approved (its entry). The annotations build on its viewer: the zoom and the scroller it exposes, and a fixed scale of 1 CSS pixel per SVG unit at 100%, so a tier's position follows from the zoom alone. At 1280 px the centred slab leaves about 150 px of stage at each side at 100%, and none at 375 px. Candidates to evaluate, not approved: the third concept's margin `20ⁿ` labels and its per-tier digit values, with a setting to show or hide them. Its Long Count period names as tier labels (e.g. "Hablatun", "K'in") are rejected: they would make unsupported calendar claims (G §2, §10.1).
- **Update (2026-11-01, plan-change log):** the basic tier-direction indicator (the orientation chip) moves to UI-13 as slice 5b. The annotations are initially desktop-oriented, since phone widths leave no room beside the slab; their responsive behaviour is revisited against the refined viewer, not decided. From the UI-13 investigation (prototype measurements): at 100% the stage leaves about 77 px beside the slab on each side at 1024 px, 152 px at 1280 and 1440 px and 161 px at 1600 px, and a gutter needs about 40–48 px. Gutters outside the zoom wrapper, of equal width on both sides, would keep the slab centred and leave the SVG and its export unchanged; showing or hiding them changes the stage's content rather than the scroller's size, so it needs its own re-anchoring.
- **Approved decision (2026-11-01):** the per-tier value beside each tier is the tier's base-20 digit (0–19), not its full decimal contribution.
- **Next action:** evaluate a restrained annotation design against the refined viewer, after UI-13's review checkpoints.

### UI-11: Export controls in the redesigned workspace

- **Status:** not started.
- **Scope and acceptance:** G §6 and the export parts of §8, Stage 6.
- **Known limitation to resolve (from UI-13, 2026-11-01):** the floating Export trigger covers the bottom-right corner of UI-13's viewer stage (from `sm`, its band 64–104 px from the bottom of the screen; below `sm`, 16–56 px). UI-11 must resolve this overlap, not move it onto other content. This includes the case measured in UI-13's slice 4 review: in Date mode at 200%, with the stage scrolled fully to the bottom-right, at 1280 × 720 and 1280 × 800, the trigger partly covers the year's units glyph (UI-13's entry). UI-13's planned sticky viewer (slice 5e) must be validated against this trigger and against UI-11's eventual solution.
- **Next action:** define the detailed scope when the task is reached, after UI-10 (section C, "Proposed sequence"). It must include resolving the known Export-trigger overlap above, including the Date-mode 200% case, and account for UI-13's planned sticky viewer (slice 5e).

### UI-12: Educational explanations

- **Status:** not started.
- **Scope and acceptance:** G §4.9 and §8, Stage 7, including whether the date mode needs a short explanatory note.
- **Glyph key and glyph legend (2026-11-01, plan-change log):** the compact visual glyph key under the viewer stage (Shell = 0, Dot = 1, Bar = 5), drawn with the actual glyph components, is part of UI-13 as slice 5c, not of this task. UI-12 remains responsible for the broader educational glyph-legend feature, separate from that key, which stays the section D proposal "Glyph legend", a possible format for this task; its Maya names for the glyphs would need sources.
- **Next action:** define the topics and sources when the task is selected.

### UI-13: Viewer interaction polish

- **Status:** in progress. The detailed scope was approved on 2026-11-01, after read-only investigations of the viewer and of design concepts 3 and 4 (plan-change log). Slices 1 to 4 were merged into `main` from the branch `feat/ui-13-viewer-refinement` (pull request #25, merge commit `bbb8187`); slice 3 was reviewed and approved, and slice 4's review items are closed (below). Slice 4.1 was merged into `main` from the branch `feat/ui-13-resize-anchoring` (pull request #26, commit `bf48b08`, merge commit `a470a64`) (below). Slice 5a is implemented and validated on the branch `feat/ui-13-viewer-header-toolbar`, uncommitted, pending review (below). Slices 5b–5e are planned (below), not implemented.
- **Progress (2026-11-01):**
  - **Slice 2, structure:** the stage box (`data-numeral-stage`), the explicit scroller reference for the place tier guides (`scrollerRef`), the marked backdrop (`data-numeral-backdrop`), and the viewer's width cap moved from `MayanExportPanel` into `NumeralViewport`. No visual change.
  - **Slice 3, scale, centring and anchoring:** `NumeralViewport` takes the numeral's logical width (`numeralWidth`, from `getNumeralSize`) and sizes the zoom wrapper at that many CSS px times the zoom level, centred with automatic margins. A new numeral and Reset go to the top, centred horizontally, before paint. Zooming keeps the point at the viewer's centre, measured in the numeral's own coordinates against the zoom wrapper's box. The stage box is unchanged: its dimensions, padding and clip stay in slice 4.
  - **Validation (slice 3):** `npm test` (617 tests), `npm run lint` (no errors; 4 existing warnings in `useElementOnScreen.ts`), `npm run build` and `npm run test:e2e` (155 tests) passed. New browser tests: 350 CSS px at 100% at 320–1440 px in Number and Date modes; exact width and height at all eight levels with no page-level horizontal overflow at 320 and 1280 px; centring when narrower; the centre in view at the start when wider; the top for a new numeral and after Reset; the anchor while wider and narrower than the viewer; and no drift over five zoom cycles. Scroll positions are whole pixels in Chromium, so the anchor holds within 1 CSS px per zoom step.
  - **Slice 4, stage and slab:** the viewer's 384 px cap and canvas surround are removed; the stage (the scroller) spans the viewer card's content, at the provisional heights (the `numeral-stage-height` utility in `src/index.css`, with its `vh` fallback under `@supports not (height: 1svh)`, since the minifier drops a plain duplicate declaration), as an inset panel: `canvas`, a `line` border, `shadow-inner`, `rounded-md` and `scrollbar-themed`. The stage box is a flex box at least the scroller's size, as large as the slab and its 16 px padding (`w-max min-w-full min-h-full p-4`), with `overflow: clip`. The slab (the zoom wrapper) is centred both ways with automatic margins, which become 0 where it does not fit, so a long or wide numeral starts at the padding and stays wholly reachable; it is never shrunk (`shrink-0`), and has a `ring-1 ring-line` edge and `shadow-sm`, recorded in `docs/DESIGN_SYSTEM.md`. `NumeralViewport`'s `maxHeight` prop is removed. The anchoring helpers are unchanged: they measure the slab's own box, so the padding and centring margins do not shift the anchor. The renderer, exports and tier guides are unchanged.
  - **Measured (slice 4, implementation):** the stage heights match the expected values at all six screen sizes (448, 520, 620, 400.2, 480 and 340.8 px), and the stage is 686 px wide at 1280 and 1440 px, 311 px at 375 px and 256 px at 320 px. From `lg`, the stage's top is at 254 px, not the prototype's 246 px, so the offset by the original recipe would be about 18rem; with 17.5rem the viewer card still ends within the screen at 1280 × 720 (718 px), 1280 × 800 (790 px) and 1440 × 900 (890 px), 2–10 px from its bottom instead of about 18 px. The offset is kept for slice 5, which moves the stage again and measures it once more.
  - **Validation (slice 4):** `npx vitest run src` (23 files, 561 tests), `npm run lint` (no errors; the same 4 warnings), `npm run build` and `npm run test:e2e` (160 tests) passed. `npm test` also runs the Git workflow scripts' tests, outside this slice; 9 of them timed out under load in one run and were not run again. New and updated browser tests: the stage height at the six screen sizes, unchanged at 25%, 100% and 400%, with no page-level horizontal overflow and, from `lg`, the card within the screen; a short numeral centred both ways in Number and Date modes, also at 400% while wider than the stage; the 99-tier numeral scrolled from its first tier to its last, with 16 px of padding at each end; the zoom anchor with the padding, each step within 1 px of the centre point and at least 3 px from where a share of the scrollable area would put it, horizontally (320 px, 200–400%) and vertically (1280 px, 25–100%); and the Export trigger clear of the zoom controls and, at 100% and 400%, of the glyphs (below). Page Down passed 12 repeated runs in parallel with the stage's opaque `canvas`, which slice 2 had avoided after intermittent failures.
  - **Export trigger (slice 4):** below `sm`, at 375 × 667, 375 × 812 and 320 × 568, with the viewer's controls scrolled to the top of the screen, the controls and the whole stage are above the trigger. From `lg`, at 1280 × 720 and 1280 × 800, it covers the stage's bottom-right corner (as recorded for UI-11), but no zoom control and no glyph in the tested configurations: Number and Date modes, at 100% and at 400% scrolled to the bottom-right corner. Other zoom levels are not tested. The slice 4 review measured one exception: at both screen sizes, in Date mode at 200% with the stage scrolled fully to the bottom-right, the trigger partly covers the year's units glyph (15 × 17 px at 1280 × 720, 15 × 28 px at 1280 × 800). The stage cannot scroll it clear, but scrolling the page uncovers it, so the glyph stays reachable. This overlap is unresolved and remains assigned to UI-11.
  - **Resize (slice 4, measured, not changed):** a resize keeps the scroll position, not the point at the centre: the view stays wholly scrollable, with no page-level overflow, and returns exactly when the size does. The centre point shifts by half the change in the stage's size: at 400%, from 1280 to 375 px, by 188 CSS px (47 SVG units); a numeral shown centred at 1280 px shows its left part at 375 px (138.5 instead of 175 units) and at 320 px (111). Keeping the centre point on resize, e.g. with a `ResizeObserver` on the scroller, is proposed for review, not implemented.
  - **Slice 4 review closure:** the last identified wording issue is corrected: the browser test's comment about the Export trigger said it covers "never the controls or a glyph"; it now says that it does not overlap the zoom controls or glyphs in the tested desktop configurations (100% and 400%). No assertion changed. The Export trigger's overlap, including the Date-mode 200% case above, is not resolved and stays assigned to UI-11.
  - **Slice 4.1, resize anchoring (implemented and reviewed, 2026-11-01; merged in PR #26):** `NumeralViewport` keeps an intended view: the numeral's start, or a point in the numeral's own coordinates. The user's scrolling, a zoom, Reset and a new numeral set it. A `ResizeObserver` on the scroller's content box shows it again, instantly, when the scroller's size changes, so the point at the centre stays in place both ways; a position the browser clamped during a resize never replaces it, so the view returns when the size allows. After each of its own scrolls the viewer records where the browser put it, and a scroll event that finds it there (within 1 CSS px) is not taken for the user's; a report at the size already shown is skipped, and the viewer does not scroll when already in place. A zoom still keeps the point visible at the centre, as approved for slice 3, also where a resize has clamped the intended view, and that point becomes the view to keep; zooming around the clamped, unseen point was tried and rejected after an existing browser test caught it: in slice 4's test of the anchor with the stage's padding, at 1280 × 800, the vertical step from 25% to 50% left the centre point 243 CSS px from its target, against a 1 px tolerance. No visual change; the renderer, exports and tier guides are unchanged.
  - **Validation (slice 4.1):** `npx vitest run src` (23 files, 573 tests), `npm run lint` (no errors; the same 4 existing warnings in `useElementOnScreen.ts`), `npm run build` (TypeScript and the production build) and `npm run test:e2e` (164 tests) passed. `npm test` was not run, as it also runs the Git workflow scripts' tests. New unit tests (12) use a simulated layout, since happy-dom has none: clamping, the stage's padding and centring, device-pixel rounding and scroll events and resize reports sent by the test. New browser tests (4): the point kept through 1280 → 375 → 320 → 1440 → 1280 px at 400%, with no page-level overflow; the start of a new numeral and after Reset; a point scrolled to after a correction, and a return from a clamped position (sequential, not a race); and repeated resizes at 150% device scaling without drift. Each part of the logic was disabled in turn and at least one unit test failed; without the correction, all four browser tests failed.
  - **Accepted limitation (slice 4.1 review):** a genuine user scroll in the same frame as a resize, before the resize is reported, cannot be told from the browser's clamping: it is ignored, and the resize correction then undoes it, returning to the previous intended view. The user's next scroll is followed as usual. Accepted in the read-only review as rare (the stage height uses `svh`, so mobile toolbars do not resize it); distinguishing the two would risk taking the browser's own scroll anchoring for the user's.
  - **Manual verification still needed (slice 4.1):** classic scrollbars appearing or disappearing, and fractional scroll positions at Windows display scaling of 125–150%, in headed Chrome or Firefox. Headless Chromium uses overlay scrollbars and reported whole-pixel positions even at 150% device scaling, so both are covered by the simulated unit tests only.
  - **Slice 5a, viewer header and toolbar (implemented and validated, 2026-11-02; pending review):** the viewer's heading is "Mayan Numeral Stack", with a new local `ViewAgenda` icon (Google Material Icons' `view_agenda`, from the same source and licence as `Layers`), with and without a result. `NumeralViewport` takes an optional `header`: a row above the hint and the scroller, outside the scroller, with the heading first and the "Zoom controls" group beside it (`flex flex-wrap items-center justify-between`), or on its own line under it where both do not fit; without `header`, the row has the controls only. The controls are, in order, Zoom out, the percentage, Zoom in, a decorative `aria-hidden` separator and Reset, in one row that never wraps; the percentage stays the polite live region, now a fixed-width (`w-12`), centred, tabular readout, so no control moves between zoom levels. The zoom state, steps, limits, accessible names, `aria-disabled`, shortcuts and tab order (Zoom out, Zoom in, Reset, then the viewer) are unchanged, as are the zoom and resize anchoring code, the renderer and the exports. `MayanExportPanel` loses its `mt-6`, which would otherwise have put space above the header; its export code is unchanged. The stage is 12 px under the header row (`space-y-3`).
  - **Measured (slice 5a, implementation, headless Chromium: the wrapping and stage positions were measured on the dev server, then confirmed by the browser tests against the production build):**
    - **Wrapping:** the heading is 207.6 × 28 px and the controls 187.5 × 30 px, so one row needs 407.1 px of card content: one row from a 472 px wide screen, including 1024 px (536.7 px of content) and 768 px (704 px); below 472 px the controls go under the heading, at 320 px (256 px of content) and 375 px (311 px). This corrects the investigation's estimate of wrapping at 1024 px. The buttons are 27.6 × 30 px (Zoom out, Zoom in) and 51.3 × 30 px (Reset).
    - **Stage position:** the stage's top is 58 px below the card's top where the header is one row (it was about 106 px, derived from slice 4's measured 254 px on the page; not re-measured), and 94 px where it wraps. On the page: 206 px at 1280 × 720, 1280 × 800 and 1440 × 900 (it was 254 px); 526 px at 375 × 667 and 375 × 812; 564 px at 320 × 568, all with the page at the top. From `lg` the card now ends at 670 px at 1280 × 720 (was 718), 742 px at 1280 × 800 and 842 px at 1440 × 900, 50–58 px above the bottom of the screen. The 17.5rem offset is kept, so the stage heights are unchanged (approved for this slice); by the original recipe (the stage's top, the card's 16 px padding and about 18 px of space) the offset would now be about 15rem. Slice 5d replaces the `lg` height.
  - **Validation (slice 5a):** `npx vitest run src` (23 files, 578 tests), `npm run lint` (no errors; the same 4 existing warnings in `useElementOnScreen.ts`), `npm run build` and `npm run test:e2e` (172 tests) passed. `npm test` was not run. New unit tests (5): the header row's order and position above the hint and the viewer, the controls' order with the live, fixed-width readout and the `aria-hidden` separator, the tab order, the viewport without a header, and the heading and its icon (not `Layers`) with and without a result. New browser tests (4): the header row at the six approved sizes and at 1024 × 768 and 768 × 1024 (within the card's content box, one row exactly where it fits, otherwise wrapped under the heading, the controls in one row with buttons of at least 24 × 24 px, the stage 12 px below with unchanged heights, no page-level horizontal overflow, the card within the screen from `lg`); the controls in place at all eight zoom levels at 1280 and 320 px; the tab order and shortcuts; and the point at the viewer's centre kept at 400% while the header wraps and unwraps (768 ↔ 375 and 320 px). Deliberate updates: the heading's name, and the tests that found the viewer card as the heading's parent now find the nearest card around it; the heading-font list includes the new icon. Screenshots in both themes at the six sizes were taken (12); two were reviewed: light at 1280 × 800 and dark at 320 × 568.
  - **Remaining:** slices 5b–5e, as planned below, and optionally slice 6.
- **Scope and acceptance:** G §8, Stage 8, as approved on 2026-11-01 (below). Ctrl + scroll zooming was evaluated and is not implemented: Ctrl + wheel stays the browser's.
- **Combined phase (2026-10-31):** part of phase 8, "Viewer refinement and annotations", with UI-10, on one shared branch (section A), and implemented before UI-10. The phase follows UI-09 and comes before UI-11 and UI-12.
- **Supersedes:** UI-04's "the viewer keeps its 480 px maximum height and the meaning of 100% zoom" (plan-change log).
- **Maximum numeral:** 128 digits, 99 tiers (UI-07): an SVG of 350 × 7,920 units in Number mode. Date mode's three groups are also 350 units wide.
- **Approved decisions (2026-11-01):**
  - **Direction:** the third design-reference concept's viewer: a full-width stage, a centred slab, a viewer header with a compact zoom toolbar, and a bounded viewer height. The existing 5/7 workspace grid and card order stay (UI-04).
  - **Unchanged artwork:** the numeral renderer, glyph geometry, group width (350 units), BigInt conversion and exported SVG and PNG artwork are unchanged. Glyphs keep their place at the bottom of each tier.
  - **Scale:** 100% zoom is 1 CSS pixel per SVG unit at every viewport width, so a Number-mode numeral is 350 px wide at 100%. The numeral is never shrunk to fit: where the stage is narrower, the viewer scrolls sideways, without page-level horizontal overflow.
  - **Zoom steps:** the existing eight, from 25% to 400%, unchanged.
  - **Position:** a new numeral and Reset go to the top, centred horizontally. Zooming keeps the point at the viewer's centre in place, measured in the numeral's own coordinates, so it also holds while the numeral is narrower than the stage.
  - **Stage:** the semantic `canvas` token, the backdrop the tier guides' colours already assume (`VIEWER_BACKDROP`), kept as their single source. The slab is centred horizontally, and vertically while it is shorter than the stage, and has a subtle screen-only edge and shadow for each theme, never in the SVG.
  - **Toolbar:** in the viewer header, beside the `h2`, wrapping under it only where there is no room: Zoom out, the percentage, Zoom in, then Reset. The percentage stays a separate, non-interactive readout in the existing polite live region; Reset stays a separate button. Accessible names ("Zoom out", "Zoom in", "Reset"), `aria-disabled` at the limits, the tab order and the + − 0 shortcuts while the viewer has focus are unchanged. Buttons are compact, at least 24 × 24 px (WCAG 2.2, 2.5.8).
  - **Interactions:** wheel, Ctrl + wheel, browser zoom, touch scrolling and scroll chaining to the page stay native. No pinch zoom and no fullscreen.
  - **Settings:** the settings-panel redesign and material presets stay in UI-15. UI-13 does not remove, move or change any settings control.
  - **Animation (optional final slice):** zoom changes commit the final width and anchored scroll position at once, then animate a transform from the previous visual scale to none, for 140 ms with ease-out ("Option B"). Skipped entirely, with no transform, when reduced motion is preferred. It may be dropped at its review checkpoint without affecting the other slices.
- **Viewer structure (approved for implementation):** the scroller (the focusable "Numeral viewer" group, fixed height, `canvas`) contains a stage box (`overflow: clip`, at least as large as the scroller, as wide as its content, with padding), which contains the zoom wrapper (`relative`, centred with automatic margins), which contains, in order, the underlay, the SVG and the overlay, as today. The stage box contains the whole numeral, so `overflow: clip` clips only what a transform draws outside it, never the numeral's layout; it is not a scroll container, so scrolling stays with the scroller. The viewer's width cap moves out of `MayanExportPanel`, which keeps the export work.
- **UI-09 contracts:**
  - **Hover:** `PlaceTierGuides` currently treats `wrapper.parentElement` as the scroller. With the stage box in between, it must receive the scroller explicitly, with a test that fails without it.
  - **Underlay:** the underlay, SVG and overlay stay siblings in the zoom wrapper, in that order, so the screen-only rule in `src/index.css` keeps working.
  - **Backdrop:** the browser test that reads the backdrop colour from `.mep-svg-wrapper` reads it from the stage's marked element instead.
  - **Unchanged:** the guides' geometry, colours, hover and screen-only status.
- **Stage height (approved as the provisional starting point):**
  - Below `lg`: `clamp(18rem, 60svh, 30rem)`, with a `vh` fallback where `svh` is unsupported.
  - From `lg`: `clamp(28rem, calc(100svh - 17.5rem), 45rem)`.
  - The height does not change with zoom. The 17.5rem offset was measured without the new viewer header: the stage's top at 246 px, plus the card's 16 px bottom padding, plus about 18 px of space. It must be measured again once the header and toolbar exist, and the values adjusted if needed. These values are a starting point, not an exemption from the viewport checks below.
  - Planned (2026-11-01): from `lg`, slice 5d replaces this fixed height with a hybrid model sized from the numeral's unzoomed height; below `lg`, these values stay initially (planned slices, below).
  - Expected values with the provisional formula: 1280 × 720, 448 px (the minimum; the card ends at about 710 px); 1280 × 800, 520 px; 1440 × 900, 620 px; 375 × 667, 400 px; 375 × 812, 480 px (the maximum); 320 × 568, 341 px.
- **Acceptance:** G §8, Stage 8, and:
  - At 1280 × 720, 1280 × 800, 1440 × 900, 375 × 667, 375 × 812 and 320 × 568, in both themes: the stage height stays the same at every zoom level; a short numeral is centred; the complete 99-tier numeral scrolls vertically from its top tier to its bottom tier without clipping; there is no page-level horizontal overflow; and the viewer card fits the screen where the provisional values say it does.
  - At 100%, the SVG is 350 CSS px wide at every viewport width, and the zoom steps scale it exactly.
  - Zooming keeps the viewer's centre point in place, including while the numeral is narrower than the stage. A new numeral and Reset show the top, centred horizontally.
  - The tier guides stay aligned at 25%, 100% and 400% and while scrolling, and their hover stays accurate.
  - The SVG and PNG exports are identical before and after zooming and scrolling, at every stage size.
  - Export stays reachable with the result off-screen (G §6). Essential viewer content and controls stay reachable, particularly on mobile, despite the Export trigger's overlap (known limitations, below).
  - The toolbar's controls are keyboard-accessible, with the shared focus ring, and wrap without overflow at 320 px.
  - If the animation slice is implemented: no transform when reduced motion is preferred; the scroll extent stays the same throughout the animation; the anchor holds when an animation is interrupted by another zoom; hover stays accurate.
- **Implementation slices,** each its own commit with a review checkpoint after it (section A):
  1. **Roadmap:** this approved scope.
  2. **Structure, without visual change:** the stage box, the explicit scroller reference for the tier guides and the marked backdrop.
  3. **Scale, centring and anchoring:** 1 CSS pixel per SVG unit at 100%, the starting position and the zoom anchor.
  4. **Stage and slab:** the full-width stage at the provisional heights, the centred slab and its edge and shadow (recorded in `docs/DESIGN_SYSTEM.md`).
  5. **Viewer header and toolbar,** then the stage height's offset measured again. Revised on 2026-11-01 into slice 4.1 and slices 5a–5e (below).
  6. **Optional: the zoom animation.**
- **Planned slices (2026-11-01):** the approved working direction after a read-only investigation of the header, a tier indicator, a glyph key, the stage height, a sticky viewer and resize anchoring (plan-change log). Slice 4.1 is merged (PR #26; Progress, above); slice 5a is implemented, pending review (Progress, above); slices 5b–5e are not implemented. Each slice is its own commit with a review checkpoint, and stays subject to review and adjustment. Order: section C, "Proposed sequence".
  - **Slice 4.1, resize anchoring,** before any further viewer layout change, so that the later slices' size changes keep the viewed point by construction:
    - When the scroller's content-box size changes, the intended viewed point is kept, horizontally and vertically.
    - A new numeral and Reset return to the intended start position (the top, centred horizontally); a zoom keeps its intended target point; user scrolling updates the intended anchor.
    - Programmatic scrolling must not be mistaken for user scrolling. Browser scroll clamping, fractional scroll positions (e.g. at 125% or 150% display scaling), rapid repeated resizing and classic scrollbars appearing or disappearing are handled. The anchor stays the intended point, never the clamped position.
    - Stale corrections must not override later user scrolling (e.g. scroll events caused by clamping during a resize), and there are no observer loops or unnecessary corrections.
    - No visual change, and no change to the SVG rendering or exports. Independently reviewable and tested.
  - **Slice 5a, viewer header and toolbar:**
    - The viewer heading becomes "Mayan Numeral Stack", with an existing Material-style icon, preferably a `view_agenda`-style icon, never the base-20 card's `Layers`.
    - The zoom state stays private to `NumeralViewport`. A header slot lets HomeView supply the heading while `NumeralViewport` renders the toolbar beside it.
    - Toolbar order: Zoom out, the percentage, Zoom in, a separator, Reset. Zoom behaviour, accessible names, keyboard shortcuts, disabled states and the live region are unchanged.
    - Wraps responsively down to 320 px without horizontal overflow (investigation estimate: one row from 1280 px; wrapping at 1024 px and on phones. Measured in the implementation: one row from a 472 px wide screen, including 1024 px; wrapping on phones only. Progress, above).
    - The stage offset is measured again once the header exists.
  - **Slice 5b, tier-direction indicator** (moved from UI-10):
    - Derived from the existing numeral data (the tallest group's tier count), reusing `toSuperscript`, without duplicating tier arithmetic. Groups are bottom-aligned, so the rows have the same powers in both modes.
    - Several tiers show the physical orientation, e.g. `Top: 20² ↓ Bottom: 20⁰`; a single tier a compact form, e.g. `1 tier · 20⁰`. Suitable screen-reader text, as for the tier badge.
    - The base-20 card's tier badge keeps its ascending range (e.g. `20⁰–20²`): the mathematical range and the viewer's physical orientation serve different purposes.
  - **Slice 5c, compact glyph key** (moved from UI-12, which keeps the broader glyph legend):
    - Shell = 0, Dot = 1, Bar = 5, beneath the viewer stage, with accessible text labels; compact and responsive.
    - Draws the actual `ShellGlyph`, `DotGlyph` and `BarGlyph` components, keeping their shapes and proportions, outside `exportRef`, so the exported SVG and PNG artwork and geometry are unchanged.
  - **Slice 5d, stage height refinement:**
    - From `lg`, initially, a hybrid model: `clamp(256px, numeralHeightAt100Percent + 34px, maximumStageHeight)`, from the numeral's unzoomed (100%) height, so the stage height never changes with zoom. The exact CSS and maximum come from the existing architecture and fresh measurements.
    - The stage stays separate from the slab; the SVG's intrinsic size and glyph geometry are unchanged. Short numerals leave less empty space; long numerals stay vertically scrollable.
    - Below `lg`, the existing fixed heights stay initially, so the page does not move while a number is entered.
    - The maximum is calculated again after the header and glyph key, accounting for the viewport, card header, toolbar, stage padding and glyph key. Overlay and classic scrollbars are both validated (the investigation's headless Chromium had overlay scrollbars only). `scrollbar-gutter: stable both-edges` is not introduced without demonstrated need.
  - **Slice 5e, conditional sticky viewer on desktop:**
    - The viewer card itself, initially `lg:sticky lg:top-4`, and only where the viewport is tall enough for the whole card; that minimum height comes from the final card's measurements.
    - It stops at its grid area, never overlapping the footer or later content; the stage keeps its own scrolling; no further page-level scroll container, horizontal overflow or layout jump. Below `lg` the viewer stays non-sticky.
    - Validated against the floating Export trigger and UI-11's eventual changes.
    - Depends on the UI-07 prerequisite below.
  - **Prerequisite, separate from UI-13 (UI-07 breakdown layout):** with the 99-tier breakdown open, the page's height grows far past the footer (about 5,300 px at 1280 × 800 in the investigation, against about 1,760 px with the breakdown open once fixed; about 1,450 px is the height with it closed). The likely cause is the absolutely positioned `sr-only` spans of `PowerOf20` in the breakdown's rows, which escape its scrolling box. To do separately, as its own bugfix: confirm the cause against the implementation, find a minimal correction that keeps the spoken text, keep it out of UI-13's commits and leave the rest of UI-07 unchanged. If it is confirmed to affect the containing layout, it is fixed and validated before slice 5e.
    - **Fixed and validated (2026-11-02), on the branch `fix/ui-07-breakdown-page-height`; merged in PR #27 (commit `d1861fb`, merge `bbc1b1c`):** the cause is confirmed. Tailwind's `sr-only` is absolutely positioned, and neither the breakdown's nor the formula's scrolling box was positioned, so the visually hidden text of the rows (`PowerOf20`, and compact subtotals) took its containing block outside the box: the fade-in's wrapper, whose kept transform makes it one, or else `<body>`. It kept its unscrolled position and stretched the page to the last row's: with the breakdown open, 5,306 px instead of 1,761 at 1280 × 800, 4,732 instead of 2,387 at 768 × 1024 and 7,400 instead of 2,495 at 375 × 667. The formula's spans escaped too, but ended above the footer. Both boxes are now `relative`; the spoken text, `PowerOf20` and `Subtotal` are unchanged. New browser tests check, at the three sizes, that the page ends at the footer with the 99-tier breakdown closed, opened, closed again and shown again already open (after invalid input, without the fade-in), and that both boxes contain their hidden text; and the same with a 1-digit and a 20-digit number at 1280 × 800.
  - **Investigation evidence (2026-11-01, prototype measurements, not validation):** the production build served from a temporary directory, with the stage's height and the card's position changed in the running page only.
    - Hybrid model (256 px minimum): the stage was 256 px for 1 and 2 tiers, 274 px for 3 tiers and Date mode, and 434 px for 5 tiers, at every zoom level; 12 and 99 tiers reached the maximum. A stage following the zoomed numeral instead changed by up to 426 px between 25% and 400% (2 tiers at 1440 × 900), and was not adopted.
    - Sticky card (`top: 16px`) with the 99-tier breakdown open: stuck from a 200 px page scroll and stopped exactly at the bottom of the left column, never over the footer, without horizontal overflow. Once stuck, the card ended 30–38 px above the Export trigger at 1280 × 720, 1280 × 800 and 1440 × 900; at the top of the page the overlap remains (UI-11).
- **Out of scope:**
  - **UI-15:** the settings-panel redesign and material presets.
  - **UI-10:** power annotations and their setting (the orientation chip moved to slice 5b).
  - **UI-11:** moving the export controls and resolving the Export trigger's overlap.
  - **UI-12:** the broader educational glyph legend (the compact key moved to slice 5c).
  - **Not planned:** renderer and glyph geometry changes, fullscreen and pinch zoom.
- **Known limitations:**
  - **Export trigger:** the floating Export trigger covers the stage's bottom-right corner. From `sm` its band is 64–104 px from the bottom of the screen, which at 100% is mostly empty stage beside the centred slab; below `sm` it is 16–56 px from the bottom. Recorded for UI-11, which must resolve the overlap (its entry).
  - **Narrow phones:** at 320 px the stage is about 256 px wide, so at 100% the centred view of a 350-unit numeral leaves about 47 px of each edge out of view; in Date mode, part of the day group, until the user scrolls or zooms out. This follows from the approved scale.
- **Prototype evidence (2026-11-01).** These are prototype measurements, not validation of the implementation. Method: the production build, served from a temporary directory outside the repository, with the 99-tier numeral (128 nines) and both tier guides on. The approved scale and structure were simulated by changing the running page's DOM only. Limitations: headless Chromium with software rendering; CPU throttling (4× and 6×) at 375 px as a proxy for a phone; graphics memory not measured; single runs, with several milliseconds of run-to-run variation.
  - **Zoom levels, at 1280 × 800:**

    | Zoom | Numeral (CSS px) | Layout after a zoom change | Scroll frames: median / 95th percentile |
    |---|---|---|---|
    | 25% | 88 × 1,980 | 3.7 ms | 16.8 / 18.6 ms |
    | 100% | 350 × 7,920 | 3.8 ms | 16.7 / 18.4 ms |
    | 250% | 875 × 19,800 | 3.0 ms | 16.7 / 19.4 ms |
    | 300% | 1,050 × 23,760 | 3.5 ms | 16.7 / 18.2 ms |
    | 400% | 1,400 × 31,680 | 3.1 ms | 16.7 / 19.5 ms |

    At 375 px with 6× throttling, scroll frames were 19–26 ms (median) and 41–48 ms (95th percentile) at every level, with no trend by zoom: 100% was as slow as 400%. The number of DOM nodes stayed the same at every level (2,333 with both guides, 2,134 without), and the JavaScript heap between 5 and 10 MB. 300 pointer moves over the guides took 19–32 ms at 1280 px. Nothing measured gave a reason to lower the 400% maximum.
  - **Zoom animation, 140 ms:**
    - **Width transition (Option A, rejected):** without correcting the scroll position on every frame, the centre point drifted 990–3,964 px. With the correction, frames were about 18 ms at 1280 px, but at 375 px with 4× throttling only 4–5 frames of 55–67 ms each, because the whole SVG is laid out again on every frame.
    - **Transform (Option B, approved as optional):** frame median 17 ms, also at 4× throttling, after a first frame that an instant zoom also has. The centre point moved at most 0.6 px, and 0.3–0.4 px when a second zoom interrupted the first.
    - **Scroll extent:** without a clip, a zoom-out animation enlarged the scroll extent from 7,920 px to 9,900–11,880 px. With the stage box's `overflow: clip`, every frame of 150→100%, 100→400% and 400→25% had exactly the final extent (7,952, 31,712 and 2,012 px, including 32 px of padding).
    - **Reach and grouping:** the top and bottom tiers stayed fully reachable, and the underlay, SVG and overlay stayed grouped.
    - **Hover:** the hovered card contained the pointer during the animation and after scrolling under it.
    - **Interruption:** an animation interrupted after 60 ms kept the same anchor to five decimal places.
    - **Reduced motion:** no transform was applied.
  - **Stage height:** at 1280 and 1440 px the stage was 686 px wide; at 375 px, 311 px wide, with 71 px of sideways scrolling inside the viewer at 100%; at 320 px, 256 px wide, with 126 px. There was no page-level horizontal overflow. The height was identical at 25%, 100% and 400%, a 1-tier numeral was centred both ways, and the 99-tier numeral scrolled from its first tier to its last.
- **Compatibility:**
  - **UI-09:** the contracts above.
  - **UI-10:** builds on the zoom and scroller UI-13 exposes, and on the space beside the centred slab (its entry).
  - **UI-11:** resolves the Export trigger's overlap, including the Date-mode 200% case (its entry).
  - **UI-12:** the broader glyph legend stays with UI-12 and section D; the compact key is slice 5c (its entry).
  - **UI-15:** the stage follows the theme and the slab follows the material, so the theme stays independent of the material. The slab's edge keeps light materials, such as Limestone `#FAF8F5` on the light `canvas` `#f6f1e7`, distinguishable from the stage. UI-15's approved decisions are unchanged.
- **Validation:** the standard checks (section C), the acceptance checks above, and screenshots at the six viewport sizes in both themes, in Number and Date mode, at 25%, 100% and 400%, with the guides on and off.
- **Next action:** review of slice 5a, then its commit and pull request; then slice 5b (section C, "Proposed sequence").

### UI-14: Final responsive, accessibility, regression and visual validation

- **Status:** not started.
- **Scope and acceptance:** G §8, Stage 9, and G §9. Their 500-digit references apply to the current maximum of 128 digits, 99 tiers (UI-07).
- **Next action:** run when all other tasks are completed or explicitly deferred.

### UI-15: Material presets and settings-panel refinement

- **Status:** not started. Scope approved on 2026-11-01, after a read-only investigation of the settings panel, the colour pickers and design concepts 3 and 4 (plan-change log); the section D item "Material colour presets" is now this task.
- **Order of work:** after the combined phase 8 (UI-13, then UI-10), on which it depends, and before UI-14's final validation. Its place relative to UI-11 and UI-12 is not yet decided; the proposed sequence of 2026-11-01 (section C) places it after UI-11, and its place relative to UI-12 stays open. Kept separate from UI-09, whose guide rendering it does not change.
- **Approved scope:**
  - **Material presets:** coordinated pairs; choosing one sets both the background and the glyph colour. The selected preset is visibly indicated. The catalogue, all opaque (alpha 1), with WCAG 2.x contrast between background and glyphs:

    | Preset | Background | Glyph | Contrast |
    |---|---|---|---|
    | Limestone (the new default) | `#FAF8F5` | `#14171D` | 16.93:1 |
    | Dark Stela | `#1D2026` | `#F2CA50` | 10.37:1 |
    | Obsidian Basalt | `#090B0E` | `#E8DFD1` | 14.92:1 |
    | Classic Paper | `#FFFFFF` | `#000000` | 21:1 |
    | Weathered Limestone | `#C7BC9F` | `#101319` | 9.85:1 |

  - **Swatches in both colour pickers:** the background picker shows the presets' background colours and the glyph picker their glyph colours, from the same single definition of the presets. A swatch changes only its own colour, never the other.
  - **Custom colours and active-preset detection:** any colour can still be chosen. The active preset is found by an exact match of the current background and glyph colours, as RGBA pairs, against the catalogue; no preset name is saved. A manual change to either colour that leaves the pair matching no preset makes the material Custom, and the custom colours are kept; a preset can be chosen again at any time. The existing `mayastack:backgroundColor` and `mayastack:glyphColor` keys stay the only saved source of the colours.
  - **New default, Limestone:** background `#FAF8F5` and glyphs `#14171D`, replacing white and black for users without saved colours. Saved colours are never overwritten. This changes those users' exported SVG and PNG appearance, as approved.
  - **Adaptive grid colour:** the grid's stroke adapts to the background instead of the fixed `#ddd` (G §5.1), which is faint on light backgrounds and dominant on dark ones. This changes the exported SVG and PNG appearance with the grid on, as approved.
  - **Settings panel:** the heading "Stela Material & Glyph Settings" with a tune-style icon, keeping UI-09's approved hierarchy of an "Exported appearance" group and a "Viewer guides" group.
  - **Colour-picker refinements:** accessible swatches with a visible selected state; focus-visible styling, including a visible focus indicator on react-colorful's saturation, hue and alpha sliders in the app's semantic `focus` colour token (section D); focus restored to the picker's trigger after Escape; and a readable colour and opacity value.
  - **Unchanged:** the application's light and dark theme stays independent of the material: changing the theme never replaces the chosen colours. The tier guides keep deriving their colours from the background. No new dependency.
  - **Not included:** "Surprise me", a random choice of material, deferred (section D).
- **To define in the detailed scope:** the adaptive grid colour's algorithm and contrast targets (its inclusion is approved); the panel's exact markup and styling within the approved direction; and whether a hex input accompanies the readable value, an implementation detail to evaluate.
- **Visual reference (2026-11-01):** the third design-reference concept's settings card (its heading with a tune icon, swatch groups side by side under small labels, and compact rows with the label on the left and the switch on the right) is a visual reference for this redesign. It is a reference only: not an approved specification of exact markup, and not a reason to remove or simplify existing controls, such as the colour pickers, Show Grid and the two viewer guides, which the concept does not show. The approved decisions above and the five presets are unchanged.
- **Next action:** define the detailed scope and acceptance criteria when the task is reached.

## D. Optional and deferred ideas

None of these are committed scope. Each needs a separate decision before implementation.

| Idea | Status | Notes |
|---|---|---|
| Alternative zero glyph | deferred | Needs artwork, attribution, licensing and rendering review (G §4.6, §10) |
| Long Count date mode | deferred | Needs its own research and specification (G §10.1) |
| Material colour presets | approved | Approved on 2026-11-01 as UI-15 (section C), with preset swatches in both colour pickers, a new Limestone default and an adaptive grid colour. The historical G §10 proposal remains unchanged |
| "Surprise me" material | deferred | A random choice from a curated set of readable material pairs, never arbitrary colours. Left out of UI-15 (2026-11-01) |
| Copy SVG code | proposed | Listed as not approved (G §10). Copies the SVG markup as text, so it could reuse `copyText` (`src/utils/clipboard.ts`); see the renderer copy and export options below |
| Separate Date tab | proposed | Listed as not approved (G §10) |
| Tier-count chip | approved | Approved and implemented by UI-07's tier badge on the base-20 card ("12 tiers · 20⁰–20¹¹"), merged in PR #22. The historical G §10 proposal remains unchanged |
| Glyph legend (dot = 1, bar = 5, shell = 0) | proposed | Seen in design references; to be reviewed separately. Update (2026-11-01): a compact key under the viewer stage is planned as UI-13's slice 5c; the broader educational legend stays with UI-12 and this proposal |
| Educational information cards | proposed | A possible format for UI-12; the explanations themselves are approved |
| Heading order (`h1` followed by `h3`) | approved | Part of UI-04: the section headings become `h2` |
| Emoji in visible labels and accessible names (such as `📦 Export`) | deferred | Reviewed with UI-04 and deferred |
| Theme menu Escape and arrow-key support | deferred | Reviewed with UI-04 and deferred |
| Harden the toast reduced-motion test | proposed | Follow-up noted in PR #14 |
| Date picker's clear button reachable with the keyboard | proposed | react-datepicker renders it with `tabIndex={-1}`; needs a replacement button in `DateInput.tsx`. Found during UI-03 |
| Lining figures in the headings | proposed | Playfair Display's default old-style figures lower the "20" in "Base-20 Representation". Found during UI-03 |
| A visible focus ring on the colour picker's sliders | approved | react-colorful shows focus only by enlarging the pointer. Found during UI-03. Approved on 2026-11-01 as part of UI-15 (section C) |
| Select the number on focus | proposed | Would let a click or Tab into the field replace the whole value. Not implemented: UI-05 removes redundant leading zeros instead. Found during UI-05 |
| Export trigger over the footer at the end of the page | proposed | Below 640 px, the floating trigger covers part of the footer's copyright line at the very end of the page, whenever there is a result, now also from the start because of the initial 0. Found during UI-05; see UI-11 |
| Decrement controls | deferred | From G §4.3. Left out of UI-06, which follows the third design-reference concept's add-only quick steps (2026-10-28). The Down arrow key still subtracts 1 |
| Stepper preset 8,000 | deferred | From G §4.3. Left out of UI-06 with the decrement controls (2026-10-28) |
| Custom increment | deferred | From G §4.3: a positive integer of up to 500 digits (the input's maximum, 128 since UI-07), validated with `validateNumberInput`. Left out of UI-06 (2026-10-28) |
| Copy the base-20 breakdown | proposed | A plain-text copy of the representation shown in the base-20 card, next to UI-07's Copy Formula. Text, so it can reuse `copyText`. Its format needs a decision. Added 2026-10-28 |
| Renderer copy and export options | proposed | Three distinct operations, to be decided separately: copying the SVG markup as text (as "Copy SVG code", which can reuse `copyText`); copying the rendered image to the clipboard where the browser supports it (`ClipboardItem` with an image, which needs its own helper and support checks rather than `copyText`); and downloading SVG or PNG files, which exists today and is reviewed in UI-11. Added 2026-10-28 |
| Date-mode base-20 presentation | proposed | Date mode keeps the "•" separator, the notation tooltip and exponents that screen readers read as plain digits ("15 × 200"), which UI-07 changed in Number mode only. To be revisited separately. Added 2026-10-29 |
| Faster analytical breakdown at the 500-digit limit | superseded | Opening it takes about 0.5 s at 500 digits, mostly the browser's layout of 385 rows (UI-07). `content-visibility` on the rows or virtualization could reduce it, and would need their own review. Added 2026-10-29. With the breakdown open, each step of the number also takes about 0.1 s at 500 digits, mostly rendering every row again (measured 2026-10-30); a memoized row component, so that only changed rows render, is the smallest proposed fix and needs approval. Update (2026-10-30): memoized rows and multipliers shown as "20ⁿ" were implemented in UI-07's second refinements; opening now takes about 0.25–0.35 s at 500 digits, and a step about 60 ms. Update (2026-10-31): the maximum is now 128 digits (99 rows), where opening takes about 0.1–0.16 s; nothing further is proposed. Closed (2026-10-31): superseded by the 128-digit maximum and the memoized rows of UI-07; the measurements above are kept as history |
| Lower maximum of significant digits | approved | 500 digits (385 tiers) was the maximum (`MAX_SIGNIFICANT_DIGITS` in `src/utils/numberInput.ts`); 50, 100 and 128 were measured (UI-07). Added 2026-10-30. Update (2026-10-31): 128 approved and implemented in UI-07's third refinements, with the README and tests; section G stays as first written |
| Fullscreen viewer | deferred | Seen in design-reference concepts 3 and 4. Left out of UI-13 (2026-11-01): the full-width, taller stage gives the numeral room without it |
| Pinch zoom in the viewer | deferred | Left out of UI-13 (2026-11-01): touch scrolling and browser zoom stay native |
| Glyphs centred vertically in their tiers | proposed | Glyphs sit at the bottom of each 80-unit tier (about 41–75 units), so the top half of a tier is empty; the third concept centres them. A renderer change that would change the exported artwork, so it was left out of UI-13 (2026-11-01) and needs its own decision |
| Export trigger over content while scrolling | proposed | The floating trigger can cover any content scrolled into its band, e.g. the breakdown disclosure's chevron at 768 px. UI-07 keeps keyboard focus clear of it with `scroll-padding-bottom`; a layout that never overlaps belongs to UI-11. Added 2026-10-30. Update (2026-10-31): UI-07 also reserves space below the content from 640 px, so the end of the page scrolls clear of the trigger; content still passes under it mid-scroll. Update (2026-11-01): it also covers the bottom-right corner of UI-13's viewer stage, a known limitation that UI-11 must resolve (UI-11 in section C) |

## E. Current progress and next task

- **Completed:** UI-01 (phase 0), UI-02 and UI-03 (PR #19), which completes phase 1, UI-04 (PR #20), which completes phase 2, UI-05 and UI-06 (PR #21), which complete phase 3, UI-07 (PR #22), which completes phase 4, and UI-08 (PR #23) and UI-09 (PR #24), which complete phase 5.
- **In progress:** UI-13: scope approved on 2026-11-01; slices 1 to 4 were merged in PR #25 (merge `bbb8187`) from `feat/ui-13-viewer-refinement`, with slice 4's review items closed. Slice 4.1, resize anchoring, was merged in PR #26 (merge `a470a64`) from `feat/ui-13-resize-anchoring`. The separate UI-07 breakdown layout bugfix, UI-13's prerequisite, was merged in PR #27 (merge `bbc1b1c`). Slice 5a, the viewer header and toolbar, is implemented and validated on the branch `feat/ui-13-viewer-header-toolbar`, uncommitted, pending review. Slices 5b–5e are planned, not implemented.
- **Blockers:** none.
- **Decided:** the Export trigger stays floating in UI-04; the presentation of the export controls is reviewed in UI-11. UI-13 and UI-10 form one combined phase, first on one shared branch, which ended with PR #25 (section A), after UI-09 and before UI-11 and UI-12 (section C, "Order of work"). UI-15, material presets and settings-panel refinement, is approved and comes after that phase; the proposed sequence (section C, 2026-11-01) places it after UI-11, and its place relative to UI-12 is not yet decided.
- **Next task: UI-13:** review, commit and pull request of slice 5a, the viewer header and toolbar; then slices 5b–5e (section C, "Proposed sequence", and UI-13's entry).

### Plan-change log

| Date | Change | Rationale |
|---|---|---|
| 2026-10-23 | Moved the roadmap from `docs/REDESIGN_ROADMAP.md` to `docs/plans/ui-redesign-roadmap.md`, added this tracker (sections A–F) with stable task IDs, and kept the approved requirements unchanged in section G. The old stage status table was replaced by section C, and its status values (Planned, In progress, Implemented, Verified, Deferred) by those in section A, where `completed` requires verified acceptance criteria. | One concise source of truth that a new session can resume from |
| 2026-10-23 | Split Stage 3 into UI-05 (initial value, Clear, significant-digit count) and UI-06 (Random, stepper presets, custom increment). | Two smaller, independently reviewable pieces of work |
| 2026-10-23 | Scheduled UI-08 (persistence, from Stage 6) before UI-09 (tier guides, from Stage 5). | Stage 5 must use the persistence mechanism that Stage 6 owns (G §4.7), so persistence has to come first |
| 2026-10-23 | Recorded the verified statuses: UI-01 and UI-02 completed (PRs #12 and #14), UI-03 not started. | Checked against the code, tests and Git history |
| 2026-10-25 | Adopted a branching policy (section A, "Branches and pull requests"): by default one branch and pull request per task. Approved exceptions: UI-05 with UI-06, and UI-08 with UI-09, each sharing one branch and pull request, with a review checkpoint after each task. Further groupings need the user's approval and an entry in this log. Task boundaries and acceptance criteria are unchanged. | Less overhead for closely related tasks, while keeping review per task, rollback per commit, and early merges for tasks that others depend on, such as UI-04 |
| 2026-10-26 | Recorded UI-03 as completed (verified on its branch, before the commit and PR), and added three proposals found during it to section D: a keyboard-reachable clear button for the date picker, lining figures in the headings, and a focus ring on the colour picker's sliders. | Checked against the acceptance criteria, the tests, the export comparison and screenshots; the proposals need separate decisions |
| 2026-10-27 | Recorded UI-03's merge (PR #19) and started UI-04 with the approved layout (UI-04 in section C): two columns from 1024 px, the floating Export trigger kept, the section headings as `h2`, and the emoji and theme-menu proposals deferred. | Approved after the UI-04 preflight, which compared the first design-reference concept with the existing layout |
| 2026-10-27 | Changed UI-04 to keep every card in place without a valid result, with an instruction in the viewer and the base-20 card and still no Export. The base-20 representation becomes its own card, between the input and the settings, as in the design reference. | Requested in the UI-04 review: a persistent workspace, which UI-05 can then fill with its initial value without panels appearing or disappearing |
| 2026-10-28 | Recorded UI-04 as completed (PR #20, commit `30edea2`, merge `8600117`), and started UI-05 on the shared branch `feat/ui-05-06-input-controls`. | Verified against the merged `main` and the UI-04 validation |
| 2026-10-28 | Extended UI-05's approved scope (UI-05 in section C): leading zeros typed or pasted before a valid integer are removed, so typing replaces the initial 0, and the Up and Down arrow keys add or subtract 1. Select-on-focus is recorded as a proposal (section D). Stepper buttons, presets, custom increments and Random stay in UI-06. | Approved after the UI-05 preflight, so that starting at 0 does not lead to values such as "05" |
| 2026-10-28 | Recorded UI-05 as completed (approved at its review checkpoint, commit `5408013`), and started UI-06 on the same branch. | Approved after the UI-05 review; its pull request is opened with UI-06's |
| 2026-10-28 | Revised UI-06's scope (UI-06 in section C): the number input follows the third design-reference concept's input card, which is recorded as its interaction reference (section B). Clear now empties the field instead of resetting it to `0` (superseding that part of G §4.1), and a separate Zero sets it to `0`. The quick steps are +1, +5, +20 and +400. Decrement controls, the 8,000 preset and a custom increment (G §4.3) are deferred to section D, not removed. Copy number is added, with a reusable plain-text clipboard helper. Section D gains proposals for copying the base-20 breakdown and for renderer copy and export options. Section G is unchanged. | Approved after the revised UI-06 investigation: a compact input matching the chosen design reference, with empty input and numeric zero kept distinct |
| 2026-10-28 | Capped Random at 10 significant digits, uniformly 1 to 10 (UI-06 in section C), instead of the 1 to 500 of G §4.2, which stays as first written. The input still accepts 500 digits, and the steps still reach the 500-digit maximum. | Requested in the UI-06 review: shorter random numbers are easier to read and compare |
| 2026-10-28 | Revised two design-system rules in UI-06 (UI-06 in section C): buttons and form fields are `rounded` instead of `rounded-md`, with the round and pill shapes and the selector's track kept; the number and date inputs draw the focus ring over their own boundary with a new `focus-ring-inset` utility, while buttons keep `focus-ring`. The four workspace cards have `p-4` instead of `p-6`. Section B and `docs/DESIGN_SYSTEM.md` §6–§7 were updated to match. | Requested in the UI-06 review: a tighter, more consistent shape, a focus ring that adds nothing around a field, and more room for content on small screens |
| 2026-10-28 | Recorded UI-05 and UI-06 as completed and merged together in PR #21 (commits `5408013` and `3e987b7`, merge `95af270`), which completes phase 3. UI-07 is the next task. | Verified against the merged `main` and the pull request's merge commit |
| 2026-10-28 | Approved UI-07's scope (UI-07 in section C) and started it on the branch `feat/ui-07-base20-breakdown`: in Number mode, a tier badge, the "Base-20 Expansion" formula with "+" and spoken exponents, Copy Formula in a fixed plain-text format, and a collapsible analytical breakdown table with thousands separators. The notation tooltip is removed in Number mode; Date mode is unchanged. Section G is unchanged. | Approved after the UI-07 preflight and its revisions, combining design-reference concepts 3 and 4 within the existing card |
| 2026-10-29 | Recorded that long breakdown values wrap anywhere rather than only after a separator (UI-07 in section C), and added two proposals to section D: the Date-mode base-20 presentation and a faster breakdown at the 500-digit limit. | Breaking only after separators took about 3 s to open at 500 digits; the approved fallback takes about 0.5 s |
| 2026-10-30 | Refined UI-07 at its review checkpoint (UI-07 in section C): a heading icon, the inset Positional Sum Formula panel, a full-width disclosure with fades, uppercase table headers, "Tier n", a centred Digit column and "20ⁿ = value" multipliers. Whether the breakdown is open is now kept by HomeView and survives Clear, invalid input and Date mode. The region names no longer repeat "Analytical breakdown". | Requested in the UI-07 review, following design-reference concept 3, and review findings M1 and L3 |
| 2026-10-30 | Refined UI-07 again at its review checkpoint (UI-07 in section C): a tinted disclosure with a down/up chevron, multipliers shown as "20ⁿ" with their exact values in a tooltip, fixed Tier, Multiplier and Digit columns, themed scrollbars, memoized rows, and keyboard focus kept clear of the floating Export trigger. Added two proposals to section D: a lower maximum of significant digits, measured but not changed, and the Export trigger covering content while scrolling. | Requested in the UI-07 review; the maximum stays 500 until a new value is approved |
| 2026-10-31 | Reduced the maximum to 128 significant digits (UI-07 in section C), superseding the 500 of G §4 and §9, which stay as first written; the README and tests are updated. Refined UI-07 a third time: compact subtotals with a power of ten and an exact-value tooltip, a tooltip without inner scrolling, and space reserved under the content for the floating Export trigger from 640 px. | Approved in the UI-07 review: 128 digits keep a googol and 2^256, with a readable breakdown and PNG exports well within their limits |
| 2026-10-31 | Refined UI-07 a fourth time (UI-07 in section C). Breakdown subtotals now break only after a thousands separator, replacing the "wrap anywhere" fallback of 2026-10-29. The compact notation (multiples of 3), the column widths and the tooltips' Tab stops were reviewed and kept, with the reasons recorded. | Requested in the final UI-07 polish pass; at 128 digits, breaking after separators has no measurable cost |
| 2026-10-31 | Fixed keyboard focus hidden under the breakdown's sticky header when tabbing backwards (UI-07 in section C), and marked the section D proposal "Faster analytical breakdown at the 500-digit limit" as superseded. | Found in the final UI-07 review; the 128-digit maximum and memoized rows already address the proposal |
| 2026-10-31 | Recorded UI-07 as completed and merged in PR #22 (commit `7e83681`, merge `be8a42a`), which completes phase 4, and marked the section D item "Tier-count chip" as approved, implemented by UI-07's tier badge. | Verified against the merged `main` and the pull request's merge commit |
| 2026-10-31 | Approved UI-08's and UI-09's scopes (their entries in section C) and started UI-08 on the shared branch `feat/ui-08-09-preferences-tier-guides`. All display preferences use separate keys with the `mayastack:` prefix, including the theme and grid keys, which were unprefixed; the old keys are not migrated and are ignored, superseding for them the "preserve existing settings" requirements of G §4.7 and §8 Stage 6, which stay as first written. `index.html`'s first-paint theme script moves to `mayastack:theme` in UI-08. Colours are saved as validated JSON RGBA, debounced at about 300 ms and flushed on unmount and page hide. Tier guides use the glyph colour at low opacity, are off by default, and have their own "Show Tier Guides" toggle in the viewer's controls. | Approved after the UI-08/UI-09 preflight: one consistent, namespaced scheme on the `apogouv.github.io` origin, which other projects share; backward compatibility with the unprefixed keys is explicitly not required |
| 2026-10-31 | Combined UI-10 (annotations) and UI-13 (viewer interaction polish) into one phase, 8 "Viewer refinement and annotations", on one shared branch (section A), with UI-13 implemented first. UI-10 now also depends on UI-13. The order of work becomes UI-08, UI-09, UI-13 with UI-10, then UI-11 and UI-12; their IDs, descriptions and dependencies are otherwise unchanged. The combined phase's detailed scope is defined when it is reached. | UI-13 includes substantial viewer and zoom refinement; annotations built before it would risk rework in positioning, scaling, interactions, responsive behaviour and accessibility |
| 2026-10-31 | Recorded UI-08 as completed and merged alone in PR #23 (commit `1eff291`, merge `506e8a8`), and started UI-09 on its own branch, `feat/ui-09-tier-guides`, from the updated `main`, instead of the shared branch `feat/ui-08-09-preferences-tier-guides`. UI-09's scope and acceptance criteria are unchanged. | The shared branch ended with its pull request, which was merged after UI-08's review checkpoint (section A: open the pull request for the completed tasks and continue the rest on a new branch) |
| 2026-10-31 | Revised UI-09's scope (UI-09 in section C) after inspecting design concept 4: Place Tier Guides, a shaded band per actual tier of each group, are explicitly approved alongside the existing lines, renamed Dividing Hairlines and otherwise unchanged. This supersedes the first scope's "no alternating bands" and its viewer toggle: both switches, "Show Place Tier Guides:" and "Show Dividing Hairlines:", independent and off by default, move to the settings panel, renamed "Stela Material & Glyph Settings", in a "Viewer guides" group marked as not exported. `showTierGuides`/`mayastack:showTierGuides` (UI-08) become `showTierHairlines`/`mayastack:showTierHairlines`, without migration, and `showPlaceTierGuides`/`mayastack:showPlaceTierGuides` is added. Both guides stay screen-only and out of the exports. The first approval is kept in UI-09's entry as history. | Approved by the user after the concept 4 investigation, which found that the concept distinguishes shaded tier cards from dividing hairlines; the old key never had a control in a released version |
| 2026-10-31 | Visual refinement of UI-09 (UI-09 in section C), keeping the revised scope otherwise. Both guides take their colours from the viewer background, never the glyph colour: gold-toned Dividing Hairlines at 3:1 (WCAG 2.1 SC 1.4.11) against the background and a resting card, and subtle Place Tier Guide cards at 1.25:1 (1.5:1 hovered), deliberately below 3:1 as supplementary shading. Cards and hairlines share a 3% side inset. The cards move behind the SVG on screen (an underlay, with a screen-only rule making the SVG's background transparent), so that the background-derived colour never tints the glyphs; the export is unchanged. The cards gain a hover treatment by geometry, with a shadow and a 150 ms transition, without taking the pointer. | Requested in the UI-09 review after concept 4; the underlay was chosen by the user over cards above the SVG, which would tint the glyphs against the revised scope's requirement, and over glyph-coloured cards |
| 2026-11-01 | Added UI-15, material presets and settings-panel refinement (UI-15 in section C), approved and not started: coordinated presets, preset swatches in both colour pickers, custom colours with active-preset detection, a Limestone default (`#FAF8F5`/`#14171D`) for users without saved colours, an adaptive grid colour, and the panel's hierarchy and colour-picker refinements. The new default and the grid colour change the exported appearance, as explicitly approved. It comes after UI-13 and UI-10; its place relative to UI-11 and UI-12 is not yet decided. The section D item "Material colour presets" is approved as UI-15, "Surprise me" is added to section D as deferred, and UI-14 now also depends on UI-15. Section G, including §10, stays as first written. | Approved by the user after a read-only investigation of the settings panel, the colour pickers and design concepts 3 and 4 |
| 2026-11-01 | Recorded UI-15's settled decisions (UI-15 in section C): the five-preset catalogue with exact colours (Limestone, the default, Dark Stela, Obsidian Basalt, Classic Paper and Weathered Limestone); the active preset found by exact RGBA pair matching, with no saved preset name and the existing colour keys as the only saved source; the panel heading "Stela Material & Glyph Settings" with a tune-style icon, keeping UI-09's two groups; and the colour-picker refinements. The grid colour's algorithm, the panel's exact markup and a possible hex input stay to be defined in the detailed scope. UI-15 now also depends on UI-10 and UI-13, matching its order of work. | Decided by the user during UI-15's planning |
| 2026-11-01 | Recorded UI-09 as completed and merged in PR #24 (commit `d1dedfa`, merge `8daca18`), which completes phase 5. UI-13 is the next task. | Verified against the merged `main` and the merge commit's parents |
| 2026-11-01 | Approved UI-13's detailed scope (UI-13 in section C) and started it on the branch `feat/ui-13-viewer-refinement`: the third concept's viewer direction within the 5/7 grid; 100% zoom as 1 CSS pixel per SVG unit at every width, superseding UI-04's "480 px maximum height and meaning of 100% zoom"; the eight zoom steps and 400% maximum kept; a new numeral and Reset centred horizontally at the top; a separate percentage readout and Reset; the `canvas` stage; a provisional responsive stage height, to be measured again once the viewer header exists; an optional transform-based zoom animation as the final slice. Settings-panel changes stay in UI-15, with the third concept's settings card recorded there as a visual reference only. The Export trigger's overlap with the stage is recorded for UI-11. Fullscreen and pinch zoom are deferred, and glyphs centred in their tiers is a proposal (section D). Section G's preface notes the current 128-digit maximum. | Approved by the user after read-only investigations of the viewer, design concepts 3 and 4, zoom performance, two zoom animations and the stage height, with prototype measurements recorded in UI-13's entry |
| 2026-11-01 | Closed UI-13's slice 4 review items (the browser test's Export-trigger comment no longer says "never") and planned the rest of UI-13 (its entry): slice 4.1, resize anchoring, before any further layout change; slice 5 revised into 5a, the header and toolbar ("Mayan Numeral Stack", a header slot, the zoom state kept in `NumeralViewport`); 5b, the tier-direction indicator, moved from UI-10; 5c, a compact glyph key, moved from UI-12, which keeps the broader legend; 5d, a hybrid stage height from `lg`, never changing with zoom, with the fixed heights kept below `lg`; and 5e, a conditional sticky viewer from `lg`. The base-20 tier badge keeps its ascending range. A separate UI-07 breakdown layout bugfix (excess page height, likely from `PowerOf20`'s `sr-only` spans) is recorded as a prerequisite of 5e, if confirmed. Section C gains a proposed sequence, which places UI-15 after UI-11; UI-12's place, and UI-15's relative to it, stay undecided. The Export trigger's overlap, including the Date-mode 200% case, stays with UI-11. | Approved by the user as the working direction after a read-only investigation of the viewer header, indicator, glyph key, stage height, sticky positioning and resize anchoring, with prototype measurements recorded in UI-13's entry; each slice stays subject to review |
| 2026-11-01 | Recorded UI-13's slices 1–4 as merged in PR #25 (commit `ad5b3cc`, merge `bbb8187`), which ended the shared branch `feat/ui-13-viewer-refinement`, and started slice 4.1, resize anchoring, on its own branch, `feat/ui-13-resize-anchoring`, from the updated `main` (section A). UI-13 stays in progress; UI-10's branch is decided when it starts. Slice 4.1 is implemented and reviewed, pending manual verification and its own commit and pull request (UI-13's entry). The scopes of UI-13 and UI-10 are unchanged. | Verified against the merged `main` and the merge commit; a branch ends with its pull request (section A) |
| 2026-11-02 | Recorded UI-13's slice 4.1 as merged in PR #26 (commit `bf48b08`, merge `a470a64`), and the separate UI-07 breakdown layout bugfix, UI-13's prerequisite, as confirmed, fixed and validated on its own branch, `fix/ui-07-breakdown-page-height`, with its commit and pull request pending (UI-13's entry, "Prerequisite"). UI-13's next slice is 5a, after that bugfix is merged; the planned slices are unchanged. | Verified against the merged `main`; the bugfix's cause was confirmed in a read-only investigation and its fix validated by browser tests |
| 2026-11-02 | Recorded the UI-07 breakdown layout bugfix as merged in PR #27 (commit `d1861fb`, merge `bbc1b1c`), and started UI-13's slice 5a on its own branch, `feat/ui-13-viewer-header-toolbar`, from the updated `main`. Decided for slice 5a: the header row above and outside the scroller; the 17.5rem stage offset kept, with the stage's new position measured and recorded (UI-13's entry), for slice 5d; a local `ViewAgenda` icon from Google Material Icons, as `Layers`, with no dependency; "Mayan Numeral Stack" with the icon with and without a result, with no zoom controls without one; tests that need the viewer card find the nearest card around its heading, with no production attribute or landmark added. The zoom animation stays a separate, optional refinement; slices 5b–5e are unchanged. | Approved by the user after the slice 5a preflight; the merge verified against the merged `main` |

## F. Completion record

Not completed. When the whole redesign is finished, record here: the completion date, the final validation performed, the final commit or PR, and any explicitly deferred items that remain outside the completed scope. Keep this document afterwards as project history.

## G. Reference: approved requirements

The sections below are the approved requirements, retained unchanged from the original roadmap. Section C maps their "Stage N" references to task IDs; where section C or the plan-change log records a later approved decision, that decision applies.

The current maximum numeral size is 128 digits (99 tiers), established in UI-07; earlier 500-digit references are historical.

## 2. Project Context

MayaStack is a React and TypeScript application built with Vite and Tailwind CSS. It converts numeric input into a visual representation of Mayan numerals.

Existing functionality includes:

- Conversion of integers using exact BigInt arithmetic.
- Support for up to 500 significant digits (leading zeros excluded), with raw input text limited to 1,000 characters.
- Number mode and date mode.
- Visual rendering of dots, bars, and the shell-shaped zero glyph.
- Vertical stacks representing base-20 place values.
- An SVG-based numeral renderer.
- SVG and PNG export.
- Light, dark, and system theme choices.
- Customizable background and glyph colours, including alpha.
- An optional grid, rendered inside the exported SVG.
- Zoom controls, keyboard shortcuts, and a scrollable numeral viewport.
- Responsive layouts and automated tests.

The redesign must build on this functionality rather than replace it with a separate implementation.

### Important domain distinction

The current date mode converts the Gregorian day, month, and year components independently into base-20 numerals. It is a component-wise numerical representation of a Gregorian date, not a historical Mayan calendar conversion.

It does not calculate or display a Mayan Long Count date. It must not be described as a Long Count converter or expanded into a calendar implementation as part of this redesign.

This mode remains part of the intended product unless a later, explicitly approved decision changes it. Whether it needs clearer explanatory text or a short note in the UI, so users understand what the representation means, is to be investigated (see Stage 7).

A proper Long Count conversion may be added later as a separate mode. It is deferred until after the current redesign and requires its own research, specification, and acceptance criteria (see Section 10.1).

## 3. Design Direction

### 3.1 Overall approach

Use the first design-reference concept as the primary layout reference, with selected visual ideas from the other concepts.

The intended result is a clean, modern conversion workspace that makes the input, mathematical representation, and visual result easy to understand.

The design should feel distinctive without becoming a dense historical research interface.

Prioritize:

- Clear information hierarchy.
- A prominent, readable numeral viewer.
- A straightforward input and conversion workflow.
- Useful mathematical context without overwhelming the user.
- Accessible controls and readable contrast.
- Consistent light and dark themes.
- Responsive behavior across desktop, tablet, and mobile.
- Reuse of the existing conversion and rendering logic.

Design-reference concepts and generated HTML are visual references, not production-ready implementations. Do not copy their logic, export implementations, mock data, or unsupported functionality.

The `design-reference/` directory is local and gitignored. It is not part of the repository, and this roadmap must remain understandable without it. Do not commit design-reference assets or change `.gitignore` for them.

### 3.2 Workspace layout

The preferred desktop direction is a two-column workspace:

- **Input and breakdown area:** numeric or date input, conversion controls, and the mathematical breakdown.
- **Numeral viewer:** a prominent vertical glyph stack, viewer controls, and accessible export actions.

The layout should adapt naturally to smaller screens. On mobile, the input, breakdown, and viewer must remain usable without horizontal overflow.

The final component boundaries and responsive breakpoints should be determined after inspecting the existing application.

Do not introduce a third permanent inspector panel or a dense multi-pane research interface without separate approval.

### 3.3 Visual language

Use a restrained visual identity inspired by obsidian, ceremonial gold, jade, and warm parchment.

These are design directions, not permission to apply every proposed colour everywhere. Define semantic design tokens and validate them for both themes before applying them across the application.

Requirements:

- Maintain accessible text and control contrast.
- Use dark foreground text on bright gold controls where necessary to meet contrast requirements.
- Ensure input boundaries and selected states remain distinguishable.
- Avoid undefined or inconsistent utility classes.
- Keep light and dark themes intentionally designed rather than treating one as an inversion of the other.
- Use one display font for selected headings and system fonts for interface text and numeric content.
- Avoid unnecessary external font dependencies.
- Keep the overall interface approachable and functional rather than overly ceremonial.

The glyphs must use one consistent glyph colour. Do not introduce separate shell, dot, or bar colours as part of the redesign.

### 3.4 Shape and decoration

Use borders, spacing, typography, and restrained colour to establish hierarchy.

Do not impose a universal zero-radius rule or add decorative framing that reduces usable space or readability.

Any visual decoration must not interfere with the numeral, its interpretation, keyboard interaction, or export output.

### 3.5 Component architecture

The redesign is not required to preserve existing React component boundaries where those boundaries no longer serve the intended interface. New components may be created, and existing components refactored, split, or combined, and data flow adjusted, when the requirements justify it.

However:

- Inspect the existing architecture before deciding to refactor.
- Prefer cohesive components with clear responsibilities over unnecessary fragmentation.
- Reuse existing conversion, rendering, and export logic where appropriate.
- Avoid duplicating numerical or rendering logic.
- Preserve public behavior, accessibility, responsive behavior, and export correctness unless a change is explicitly approved.
- Include appropriate regression tests for architectural changes.
- Keep changes reviewable and limited to the current task.

This principle removes artificial restrictions on implementation. It does not authorize a wholesale rewrite without justification.

## 4. Approved Product Decisions

The following decisions have been agreed for the redesign.

### 4.1 Initial state and Clear

- Number mode starts at `0`, and the numeral viewer initially renders the zero glyph.
- Clear resets Number mode to `0`.
- Date mode keeps its existing date-picker clear behavior.
- The user may temporarily empty the number field while editing. While the field is empty or invalid, there is no valid numeral result to render or export.
- Zero counts as one significant digit.
- Reset behavior must not leave stale breakdown or viewer state.

This intentionally changes current behavior, which starts with an empty number field. Existing tests that assert an initially empty input or an absent initial Export (for example, `HomeView.test.tsx` "renders no glyphs while the input is empty" and "offers Export exactly while there is a result to export") must be updated deliberately in Stage 3, not weakened.

### 4.2 Random number generation

Provide a Random action that generates a valid positive integer with a randomly selected significant-digit length between 1 and 500, inclusive.

Requirements:

- Do not use JavaScript `Number` for large integer generation.
- Use BigInt-compatible logic or another exact approach.
- Do not produce leading zeros.
- Ensure the selected length corresponds to the actual significant-digit count.
- Keep generated values within the application's supported input constraints.
- Preserve the current conversion and rendering correctness.

The exact random-generation implementation should be selected after inspecting existing validation and input handling.

### 4.3 Stepper and presets

Provide controls for incrementing and decrementing the numeric value.

The proposed preset increments are:

- 1
- 5
- 20
- 400
- 8,000

Also provide a custom increment.

Requirements:

- The supported range is `0` through `10^500 - 1`.
- Disable an action when the proposed step would cross a boundary. Do not clamp the result.
- Disable stepping while the number input is empty or invalid.
- A custom increment must be a positive integer within the supported 500-significant-digit limit.
- Validate the input and custom increment using the existing validation approach (`validateNumberInput`).
- Preserve exact integer arithmetic.
- Stepping produces a canonical value without leading zeros.
- Communicate disabled states, and the reason for them, accessibly.
- Avoid silently rounding or coercing user input.

The preset list and custom increment controls should be easy to use without dominating the workspace.

### 4.4 Significant-digit count

Display the number of significant digits in the current value.

Leading zeros must not inflate the count. Zero itself counts as one digit.

The count must remain correct for values up to the supported 500-digit limit.

### 4.5 Mathematical breakdown

Provide a compact breakdown of the current number into its base-20 place-value contributions.

The existing expanded notation (`toBase20String(digits, 'expanded')`, shown by `Base20Display`) is the initial reference. It writes every power explicitly and includes zero-valued tiers, for example:

`3 × 20² • 0 × 20¹ • 2 × 20⁰`

The actual terms must be calculated from the current input using exact arithmetic.

Requirements:

- Show a compact representation by default.
- Keep explicit powers and zero-valued tiers; they correspond to rendered tiers.
- Allow the user to reveal exact decimal contributions on demand. Do not expand them by default.
- Keep the exact-contribution view bounded, scrollable, and keyboard-accessible for large values (up to 385 tiers).
- Provide an expanded formula view.
- Include a Copy Formula action that produces a defined plain-text format (no HTML markup).
- Give clear feedback when copying succeeds and when clipboard writing fails or is unavailable.
- Ensure copied content is derived from the current conversion, not stale UI state.
- Keep the breakdown synchronized with input changes and reset actions.
- Do not convert the breakdown into a second, independent numerical implementation.

The existing `getPlaceValues` utility may be useful, but inspect its behavior and tests before deciding how to integrate it.

### 4.6 Zero glyph

Keep the existing shell-shaped zero glyph.

An alternative zero glyph is deferred until suitable artwork, source attribution, licensing, and rendering requirements have been reviewed.

Do not add an alternative zero style in this redesign.

### 4.7 Display preferences

Remember the user's display preferences across sessions.

The intended preferences include:

- Theme.
- Background colour.
- Glyph colour.
- Exportable grid visibility.
- Screen-only tier guides.
- Screen-only annotation visibility, if the annotation feature is implemented.

Current behavior: the application offers light, dark, and system theme choices. Theme and grid visibility are persisted today; background and glyph colours are not. Colour persistence is a planned improvement.

Stage 6 owns the common persistence mechanism. Stages 5 and 6 must not introduce competing persistence implementations.

Inspect the existing settings context and persistence behavior before designing the storage changes.

Requirements:

- Preserve existing settings and customization options.
- Validate persisted values before applying them.
- Handle missing, invalid, or outdated stored preferences safely.
- Avoid theme flashes or inconsistent initial rendering.
- Keep preferences consistent across components.
- Do not introduce a new persistence dependency unless justified.

### 4.8 Typography

Use one display font for selected headings and system fonts for the interface and numeric content.

Avoid adding multiple font families solely to reproduce a mockup.

Typography must remain readable, responsive, and consistent across themes.

### 4.9 Educational explanations

Add concise explanations that help users understand the application's actual functionality.

Potential topics include:

- How positional base-20 notation works.
- How dots and bars represent digit values.
- How the shell glyph represents zero.
- How to read the vertical stack.
- What the mathematical breakdown represents.
- How the current date mode works.

Explanations must describe implemented behavior accurately. Historical, archaeological, calendrical, or astronomical claims require reliable sources and must not be invented to make the interface feel more authentic.

## 5. Viewer, Grid, Guides, and Annotations

### 5.1 Exportable grid

Keep the existing grid as an independent, user-controlled display setting.

The grid is part of the SVG numeral rendering and must remain exportable when enabled.

Do not remove it or silently replace it with tier guides.

Known limitation, for future review: the grid's `<rect>` (`SvgGrid.tsx`) sets its width and height with CSS `calc()` in SVG attributes and uses a fixed pattern id and stroke colour. Browsers render it, but non-browser SVG renderers may not. This is not part of Stage 0 or any other stage unless separately scoped.

### 5.2 Screen-only tier guides

Add optional guides that help users distinguish the vertical place-value tiers.

These guides are separate from the exportable grid.

Requirements:

- Guides must not alter the underlying numeral data or glyph rendering.
- Guides should remain aligned with the numeral when zooming or scrolling.
- Guides must not be included in SVG or PNG exports.
- Guides must not interfere with pointer interaction, keyboard navigation, or screen-reader accessibility.
- The user must be able to toggle them independently from the exportable grid.

### 5.3 Screen-only annotations

Evaluate a restrained annotation option to help users understand the rendered stack.

Annotations may identify tier positions or explain the current representation, but must not introduce unsupported historical claims.

Requirements:

- Annotations must remain outside the exported SVG whenever possible.
- They must not alter the exported numeral, grid, or colours.
- They must remain aligned when zooming and scrolling.
- Their visibility must be independently controllable if implemented.
- Avoid cluttering the default viewer.

The precise annotation design should be validated against the existing renderer before implementation.

## 6. Export and Rendering Requirements

The existing SVG-based rendering and export pipeline is a core part of the application and must be preserved.

Requirements:

- Exported SVG and PNG output must accurately represent the current numeral.
- Exported output must respect the intended background colour, glyph colour, and exportable grid setting.
- Screen-only tier guides and annotations must not leak into exported files.
- Export output must not depend on viewport zoom or scroll position.
- Preserve the existing export functionality and supported file formats.
- Avoid SVG techniques that introduce rendering inconsistencies across browsers or image-conversion tools.
- Validate exported files directly where appropriate, rather than relying only on screenshots of the application.
- Keep the renderer as the source of truth for glyph output.
- Keep Export reachable even when the numeral result is off-screen. Retain the existing tests for this (`MayanExportPanel.test.tsx` "offers Export for the largest number even while the result is off-screen" and the end-to-end test "offers Export for the largest number wherever the page is scrolled") unless an explicitly approved later decision changes this behavior.

Do not replace the existing renderer with mock glyphs or implement a separate export-only numeral renderer.

## 7. Accessibility and Responsive Behavior

Accessibility and responsiveness are requirements for every stage, not a final polish task.

Requirements:

- Maintain semantic HTML and accessible control names.
- Support keyboard interaction and visible focus indicators.
- Preserve and test existing keyboard zoom controls.
- Communicate disabled, selected, and invalid states accessibly.
- Maintain sufficient colour contrast in both themes.
- Respect reduced-motion preferences if transitions or animations are introduced.
- Keep controls usable at narrow viewport widths and browser zoom levels.
- Prevent unnecessary horizontal scrolling.
- Ensure screen-only guides and annotations do not obstruct content or interfere with assistive technology.
- Keep error messages clear and associated with their relevant inputs.

## 8. Implementation Roadmap

Implement the redesign as small, independently reviewable stages.

### Stage 0: Fix Existing Theme Defects

Scope:

- Scope the `.dark` token overrides in `src/index.css` so they apply only under the `.dark` class.
- Give the ThemeSelector's selected option a visible state using existing tokens. Do not create a new colour scale.
- Initialize the intended saved or system theme before first paint. A minimal `index.html` change is permitted for this, consistent with the existing theme validation in `DisplaySettingsContext` (the `theme` storage key; invalid or unreadable values fall back to system).
- Preserve current theme choices and existing preferences.

Correcting the token scoping may visibly change the light theme: it will use the light values already declared in the stylesheet instead of the dark values it currently receives. This is intended.

Acceptance criteria:

- Light and dark themes use their declared values, verified in the compiled CSS or through browser-computed styles. Unit tests that cannot evaluate compiled Tailwind styles are not sufficient on their own.
- The selected theme option is visibly distinct in both themes.
- A saved light or dark theme, and the system theme, render correctly from first paint without an incorrect-theme flash.
- Switching themes works without inconsistent component styling.
- Existing storage-failure behavior is preserved (`DisplaySettingsContext.test.tsx` "without usable storage" tests and the end-to-end test "the app works with default settings when site storage is blocked").
- Relevant tests, type checks, linting, and build checks pass.

No workspace redesign, new design tokens, or unrelated accessibility changes should be introduced in this stage.

### Stage 1: Establish the Design System

Scope:

- Define semantic design tokens.
- Establish accessible light and dark palettes.
- Define typography, spacing, borders, and control states.

Acceptance criteria:

- Tokens are consistently named and used.
- Text and interactive controls meet applicable contrast requirements.
- Existing theme and display settings continue to work.
- No unnecessary dependencies are introduced.
- The design system is documented where appropriate (`docs/DESIGN_SYSTEM.md`).

### Stage 2: Implement the Workspace Layout

Scope:

- Implement the approved responsive two-column workspace.
- Establish clear visual hierarchy between input, breakdown, and viewer.
- Position viewer controls and export actions appropriately.
- Reuse existing application logic and components where practical.

Acceptance criteria:

- Existing number and date modes remain functional.
- The layout adapts to desktop, tablet, and mobile.
- Existing conversion output and export behavior remain correct.
- Export remains reachable when the numeral result is off-screen (see Section 6).
- Keyboard navigation and accessibility are preserved.

### Stage 3: Improve Input Controls

Scope:

- Start at zero and implement Clear-to-zero behavior.
- Add Random generation.
- Add significant-digit count.
- Add preset and custom stepper increments.

Acceptance criteria:

- Zero, small integers, and 500-digit values behave correctly.
- Random generation produces valid values with the selected significant-digit length.
- Stepper actions use exact arithmetic and respect boundaries.
- Invalid input and custom increments are handled consistently.
- Existing input validation and date mode remain intact.
- Tests that assumed an initially empty input are updated deliberately to the approved behavior (Section 4.1).

### Stage 4: Add the Mathematical Breakdown

Scope:

- Add compact base-20 place-value contributions.
- Add on-demand exact decimal contributions.
- Add expanded formula and Copy Formula actions.

Acceptance criteria:

- All terms are derived from the actual input.
- Results remain correct for supported large values.
- The breakdown stays synchronized with the numeral.
- Clipboard actions copy the correct current formula in the defined plain-text format.
- Clipboard failure is reported clearly.
- The exact-contribution view stays bounded, scrollable, and keyboard-accessible for 500-digit inputs.

### Stage 5: Add Viewer Guides and Annotations

Scope:

- Add optional screen-only tier guides.
- Evaluate and implement restrained screen-only annotations.
- Integrate their settings with display preferences, using the Stage 6 persistence mechanism rather than a separate one.

Acceptance criteria:

- Guides and annotations remain aligned during zoom and scrolling, checked at 25%, 100%, and 400% zoom where practical.
- In date mode, guides align correctly with each separate numeral group, whose tier counts may differ.
- They do not alter the numeral or underlying conversion.
- They are excluded from SVG and PNG exports.
- The existing exportable grid remains independently controlled.
- The viewer remains accessible and uncluttered.

### Stage 6: Refine Export and Display Preferences

Scope:

- Review export controls within the redesigned workspace.
- Own the common persistence mechanism for display preferences, and persist the approved preferences, including background and glyph colours.
- Validate preference restoration and theme changes.
- Confirm export output remains consistent.

Acceptance criteria:

- All existing export formats continue to work.
- SVG and PNG output reflect the intended display settings.
- Screen-only elements remain excluded.
- Invalid persisted values are handled safely.
- Existing user customizations are not silently discarded.

If implementation dependencies make a part of this stage necessary earlier, address it within the relevant stage rather than duplicating functionality.

### Stage 7: Add Educational Explanations

Scope:

- Add concise explanations of base-20 notation and glyph reading.
- Explain the current number and date modes accurately.
- Investigate whether the date mode needs a short UI note explaining that it represents the Gregorian day, month, and year separately.
- Use reliable sources for claims that go beyond observable application behavior.

Acceptance criteria:

- Explanations are accurate, concise, and accessible.
- The interface does not claim to implement a Long Count calendar.
- Educational content does not overwhelm the primary conversion workflow.

### Stage 8: Viewer Interaction Polish

Investigate and refine viewer usability once the workspace layout (Stage 2) and viewer guides and annotations (Stage 5) are established. This stage is distinct from the theme fixes in Stage 0.

The existing zoom range (25% to 400%), keyboard zoom controls, and export independence from zoom and scroll remain protected baselines. The viewer already keeps the centred point of the numeral in place when zooming with its controls; verify this behavior before changing it.

Scope:

- Pan and scroll behavior for large numeral stacks.
- Smooth, responsive zoom transitions.
- Keeping the relevant point of the numeral visually anchored during zooming.
- Clearer and more polished viewer controls.
- Ctrl + scroll to zoom, as an interaction option to evaluate rather than a requirement, because it may conflict with browser zoom and trackpad conventions.
- Compatibility with browser zoom, normal page scrolling, trackpads, touch input, and mobile devices.

Acceptance criteria:

- The zoom range and keyboard zoom controls are preserved unless a change is explicitly approved.
- Controls remain keyboard-accessible with visible focus.
- Transitions respect reduced-motion preferences.
- Normal page scrolling and browser zoom are not hijacked.
- The viewer remains usable with touch input and on mobile widths.
- SVG and PNG export output is identical regardless of zoom, panning, or scrolling.

### Stage 9: Final Regression and Polish

Scope:

- Review the complete redesign against this roadmap.
- Resolve integration issues and accessibility gaps.
- Validate the application across supported viewport sizes.
- Review export fidelity and numerical correctness.

Acceptance criteria:

- Relevant unit, integration, and end-to-end tests pass.
- Type checking, linting, and production build pass where supported.
- The 500-digit workflow remains correct.
- Number and date modes work as intended.
- Themes, display preferences, keyboard controls, and exports work together.
- Remaining limitations are documented explicitly.

## 9. Regression Requirements

The following existing behavior must be protected throughout the redesign.

### Numerical correctness

- Use exact BigInt arithmetic for supported integer conversions.
- Preserve support for up to 500 significant digits.
- Do not coerce large integers through JavaScript `Number`.
- Preserve correct base-20 digit extraction and place values.
- Preserve correct zero rendering.
- Do not introduce calendar arithmetic into the current date mode.

### Rendering and export

- Preserve the existing SVG-based numeral renderer.
- Keep glyph rendering consistent across viewer and exported output.
- Keep each digit stack's markup below the 650-byte upper bound enforced by `GlyphStackGroup.test.tsx` ("GlyphStackGroup output size"). This is a regression guard against markup growing with place value, not the measured size of a stack or of the whole SVG. Change it only after separate review.
- Verify SVG and PNG output after relevant changes.
- Ensure zoom, scrolling, guides, and annotations do not change exported numeral content.

### Interaction and settings

- Preserve the existing zoom range of 25% to 400%.
- Preserve keyboard zoom controls.
- Preserve grid, background colour, glyph colour, and theme functionality.
- Maintain responsive behavior and accessible controls.

### Automated tests

Inspect and run the existing tests before making changes.

Add regression tests for new behavior and update tests only when the intended behavior changes. Never weaken or delete a test merely to make a change pass.

Do not claim that a test, build, or manual check passed unless it was actually run and its result was verified.

## 10. Explicit Non-Goals and Deferred Features

The following are outside the current redesign scope unless separately approved:

- A proper Mayan Long Count calendar converter.
- Historical epoch or correlation-constant calculations.
- Astronomical or calendrical calculations.
- Alternative zero glyphs.
- Unsupported historical or archaeological claims.
- A permanent three-panel research interface.
- Unapproved presets, random actions, or other mockup-only features beyond the decisions explicitly listed in this roadmap. Optional ideas that are not approved include material colour presets, Copy SVG code, a separate Date tab, and a tier-count chip.
- A replacement numeral renderer or separate export-only renderer.
- Unnecessary framework, build-tool, or dependency upgrades.
- A complete rewrite of existing conversion logic.
- Unrelated refactoring or feature work.

### 10.1 Future investigation: Long Count date mode

A proper Long Count conversion is deferred until after the current redesign. It requires its own research, specification, acceptance criteria, and explicit approval. Topics to investigate, without deciding the implementation now:

- Verified Long Count units, place values, rollover rules, and conversion conventions.
- Appropriate user input and output representations.
- How a Long Count mode should coexist with the existing component-wise date mode.
- Whether the UI should offer two clearly labelled date-conversion modes.
- Whether the existing glyph renderer can support both modes cleanly, or whether a specialized renderer or data adapter is warranted.
- Historical source verification and explanatory wording.
- Regression coverage for both date modes.

Factual note: the Long Count does not follow strict base-20 place values. The k'in position counts individual days from 0 to 19, and a tun consists of 18 uinals of 20 days each, giving 360 days, not 20² = 400. Do not describe 360 as the maximum value of a day component. The full rules must be researched and verified before implementation.

## 11. Workflow and Change Control

Follow the repository's `CLAUDE.md` instructions for all implementation work.

This roadmap must be committed to the repository before Stage 0 implementation begins, so that every stage works from a versioned source of truth.

For each stage:

1. Inspect the current repository state and relevant implementation.
2. Verify existing behavior and tests before changing code.
3. Confirm the requested scope and identify any conflicts or uncertainties.
4. Implement only the explicitly requested stage.
5. Run relevant tests and validation.
6. Review the diff for unrelated changes, regressions, accessibility issues, and export inconsistencies.
7. Report changed files, validation results, limitations, and Git status.
8. Stop and wait for review before proceeding to the next stage.

Do not commit, push, merge, create pull requests, deploy, or perform production-changing operations without explicit user authorization.

Preserve existing user changes and unrelated work.

### 11.1 Revising this roadmap

This roadmap is an evolving plan, not a rigid implementation contract.

- Implementation findings may justify revising stage boundaries, ordering, dependencies, scope, or acceptance criteria.
- A stage may be split, combined, expanded, reduced, or substantially redesigned when evidence from implementation or testing supports it. The mathematical breakdown and the numeral viewer and layout are examples of areas whose architecture and presentation may evolve after integration.
- When proposing a material change, explain the evidence, expected benefits, risks, and testing implications.
- Significant scope changes, or changes to approved product behavior, must be presented to the user for approval before implementation.
- Small implementation adjustments within an approved stage, such as component-level design decisions, may be made without treating each one as a new product decision.
- After an approved change, update this roadmap and the status table so they reflect the actual plan.

These rules operate within the task-scope and safety rules in `CLAUDE.md`, which continue to apply.
