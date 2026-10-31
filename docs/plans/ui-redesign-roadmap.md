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
| Preferences and tier guides | UI-08, UI-09 | Same phase; UI-09 is the first feature to use the UI-08 persistence mechanism (G §4.7) |

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
| UI-07 | Base-20 breakdown and Copy Formula | 4 Breakdown | in progress | UI-04 | 4 |
| UI-08 | Shared persistence for display preferences | 5 Preferences and viewer aids | not started | UI-03 | 6 (persistence) |
| UI-09 | Screen-only tier guides | 5 Preferences and viewer aids | not started | UI-04, UI-08 | 5 |
| UI-10 | Screen-only annotations (evaluate, then implement if suitable) | 5 Preferences and viewer aids | not started | UI-09 | 5 |
| UI-11 | Export controls in the redesigned workspace | 6 Export | not started | UI-04 | 6 (export) |
| UI-12 | Educational explanations | 7 Education | not started | UI-04 | 7 |
| UI-13 | Viewer interaction polish | 8 Viewer polish | not started | UI-04, UI-09 | 8 |
| UI-14 | Final responsive, accessibility, regression and visual validation | 9 Final validation | not started | UI-01–UI-13 | 9 |

By default, each task has its own branch and pull request. The approved exceptions, currently UI-05 with UI-06 and UI-08 with UI-09, are listed in section A, "Branches and pull requests".

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

- **Status:** in progress, on the branch `feat/ui-07-base20-breakdown`, at its review checkpoint.
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
- **Next action:** review checkpoint.

### UI-08: Shared persistence for display preferences

- **Status:** not started.
- **Goal:** one persistence mechanism for display preferences, including background and glyph colours, before other tasks add preferences. Today only the theme and grid visibility are saved (`src/context/DisplaySettingsContext.tsx`).
- **Scope and acceptance:** G §4.7, and the persistence parts of §8, Stage 6.
- **Next action:** define the detailed scope when the task is selected.

### UI-09: Screen-only tier guides

- **Status:** not started.
- **Scope and acceptance:** G §5.2 and the tier-guide parts of §8, Stage 5, using the UI-08 persistence mechanism.
- **Next action:** define the detailed scope when the task is selected.

### UI-10: Screen-only annotations

- **Status:** not started.
- **Scope and acceptance:** G §5.3 and the annotation parts of §8, Stage 5. Approved for evaluation; implemented only if the evaluation supports it.
- **Next action:** evaluate a restrained annotation design against the renderer when the task is selected.

### UI-11: Export controls in the redesigned workspace

- **Status:** not started.
- **Scope and acceptance:** G §6 and the export parts of §8, Stage 6.
- **Next action:** define the detailed scope after UI-04.

### UI-12: Educational explanations

- **Status:** not started.
- **Scope and acceptance:** G §4.9 and §8, Stage 7, including whether the date mode needs a short explanatory note.
- **Next action:** define the topics and sources when the task is selected.

### UI-13: Viewer interaction polish

- **Status:** not started.
- **Scope and acceptance:** G §8, Stage 8. Ctrl + scroll zooming is an option to evaluate, not a requirement.
- **Next action:** define the detailed scope after UI-04 and UI-09.

### UI-14: Final responsive, accessibility, regression and visual validation

- **Status:** not started.
- **Scope and acceptance:** G §8, Stage 9, and G §9.
- **Next action:** run when all other tasks are completed or explicitly deferred.

## D. Optional and deferred ideas

None of these are committed scope. Each needs a separate decision before implementation.

| Idea | Status | Notes |
|---|---|---|
| Alternative zero glyph | deferred | Needs artwork, attribution, licensing and rendering review (G §4.6, §10) |
| Long Count date mode | deferred | Needs its own research and specification (G §10.1) |
| Material colour presets | proposed | Listed as not approved (G §10) |
| Copy SVG code | proposed | Listed as not approved (G §10). Copies the SVG markup as text, so it could reuse `copyText` (`src/utils/clipboard.ts`); see the renderer copy and export options below |
| Separate Date tab | proposed | Listed as not approved (G §10) |
| Tier-count chip | proposed | Listed as not approved (G §10) |
| Glyph legend (dot = 1, bar = 5, shell = 0) | proposed | Seen in design references; to be reviewed separately |
| Educational information cards | proposed | A possible format for UI-12; the explanations themselves are approved |
| Heading order (`h1` followed by `h3`) | approved | Part of UI-04: the section headings become `h2` |
| Emoji in visible labels and accessible names (such as `📦 Export`) | deferred | Reviewed with UI-04 and deferred |
| Theme menu Escape and arrow-key support | deferred | Reviewed with UI-04 and deferred |
| Harden the toast reduced-motion test | proposed | Follow-up noted in PR #14 |
| Date picker's clear button reachable with the keyboard | proposed | react-datepicker renders it with `tabIndex={-1}`; needs a replacement button in `DateInput.tsx`. Found during UI-03 |
| Lining figures in the headings | proposed | Playfair Display's default old-style figures lower the "20" in "Base-20 Representation". Found during UI-03 |
| A visible focus ring on the colour picker's sliders | proposed | react-colorful shows focus only by enlarging the pointer. Found during UI-03 |
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
| Export trigger over content while scrolling | proposed | The floating trigger can cover any content scrolled into its band, e.g. the breakdown disclosure's chevron at 768 px. UI-07 keeps keyboard focus clear of it with `scroll-padding-bottom`; a layout that never overlaps belongs to UI-11. Added 2026-10-30. Update (2026-10-31): UI-07 also reserves space below the content from 640 px, so the end of the page scrolls clear of the trigger; content still passes under it mid-scroll |

## E. Current progress and next task

- **Completed:** UI-01 (phase 0), UI-02 and UI-03 (PR #19), which completes phase 1, UI-04 (PR #20), which completes phase 2, and UI-05 and UI-06 (PR #21), which complete phase 3.
- **In progress:** UI-07, on the branch `feat/ui-07-base20-breakdown`, at its review checkpoint.
- **Blockers:** none.
- **Decided:** the Export trigger stays floating in UI-04; the presentation of the export controls is reviewed in UI-11.
- **Next task: UI-07,** in progress. See its entry in section C.

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

## F. Completion record

Not completed. When the whole redesign is finished, record here: the completion date, the final validation performed, the final commit or PR, and any explicitly deferred items that remain outside the completed scope. Keep this document afterwards as project history.

## G. Reference: approved requirements

The sections below are the approved requirements, retained unchanged from the original roadmap. Section C maps their "Stage N" references to task IDs; where section C or the plan-change log records a later approved decision, that decision applies.

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
