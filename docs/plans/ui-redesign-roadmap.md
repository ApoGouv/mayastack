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

Task statuses are `not started`, `in progress`, `blocked`, `completed` and `deferred`. Task IDs are stable: they are never renumbered or reused, even when the order of work changes.

## B. Confirmed design decisions

Detailed requirements are in section G; the design system itself is documented in [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

- **Visual identity:** obsidian and warm parchment surfaces, ceremonial gold and selective jade accents, with light and dark themes designed intentionally rather than inverted (G §3.3).
- **Colour roles:** gold for primary actions, selection and focus; jade for success and active or on states; red for errors. Status is never communicated by colour alone. Gold fills always have a 1 px `accent-fg` border, in both themes, with dark text on gold.
- **Foundation:** semantic colour tokens in `src/index.css` (light values in `@theme static`, dark values under `.dark`), WCAG 2.2 AA contrast, a shared `focus-ring` utility (2 px outline, 2 px offset), a reduced-motion rule and `color-scheme` per theme. Details and contrast tables are in `docs/DESIGN_SYSTEM.md`.
- **Typography:** one display font, Playfair Display, for the main heading and section headings only: the unmodified official file, self-hosted with its OFL licence, never subset, converted or loaded from a CDN. Interface text and numbers use system fonts, with `tabular-nums` where digits must align.
- **Brand mark:** the logo and favicon keep their geometry and identity, recoloured to a gold disc with dark marks and a contrasting `accent-fg` ring. The main heading uses `fg`; "Stack" in the wordmark uses `accent-fg`.
- **Shape:** no zero-radius rule; controls `rounded-md`, cards and popovers `rounded-lg`, pills `rounded-full` (G §3.4, `docs/DESIGN_SYSTEM.md` §7).
- **Workspace:** a two-column workspace based on the first design-reference concept, without a permanent third panel (G §3.1–§3.2).
- **Product decisions:** Number mode starts at `0`; Clear resets it to `0`; Random generates 1–500 significant digits; stepper presets 1, 5, 20, 400 and 8,000 plus a custom increment; a significant-digit count; a compact breakdown with on-demand exact contributions and Copy Formula; the existing shell zero glyph is kept; display preferences, including colours, are remembered (G §4).
- **Viewer and export:** the exportable grid stays an independent setting; tier guides and annotations are screen-only and never exported; export output does not depend on zoom, scroll or theme; Export stays reachable when the result is off-screen (G §5–§6).
- **Domain:** the date mode is a component-wise numerical representation of a Gregorian date, not a Mayan calendar conversion. A Long Count mode is deferred (G §2, §10.1).

## C. Phases and tasks

| ID | Task | Phase | Status | Depends on | Old stage |
|---|---|---|---|---|---|
| UI-01 | Fix theme defects | 0 Theme defects | completed | none | 0 |
| UI-02 | Design-system foundation | 1 Design system | completed | UI-01 | 1 (PR 1) |
| UI-03 | Apply the foundation to existing components | 1 Design system | not started | UI-02 | 1 (PR 2) |
| UI-04 | Two-column workspace layout | 2 Workspace | not started | UI-03 | 2 |
| UI-05 | Initial value, Clear and significant-digit count | 3 Input controls | not started | UI-04 | 3 |
| UI-06 | Random, stepper presets and custom increment | 3 Input controls | not started | UI-05 | 3 |
| UI-07 | Base-20 breakdown and Copy Formula | 4 Breakdown | not started | UI-04 | 4 |
| UI-08 | Shared persistence for display preferences | 5 Preferences and viewer aids | not started | UI-03 | 6 (persistence) |
| UI-09 | Screen-only tier guides | 5 Preferences and viewer aids | not started | UI-04, UI-08 | 5 |
| UI-10 | Screen-only annotations (evaluate, then implement if suitable) | 5 Preferences and viewer aids | not started | UI-09 | 5 |
| UI-11 | Export controls in the redesigned workspace | 6 Export | not started | UI-04 | 6 (export) |
| UI-12 | Educational explanations | 7 Education | not started | UI-04 | 7 |
| UI-13 | Viewer interaction polish | 8 Viewer polish | not started | UI-04, UI-09 | 8 |
| UI-14 | Final responsive, accessibility, regression and visual validation | 9 Final validation | not started | UI-01–UI-13 | 9 |

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

- **Status:** not started. Verified on 2026-10-23: components use no semantic tokens, `focus-ring` or `font-heading`; the logo and favicon still use the old colours; the date picker and toasts are not themed.
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
- **Next action:** Once UI-03 is approved to start: create a task branch from the latest `main` and capture the export baseline before editing.

### UI-04: Two-column workspace layout

- **Status:** not started.
- **Goal:** the approved responsive two-column workspace, with a prominent numeral viewer.
- **Scope and acceptance:** G §3.2 and §8, Stage 2. Export must stay reachable when the result is off-screen (G §6). The Export trigger's placement and the proposals in section D are decided when this task is defined.
- **Next action:** propose a layout for review, including the Export trigger's placement.

### UI-05: Initial value, Clear and significant-digit count

- **Status:** not started.
- **Scope and acceptance:** G §4.1 and §4.4, and the matching parts of §8, Stage 3. Tests that assume an initially empty input are updated deliberately (G §4.1).
- **Next action:** define the detailed scope when the task is selected.

### UI-06: Random, stepper presets and custom increment

- **Status:** not started.
- **Scope and acceptance:** G §4.2 and §4.3, and the matching parts of §8, Stage 3.
- **Next action:** define the detailed scope when the task is selected.

### UI-07: Base-20 breakdown and Copy Formula

- **Status:** not started.
- **Scope and acceptance:** G §4.5 and §8, Stage 4. `getPlaceValues` (`src/utils/base20.ts`) exists and is tested, but no component uses it yet.
- **Next action:** define the detailed scope when the task is selected.

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
| Copy SVG code | proposed | Listed as not approved (G §10) |
| Separate Date tab | proposed | Listed as not approved (G §10) |
| Tier-count chip | proposed | Listed as not approved (G §10) |
| Glyph legend (dot = 1, bar = 5, shell = 0) | proposed | Seen in design references; to be reviewed separately |
| Educational information cards | proposed | A possible format for UI-12; the explanations themselves are approved |
| Heading order (`h1` followed by `h3`) | proposed | For review when UI-04 is defined |
| Emoji in visible labels and accessible names (such as `📦 Export`) | proposed | For review when UI-04 is defined |
| Theme menu Escape and arrow-key support | proposed | For review when UI-04 is defined |
| Harden the toast reduced-motion test | proposed | Follow-up noted in PR #14 |

## E. Current progress and next task

- **Completed:** UI-01 (phase 0) and UI-02.
- **In progress:** no task; phase 1 is partially complete (UI-02 completed, UI-03 not started).
- **Blockers:** none.
- **Unresolved decision:** where the Export trigger goes (floating or in the viewer header), to be decided with the UI-04 layout proposal.
- **Next task: UI-03.** Every later visual task builds on the design system being applied to the existing components, its scope and acceptance criteria are already approved, and the repository confirms that it has not started. See its entry in section C.

### Plan-change log

| Date | Change | Rationale |
|---|---|---|
| 2026-10-23 | Moved the roadmap from `docs/REDESIGN_ROADMAP.md` to `docs/plans/ui-redesign-roadmap.md`, added this tracker (sections A–F) with stable task IDs, and kept the approved requirements unchanged in section G. The old stage status table was replaced by section C, and its status values (Planned, In progress, Implemented, Verified, Deferred) by those in section A, where `completed` requires verified acceptance criteria. | One concise source of truth that a new session can resume from |
| 2026-10-23 | Split Stage 3 into UI-05 (initial value, Clear, significant-digit count) and UI-06 (Random, stepper presets, custom increment). | Two smaller, independently reviewable pieces of work |
| 2026-10-23 | Scheduled UI-08 (persistence, from Stage 6) before UI-09 (tier guides, from Stage 5). | Stage 5 must use the persistence mechanism that Stage 6 owns (G §4.7), so persistence has to come first |
| 2026-10-23 | Recorded the verified statuses: UI-01 and UI-02 completed (PRs #12 and #14), UI-03 not started. | Checked against the code, tests and Git history |

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
