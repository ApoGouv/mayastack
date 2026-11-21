# MayaStack UI Redesign Roadmap

This document is the single source of truth for the agreed MayaStack UI redesign: its decisions, tasks, progress and next step. Sections A–F track the plan; section G keeps the approved requirements, unchanged, as the detailed reference for every task.

Two companion documents hold the plan's history:

- [`ui-redesign-history.md`](ui-redesign-history.md): the append-only plan-change log.
- [`ui-redesign-task-records.md`](ui-redesign-task-records.md): the preserved records of completed tasks, as historical evidence.

This roadmap stays authoritative for current status (section C's table), sequence, dependencies and decisions.

## A. Purpose and working rules

The goal is to evolve MayaStack into a modern, approachable, accessible and visually distinctive Mayan numeral converter, while preserving the correctness and reliability of its existing functionality.

This roadmap does not authorize implementation of every listed task. Each task requires a separate, explicitly requested piece of work, following `CLAUDE.md` and the workflow in section G §11.

### Working rules

- Verify this roadmap against the current repository state at the beginning of every redesign task.
- Preserve agreed decisions unless they are explicitly revised.
- Do not infer approval from a suggestion or an old conversation summary.
- Do not silently expand the scope.
- Do not mark work complete until its acceptance criteria and required validation have been verified.
- Record deviations, blockers and changes to the plan in the plan-change log ([`ui-redesign-history.md`](ui-redesign-history.md)), by appending entries; never rewrite existing ones.
- Keep completed tasks' records as historical evidence in [`ui-redesign-task-records.md`](ui-redesign-task-records.md), without rewriting them; add a final status or later facts as separate notices. Section C's status table is the single authoritative location for task status.
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

By default, each task has its own branch and pull request. Closely related tasks may share one branch and one pull request as an exception, only with the user's approval, and each such grouping is recorded in the plan-change log ([`ui-redesign-history.md`](ui-redesign-history.md)). The approved exceptions so far:

| Group | Tasks | Reason |
|---|---|---|
| Input controls | UI-05, UI-06 | Same phase; UI-06 depends on UI-05 and changes the same number input |
| Preferences and tier guides | UI-08, UI-09 | Same phase; UI-09 is the first feature to use the UI-08 persistence mechanism (G §4.7). Separated on 2026-10-31: UI-08 was merged alone in PR #23, and UI-09 continues on its own branch, `feat/ui-09-tier-guides` (plan-change log) |
| Viewer refinement and annotations | UI-13, UI-10 | One combined phase (2026-10-31). UI-13's viewer and zoom refinement comes first, so that UI-10's annotations are built on the refined viewer instead of being reworked for new positioning, scaling, interactions, responsive behaviour and accessibility. UI-13's slices 1–4 were merged on 2026-11-01 in PR #25 from the shared branch `feat/ui-13-viewer-refinement`, which that pull request ended; UI-13's slice 4.1 followed on its own branch, `feat/ui-13-resize-anchoring`, merged in PR #26, and slice 5a on `feat/ui-13-viewer-header-toolbar`, merged in PR #28. UI-13's next refinements (the heading icon reassignment, the compact zoom toolbar and slice 5b) share the branch `feat/ui-13-viewer-refinements` and one pull request, one commit and review checkpoint each (approved 2026-11-03); slice 5c follows on the same branch, in the same way (2026-11-04), and so does the viewer paper and interior padding refinement, before slice 5d (2026-11-04). UI-10's branch is decided when it starts (plan-change log). Recorded 2026-11-15, from the branch's history: the same branch also holds UI-13's DOM naming refinement, slice 6 and the 125% level, then UI-10's annotation work (`9ca31a6` to `0737429`), and ends with UI-13's slice 5e, the sticky desktop viewer, each its own commit with a review checkpoint, in one pull request; slice 5d is deferred. Merged on 2026-11-15 in PR #29 (merge `ec05880`), which completed both tasks and ended the branch |

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
- **Viewer (UI-13, approved 2026-11-01):** follows the third design-reference concept's viewer within the existing 5/7 grid: a full-width stage in the `canvas` token, a centred slab (the numeral's SVG, with a screen-only edge and shadow) and a header with a compact zoom toolbar. 100% zoom is 1 CSS pixel per SVG unit at every viewport width; the nine zoom steps stay from 25% to 400% (25%, 50%, 75%, 100%, 125%, 150%, 200%, 300% and 400%; 125% was added on 2026-11-07, plan-change log). Wheel, Ctrl + wheel, browser zoom and touch scrolling stay native. The renderer, glyph geometry and exported artwork are unchanged.
- **Viewer aids (UI-13, shipped in PR #29):** a tier-direction indicator beside the viewer heading ("Top: 20ⁿ ↓ Bottom: 20⁰"), and a compact glyph key under the stage (Shell = 0, Dot = 1, Bar = 5), drawn with the actual glyph components in `accent-fg`, labels in `fg-muted`. Both are screen-only and shown only with a result.
- **Tier annotations (UI-10, shipped in PR #29):** a "Show Tier Annotations" switch in the settings panel's "Viewer guides" group, off by default and remembered (`mayastack:showTierAnnotations`). When on, two screen-only gutters beside the paper label each tier: its power of 20 on the start side, and, in Number mode only, its base-20 digit in brackets (`[7]`) on the end side; in Date mode the end gutter stays empty, so the paper stays centred. The gutters are 48 px wide, take the paper's colour as shown (opaque), stick to the stage's edges while it scrolls sideways, and are hidden where the stage is narrower than 31rem. They are hidden from assistive technology, let the pointer through and are never exported. The labels are 10 px at 25% zoom, and hidden during a zoom animation, fading back in afterwards. Since the annotation-label contrast correction (PR #33, merge `eadc357`), their inks are derived from the gutter's shown colour, independently of the theme, with at least 4.5:1 for both labels (section D). The exportable grid, the Place Tier Guides and the Dividing Hairlines stay independent settings.
- **Sticky desktop viewer (UI-13 slice 5e, shipped in PR #29):** on screens at least 64rem wide and 40rem tall (the `sticky-viewer` variant in `src/index.css`), the viewer card sticks 1rem below the top of the screen while the page scrolls, within its grid area, never over the footer; elsewhere it stays in the flow. The threshold follows the provisional stage height; slice 5d, which would change it, is deferred (section D). Since UI-11 (PR #32, merge `f323650`), the stage's desktop minimum is 24rem instead of 28rem, so the card stays in view at the end of the page on short screens (UI-11's record).
- **Export placement (UI-11, shipped in PR #32):** where the sticky layout applies (the `sticky-viewer` variant's query, `STICKY_VIEWER_QUERY` in script), Export is in the viewer's header, after the zoom controls, with its panel opening below it, so it never covers the stage; in non-sticky layouts it floats in the corner of the screen, as before. Only one Export control is rendered, and it moves when the screen crosses the threshold. The export formats, sizes and output are unchanged. Accepted known limitation: crossing the threshold while the Export menu is open closes the menu, loses focus inside it and resets custom size text that is not yet valid (UI-11's record).
- **Material (UI-15, revised on 2026-11-18; approved design, not implemented):** four opaque, theme-independent presets (Limestone, the default for users without saved colours, Dark Stela, Obsidian Basalt and Weathered Limestone), shown as diagonally split tiles in a native radio group, with a separate Custom button tile that opens a modal Custom Material dialog working on a draft. Custom pairs need at least 3:1 contrast between background and glyphs; presets target at least 7:1. No alpha or opacity control. Export (decided 2026-11-21): the applied material stays the exported background and glyph colours, as the colour settings are today; the Custom Material dialog's preview and unapplied draft never reach an export; the adaptive grid colour is on screen only, so exports keep the `#ddd` grid and their existing markup and IDs. Details in UI-15's entry (section C).
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
| UI-10 | Screen-only annotations (evaluate, then implement if suitable) | 8 Viewer refinement and annotations | completed | UI-09, UI-13 | 5 |
| UI-11 | Export controls in the redesigned workspace | 6 Export | completed | UI-04 | 6 (export) |
| UI-12 | Educational explanations | 7 Education | not started | UI-04 | 7 |
| UI-13 | Viewer interaction polish | 8 Viewer refinement and annotations | completed | UI-04, UI-09 | 8 |
| UI-14 | Final responsive, accessibility, regression and visual validation | 9 Final validation | not started | UI-01–UI-13, UI-15 | 9 |
| UI-15 | Material presets and settings-panel refinement | 10 Material presets | not started | UI-08, UI-09, UI-10, UI-11, UI-13; the early annotation-label contrast check only, not UI-14 as a task (its entry), and the separate annotation-label contrast correction (section D, merged in PR #33) | none (new) |

By default, each task has its own branch and pull request. The approved exceptions, currently UI-05 with UI-06, UI-08 with UI-09 (separated after UI-08's merge), and UI-13 with UI-10 (whose first shared branch ended with PR #25, which merged UI-13's slices 1–4; UI-13's remaining refinements and UI-10's annotations were then merged together from `feat/ui-13-viewer-refinements` in PR #29), are listed in section A, "Branches and pull requests".

**Order of work (revised 2026-10-31):** UI-08, then UI-09, on their shared branch; then the combined phase 8, UI-13 followed by UI-10, on its shared branch; then UI-11 and UI-12; then UI-14. Phase numbers identify the original roadmap phases and are not execution-order numbers. The combined phase 8 is intentionally scheduled before phases 6 and 7; existing phase numbers and task IDs remain unchanged. Only the order of work and UI-10's dependency on UI-13 changed (plan-change log). UI-15, approved on 2026-11-01, comes after the combined phase 8 (UI-13 and UI-10); its place relative to UI-11 and UI-12 is not yet decided (plan-change log); the proposed sequence below places it after UI-11. The combined phase 8 was completed on 2026-11-15, when UI-13 and UI-10 were merged in PR #29. Revised on 2026-11-18 (plan-change log): UI-15 comes after UI-11 and after the annotation-label contrast prerequisite (UI-15's entry, "Order of work"); its place relative to UI-12 stays undecided. Update (2026-11-21): both prerequisites are met (UI-11 in PR #32; the contrast correction in PR #33).

**Proposed sequence (2026-11-01):** the approved working direction after the UI-13 viewer investigation, not a record of completed work; each slice stays subject to review and adjustment (plan-change log):

1. Close and manually approve UI-13 slices 1–4. Done: merged in PR #25 on 2026-11-01.
2. UI-13 slice 4.1, resize anchoring. Done: merged in PR #26.
3. The separate UI-07 breakdown layout bugfix (UI-13's entry, "Prerequisite"). Done: merged in PR #27.
4. UI-13 slice 5a, the viewer header and toolbar. Done: merged in PR #28.
5. On the branch `feat/ui-13-viewer-refinements` (approved 2026-11-03), in this order, each its own commit with a review checkpoint, in one pull request (items 5–9 were merged together in PR #29 on 2026-11-15, merge `ec05880`):
   1. The heading icon reassignment: `Layers` for the viewer, `functions` for the base-20 card. Done: committed in `720eeb2`.
   2. The compact zoom toolbar refinement. Done: committed in `0cc54af`, reviewed and approved.
   3. UI-13 slice 5b, the tier-direction indicator. Done: committed in `f8e3687`.
6. UI-13 slice 5c, the compact glyph key, also on `feat/ui-13-viewer-refinements` (2026-11-04), its own commit with a review checkpoint. Done: reviewed and approved, committed in `f928cef`.
   - Then the viewer paper and interior padding refinement (2026-11-04), on the same branch, its own commit with a review checkpoint, before slice 5d. Done: committed in `b2f05ef`, with the full-width tier-guide bands and hairlines.
   - Then UI-13 slice 6, the zoom animation (2026-11-06), on the same branch, its own commit with a review checkpoint, after the DOM naming refinement (`b6c779b`) and before slice 5d. Reviewed and committed in `edc4db0`. Refined on 2026-11-07, in the same slice, before its commit: smoother timing and the reduced-motion anchoring fix; press-and-hold zoom buttons were tried and removed after the independent review (click-only buttons, shortcuts ignoring key auto-repeat).
   - Then the 125% zoom level (2026-11-07), on the same branch. Done: committed in `1930154`, its browser expectations in `2eeda63`.
7. UI-13 slice 5d, hybrid stage sizing from `lg`. Deferred (2026-11-15) to a later review, not implemented; it is not a dependency of any open task, and UI-13 was completed without it (section D). Slice 5e went ahead on the provisional stage height.
8. UI-13 slice 5e, the conditional sticky viewer from `lg`. Done: committed in `e606c38` on `feat/ui-13-viewer-refinements`, the branch's final slice, and merged in PR #29.
9. UI-10, tier annotations. Done: committed on the same branch, before slice 5e (`9ca31a6` to `0737429`), and merged in PR #29.
10. UI-11, including the Export trigger's overlap. Done: merged in PR #32 on 2026-11-20 (merge `f323650`).
11. UI-15, material presets and settings refinement. Revised on 2026-11-18 (plan-change log): after UI-11, and before UI-15 starts, the annotation-label contrast browser check, one check from UI-14's inherited validation, is brought forward on its own; UI-14 itself stays at item 12, with its status and dependencies unchanged. If the check confirms an issue, a separate, focused correction is made before UI-15 ships, outside UI-15. UI-15 then proceeds in slices S1–S7 (UI-15's entry). Update (2026-11-21): the check was run on 2026-11-20 and confirmed the issue (UI-14's entry); the separate correction is approved and comes next, then UI-15. Update (2026-11-21, after PR #33): the correction was merged in PR #33 (commit `c8ebf67`, merge `eadc357`); UI-15 is next, starting with the export golden baseline (UI-15's entry).
12. UI-14, final validation.

UI-12 is not placed in this sequence; its place, and UI-15's relative to it, stay to be decided. UI-13's optional slice 6, the zoom animation, was placed on 2026-11-06, under item 6 above.

**Status of the sequence (2026-11-15):** items 1–6, 8 and 9 are done; item 7, slice 5d, is deferred and is not waited for. The next item is UI-11 (item 10). UI-12's position stays undecided until the user approves one. Update (2026-11-18): UI-11 remains next; UI-15 waits for UI-11 and the annotation-label contrast prerequisite (item 11). Update (2026-11-21): items 1–6 and 8–10 are done (UI-11 in PR #32), and the brought-forward contrast check has been run and confirmed the issue; the next step is the separate annotation-label contrast correction, then UI-15 (item 11). UI-12's position stays undecided. Update (2026-11-21, after PR #33): the correction is merged (PR #33, merge `eadc357`); the next item is UI-15 (item 11). UI-12's position stays undecided.

References to "Stage N" in section G correspond to the tasks in the "Old stage" column. Unless a task says otherwise, its validation is: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, `git diff --check`, and a visual review at 375, 768 and 1280 px in the light and dark themes. Export-related tasks also follow G §6 and §9.

### Task entries

Open tasks keep their entries below. The entries of completed tasks, UI-01 to UI-11 and UI-13, are preserved as historical records in [the task records](ui-redesign-task-records.md); references in this document to a completed task's entry ("UI-13's entry") refer to its record there. The status table above is authoritative.

### UI-12: Educational explanations

- **Status:** not started.
- **Scope and acceptance:** G §4.9 and §8, Stage 7, including whether the date mode needs a short explanatory note.
- **Glyph key and glyph legend (2026-11-01, plan-change log):** the compact visual glyph key under the viewer stage (Shell = 0, Dot = 1, Bar = 5), drawn with the actual glyph components, is part of UI-13 as slice 5c, not of this task. UI-12 remains responsible for the broader educational glyph-legend feature, separate from that key, which stays the section D proposal "Glyph legend", a possible format for this task; its Maya names for the glyphs would need sources.
- **Update (2026-11-15):** the compact glyph key shipped with UI-13 in PR #29 (slice 5c, `f928cef`). UI-12's position in the sequence is undecided (section C).
- **Next action:** define the topics and sources when the task is selected.

### UI-14: Final responsive, accessibility, regression and visual validation

- **Status:** not started.
- **Scope and acceptance:** G §8, Stage 9, and G §9. Their 500-digit references apply to the current maximum of 128 digits, 99 tiers (UI-07).
- **Inherited validation (recorded 2026-11-15):** checks that the completed tasks' records leave open, or that only a final pass can cover. Each must be run and its result recorded, not assumed:
  - **Full suites:** the full `npm test` and `npm run test:e2e` on the final `main`. Several UI-13 slices and UI-10's gutter work recorded focused runs only, with the full suites not run (their records, "Validation").
  - **Tests recorded as written but not yet run:** UI-10's seam tests (rendered pixels at device scale factors 1 and 1.5, the bleed's shadow composition, unchanged boxes and scroll geometry, no bleed below 31rem), and slice 5e's sticky-viewer browser tests, with the card heights they measure. The records predate PR #29's merge and do not say whether these ran before it.
  - **Manual browser review:** the annotation gutters (UI-10's record: "Manual browser review is pending"), including the zoom seam at 125% and 150% display scaling; and slice 4.1's resize anchoring with classic scrollbars appearing or disappearing, and fractional scroll positions at Windows display scaling of 125–150%, in headed Chrome or Firefox (UI-13's record).
  - **Sticky viewer:** its fit and behaviour at the tested desktop sizes, against the floating Export trigger and against UI-11's final solution (UI-11's entry). If the stage sizing changes (slice 5d, deferred), re-evaluate the 40rem threshold. Update (2026-11-21): UI-11's final solution is merged (PR #32): Export is in the viewer's header where the viewer sticks, and floats elsewhere; the final pass checks the sticky card, its header, Export and the zoom controls against that placement, including the 24rem stage minimum on short sticky screens (UI-11's record).
  - **Tier annotations:** that they never appear in SVG or PNG exports; their behaviour at the 31rem threshold; Date mode's empty end gutter; and the contrast of their labels, which use theme colours over the user's paper colour, against the backgrounds the app offers, including UI-15's presets. Whether that contrast is sufficient is under investigation, not established (`docs/DESIGN_SYSTEM.md` §5). Update (2026-11-18): the label-contrast check is brought forward, to run in the browser after UI-11 and before UI-15 starts (UI-15's entry, "Order of work"). Only this check runs early: UI-14's status (not started) and its dependencies are unchanged, and UI-15 requires this specific check, not the completion of UI-14. The early check's result is recorded here, in this entry, when it has been run. UI-15's reconciliation report calculated potentially low contrast for some cross-polarity material and theme combinations; these are calculations, not browser measurements, and the issue is neither confirmed nor fixed. If the check confirms it, the correction is a separate, focused fix before UI-15 ships, not part of UI-15. UI-14's final pass still covers the labels against the shipped presets.
    - **Early check result (run 2026-11-20, recorded 2026-11-21): the issue is confirmed.** Method: the production build of the merged UI-11 code, served by `vite preview`, in Playwright's Chromium at 1280 × 800, Number mode with tier annotations on, at 100%, each theme and paper colour set through the saved preferences before the page loaded. The labels' computed `color` was compared with their gutter's computed `background-color` (WCAG 2.x contrast); the labels' combined opacity was 1 in every case. Five cases were cross-checked against painted pixels in screenshots at device scale factor 2: the gutter and the label's strongest pixels matched the computed colours exactly. The labels are 12 px at weight 400 (10 px at 25%), normal text, so the threshold is 4.5:1 (SC 1.4.3). Ratios, power (`fg-subtle`) / digit (`accent-fg`), failing values in bold:

      | Paper (gutter) | Light theme | Dark theme |
      |---|---|---|
      | White `#FFFFFF` (today's default) | 6.02 / 6.44 | **2.78 / 1.74** |
      | Limestone `#FAF8F5` | 5.68 / 6.08 | **2.62 / 1.64** |
      | Weathered Limestone `#C7BC9F` | **3.19 / 3.41** | **1.47 / 1.09** |
      | Dark Stela `#1D2026` | **2.71 / 2.53** | 5.87 / 9.40 |
      | Obsidian Basalt `#090B0E` | **3.27 / 3.06** | 7.09 / 11.35 |
      | Black `#000000` | **3.49 / 3.26** | 7.56 / 12.10 |
      | Mid grey `#777777` | **1.34 / 1.44** | **1.61 / 2.58** |
      | Transparent (`a` 0, shows `canvas`) | 5.35 / 5.72 | 6.69 / 10.72 |

      The defect exists on the current `main`, independently of UI-15: today's default white paper fails in the dark theme. It is not limited to cross-polarity combinations: Weathered Limestone fails in the light theme too, and mid-tone papers fail in both themes. Not covered: other browsers, forced-colours mode, and translucent backgrounds between `a` 0 and 1. The separate correction (section D, "Annotation-label contrast correction") was approved on 2026-11-21 and is not yet implemented. UI-14 remains the final validation task (section C, item 12): only this check ran early, its status and dependencies are unchanged, and its final pass re-checks the labels, after the correction, against the shipped presets and in both themes.

      Update (2026-11-21, after PR #33): the correction is implemented and merged in PR #33 (commit `c8ebf67`, merge `eadc357`). The labels' inks are now derived from the gutter's shown colour, independently of the theme, so a paper gives the same inks in both themes, and both labels reach at least 4.5:1 on every opaque background (section D; `docs/DESIGN_SYSTEM.md` §5). The ratios above were measured before the correction and are kept as its evidence. UI-14's final pass, unchanged, re-checks the corrected labels against the shipped presets in both themes.
  - **Recorded for review, not changed:** the apparent larger label spacing at 25% (UI-10's record, 2026-11-14).
- **Next action:** run when all other tasks are completed or explicitly deferred.

### UI-15: Material presets and settings-panel refinement

- **Status:** not started. Scope approved on 2026-11-01, after a read-only investigation of the settings panel, the colour pickers and design concepts 3 and 4 (plan-change log); the section D item "Material colour presets" is now this task. Scope revised on 2026-11-18, after a read-only reconciliation report reviewed by the user (plan-change log): the revised scope below is current. The original scope of 2026-11-01 is kept further down as history, with its superseded decisions marked. No slice has been implemented.
- **Order of work (revised 2026-11-18):** UI-11 comes first; UI-15's slices S1 and S2 are not started early. Then, in this order:
  1. Complete UI-11.
  2. Bring forward one check from UI-14's inherited validation: the browser verification of the annotation-label contrast (UI-14's entry, "Tier annotations"), its result recorded in UI-14's entry. UI-15 requires this check only, not the completion of UI-14, whose status and dependencies are unchanged; UI-14 still follows UI-15.
  3. If that verification confirms an issue, make a separate, focused correction before UI-15's material selector ships. The correction is not part of UI-15 and is not folded into it (section D, "Annotation-label contrast correction").
  4. Start UI-15 only after these prerequisites, in the slices below.

  Its place relative to UI-12 stays undecided. It stays before UI-14's final validation, and separate from UI-09, whose guide rendering it does not change. (Before this revision: after the combined phase 8, with its place relative to UI-11 and UI-12 not yet decided.)
- **Prerequisite: annotation-label contrast.** UI-15's reconciliation report calculated potentially low contrast for the tier annotation labels (theme colours `fg-subtle` and `accent-fg` over the paper colour) in cross-polarity combinations of material and theme. These figures are calculations, not browser measurements: the issue is not browser-confirmed and not fixed, and no colour change has been decided (`docs/DESIGN_SYSTEM.md` §5). Update (2026-11-21): UI-11 is completed (PR #32), and the brought-forward browser check, run on 2026-11-20, **confirmed** the issue, beyond the cross-polarity combinations (UI-14's entry, "Early check result"). The separate correction (section D) was approved on 2026-11-21 and is pending; UI-15 starts after it is merged. Update (2026-11-21, after PR #33): **met.** The correction was merged in PR #33 (commit `c8ebf67`, merge `eadc357`), outside UI-15.
- **Revised scope (approved 2026-11-18):**
  - **Material catalogue:** four coordinated presets, all opaque, with background-to-glyph contrast calculated from their colours (WCAG 2.x formula). Their colours are the approved values of 2026-11-01, unchanged; no other preset colours are added.

    | Preset | Background | Glyph | Contrast |
    |---|---|---|---|
    | Limestone (the default for users without saved colours) | `#FAF8F5` | `#14171D` | 16.93:1 |
    | Dark Stela | `#1D2026` | `#F2CA50` | 10.37:1 |
    | Obsidian Basalt | `#090B0E` | `#E8DFD1` | 14.92:1 |
    | Weathered Limestone | `#C7BC9F` | `#101319` | 9.85:1 |

    Classic Paper is dropped from the selectable catalogue. Choosing a preset sets both the background and the glyph colour. The selected preset is identified by an exact match of the current colour pair against the catalogue; no preset name is saved, and the existing `mayastack:backgroundColor` and `mayastack:glyphColor` keys stay the only saved source of the colours. Saved fully opaque pairs that match no preset, such as a saved pure-white and black pair, are shown as Custom, not silently replaced. Colours are saved only when the user changes them, so users who never changed them have no saved colours and receive Limestone.
  - **Opaque-only colour model:** the presets and custom background and glyph colours are all opaque. There is no alpha slider or opacity control, and translucent custom materials are not supported. Backward compatibility for translucent settings is explicitly not required, and no compatibility logic is added solely to preserve them: such settings are not preserved. A transparent-background PNG export is a separate proposal (section D), not part of this task.
  - **Persistence (approved design requirement, not implemented):** the existing `mayastack:backgroundColor` and `mayastack:glyphColor` keys and their JSON RGBA representation (`{"r":…,"g":…,"b":…,"a":…}`, as written and strictly validated by `serializeRgbaColor` and `parseRgbaColor` in `src/utils/colors.ts`) are kept. New opaque colours are saved with `a: 1`. The UI and the material model may use opaque RGB values internally, converting at the persistence boundary. No new RGB or hex storage format and no migration are introduced. Saved pairs in which both colours are fully opaque stay supported.
  - **Pair-level fallback (approved design requirement, not implemented):** the background and glyph colours are read as one coordinated material pair. A complete, valid, opaque saved pair is kept. If one colour is saved and the other is missing, or either saved colour is invalid or translucent (`a < 1`), the complete Limestone pair is used, never one saved colour mixed with one default colour. (Today each colour falls back to its own default independently.) The fallback is not silent: a non-blocking, user-visible notice explains that the saved material was unsupported and that Limestone has been selected. The notice's exact presentation is defined in S1/S2. Nothing saved at all is not an unsupported material: users without saved colours receive Limestone without a notice.
  - **Persistence recovery (confirmed 2026-11-21, plan-change log):** no saved pair: Limestone, silently. A complete, valid, opaque pair: preserved. A partial, invalid or translucent pair: the complete Limestone pair, with the non-blocking notice above, and both saved colour entries are cleared after initialization. As a result, the notice does not recur on later loads, provided the storage operations succeed. No persistent dismissal mechanism is added. This clearing is the one storage write not caused by a user's change to the colours.
  - **Material selector:** the four presets as compact rectangular tiles, each split diagonally from lower left to upper right: the upper-left triangle in the glyph colour, the lower-right triangle in the background colour. Drawn with CSS, without SVG artwork for the tiles. Each tile has a visible border. The selected state does not rely on colour alone: an accent ring and a check indicator. Focus uses the shared focus ring.
  - **Selector semantics:** the four presets are a native radio group. Custom is a separate button tile, not a radio: it opens the Custom Material dialog, and arrow-key navigation through the presets never triggers it. When the current pair matches no preset, no preset radio is checked and the Custom tile communicates that the current selection is Custom.
  - **Custom Material dialog:** a native `<dialog>`, opened modally; centred on desktop and a bottom sheet below `sm`. Closing it returns focus to the Custom tile. Escape behaves as Cancel; Cancel discards every draft change. The applied viewer does not change while the draft is edited: Apply is the only action that updates the selected background and glyph pair. It contains a labelled background colour picker and a labelled glyph colour picker, both opaque-only (react-colorful is kept; no new dependency and no custom picker); a labelled hex input for exact entry, where invalid input leaves the draft colour unchanged and shows a visible validation error, never silently coerced (implementation constraint below); a live preview of the draft; the visible contrast ratio with an accessible pass or fail explanation; and Apply and Cancel.
  - **Hex input implementation constraint:** react-colorful's `HexColorInput` sanitises its input (it strips invalid characters and reverts to the last valid colour), so it must not be assumed suitable. Whatever input the implementation uses must keep invalid draft text while the user edits; never silently strip or coerce invalid characters into a different valid colour; leave the actual draft colour unchanged until a complete, valid hex value is entered; and show a clear validation error for invalid input. The input component is chosen in S5, not now.
  - **Contrast rules:** custom materials need at least 3:1 between background and glyph colours; Apply does not proceed while the unrounded ratio is below 3:1. Presets target at least 7:1. There is no separate 4.5:1 advisory tier. Neither colour is ever adjusted automatically to make a pair pass. The ratio is shown truncated to two decimal places, never rounded up. A failing ratio is explained in visible text, not by colour alone. Changes of the pass or fail state are announced, without announcing every ratio update while a colour is dragged. These rules cover background-to-glyph contrast only and make no claim of whole-application WCAG conformance. The existing contrast utilities (`contrastRatio` and `relativeLuminance` in `src/utils/guideColors.ts`) are reused where appropriate; the exact implementation is decided in the slices.
  - **Custom preview:** `MayanRenderer` gains optional background and glyph colour props, falling back to the context's values when they are absent. The dialog's preview uses the draft colours, is fixed at 100% scale inside a capped, scrollable area, does not receive the main viewer's `exportRef`, and has no grid. `MayanRenderer` therefore supports independently suppressing the grid for the preview, regardless of the main viewer's Show Grid setting. The preview never changes the main viewer's grid setting. No unique SVG grid-pattern IDs are introduced, and the existing exported SVG IDs and markup are unchanged. Confirmed on 2026-11-21 (plan-change log): the preview's grid is always suppressed, so the page never holds a duplicate SVG grid-pattern ID, and the export markup, IDs and mechanism are unchanged.
  - **Theme independence:** one shared material catalogue for the light and dark themes. Changing the application theme never replaces the selected material or changes its background colour, glyph colour or saved values. The stage and slab appearance in each theme is reviewed visually during implementation; theme-specific catalogues would need a separately reviewed requirement.
  - **Settings-panel header:** the panel begins with a proper header: the tune/settings icon and the title "Stela Material & Glyph Settings", following the icon-and-title header pattern that the viewer and base-20 cards currently have (`docs/DESIGN_SYSTEM.md` §9), not a title as an isolated heading inside the settings content, and not without the icon.
  - **Retained from 2026-11-01:** the "Exported appearance" and "Viewer guides" groups; the three independent viewer-guide switches; the adaptive grid colour derived from the material background, its algorithm to be defined in implementation (on screen only since 2026-11-21: export boundary, below); a visible focus indicator on react-colorful's sliders in the shared `focus` token; the tier guides keep deriving their colours from the background; "Surprise me" deferred; no new dependencies; the existing `.mep-svg` rule, glyph geometry and export boundaries protected.
  - **Export boundary (decided 2026-11-21, plan-change log):** the applied material remains what the SVG and PNG exports show, as the background and glyph colour settings are today: export follows the colours applied to the viewer, so users with a supported saved pair keep the same exports. The Custom Material dialog's preview (its own `MayanRenderer`, without `exportRef`) and its unapplied draft never reach an export. The adaptive grid colour (S6) is on screen only: exports keep the grid's `#ddd` stroke. Theme, tier annotations and tier guides never affect an export. The export mechanism, geometry, markup and IDs are unchanged. The approved export changes stay: users without saved colours export Limestone instead of white, and unsupported saved pairs fall back to Limestone. Before S1, a golden test captures the serialized SVG export (grid off and on, both themes) as the baseline the slices are checked against.
  - **Not included:** the annotation-label contrast correction (above; merged separately in PR #33); a transparent-background export and an accessible colour suggestion (section D); "Surprise me" (section D); unique SVG grid-pattern IDs or any change to the exported SVG IDs and markup, which would need separate approval; theme-specific catalogues.
- **Implementation slices (approved order, 2026-11-18):** none implemented. The default workflow: one feature branch for UI-15 and one pull request for the whole task (section A's default of one branch and pull request per task), with each slice, S1 to S7, its own commit and review checkpoint. Whether any slice ships in a separate pull request is decided when implementation begins. The user handles staging, committing, pushing and pull requests. This documentation reconciliation is not part of that branch: it stays its own docs-only branch and pull request. *(This sentence refers to the reconciliation of 2026-11-18, merged in PR #31. The reconciliation after PR #33, on 2026-11-21, is on UI-15's branch, as its first change: plan-change log.)*
  - **S1:** the material model and contrast utilities, with the persistence boundary and the pair-level fallback above.
  - **S2:** the Limestone default for users without saved colours, and the fallback notice.
  - **S3:** the material selector: the preset radio group, the Custom button tile and the selected state.
  - **S4:** the Custom Material dialog: draft state, preview and contrast enforcement.
  - **S5:** picker accessibility: the focus treatment, group labels and the hex input.
  - **S6:** the adaptive grid colour, preserving the existing SVG export IDs and markup; any future proposal to change them needs separate approval. Revised on 2026-11-21: on screen only (export boundary, above); the exported grid keeps its `#ddd` stroke.
  - **S7:** settings-panel polish, including the icon-and-title header. Implementation considerations, not completed work:
    - Review the heading-font audit: the viewer heading is now "Mayan Numeral Stack", while `docs/DESIGN_SYSTEM.md` §10 still names the older "Mayan Numeral".
    - If the redesigned settings title uses the heading font, update `HEADING_FONT_ELEMENTS` in `e2e/design-foundation.e2e.ts` and `docs/DESIGN_SYSTEM.md` §10.
    - Keep the settings `fieldset`'s accessible name when its `legend` is relocated or restructured into the header.
- **To define in the slices' detailed scope:** the adaptive grid colour's algorithm and contrast targets (S6); the panel's exact markup and styling within the approved direction (S7); the fallback notice's presentation (S1/S2; its dismissal is not remembered, decided 2026-11-21: "Persistence recovery", above); how the preview suppresses the grid (S4); the hex input component, within the constraint above (S5); the files each slice changes, identified in its preflight. The persisted format is not open: it stays the existing JSON RGBA (above).
- **Superseded on 2026-11-18** (the original text is kept below, marked):
  - The five-preset catalogue with Classic Paper (`#FFFFFF`/`#000000`): now four presets, without Classic Paper.
  - Preset swatches in both colour pickers, where a swatch changed only its own colour: replaced by the preset tiles, which set both colours, and the Custom Material dialog.
  - The two colour pickers shown permanently in the settings panel, each with its popover, and focus restored to a picker's trigger after Escape: replaced by the Custom Material dialog, whose closing returns focus to the Custom tile.
  - "Any colour can still be chosen" (unrestricted contrast, alpha included): custom pairs are opaque and need at least 3:1; presets target at least 7:1.
  - Active-preset detection by exact RGBA pair: now an exact match of the opaque colour pair.
  - "Saved colours are never overwritten": still holds for fully opaque saved pairs; a saved pair in which either colour is missing, invalid or translucent now falls back to the complete Limestone pair, with a user-visible notice.
  - "A readable colour and opacity value", with the hex input left to evaluate: no opacity value; a labelled hex input is included.
  - The visual reference's "the five presets are unchanged": the catalogue is now the four presets above.
  - The order of work's undecided place relative to UI-11: now after UI-11 and the annotation-label contrast prerequisite.
  - In section G (kept as first written; its preface records this): §2's "Customizable background and glyph colours, including alpha"; §4.7's "Preserve existing settings and customization options", for saved pairs that are incomplete, invalid or translucent; §8 Stage 6's "Existing user customizations are not silently discarded", to the extent that it conflicts with the opaque-only fallback; §9's "Preserve grid, background colour, glyph colour, and theme functionality", insofar as it implies support for translucent materials; and §10's listing of material colour presets as not approved, already overtaken by the approval of 2026-11-01.
- **Superseded on 2026-11-21** (export boundary, above; plan-change log): the original scope's "Adaptive grid colour… changes the exported SVG and PNG appearance with the grid on, as approved" (below): the adaptive grid colour is now on screen only, and exports keep the `#ddd` grid. The original text is kept below, marked.
- **Original approved scope (2026-11-01), kept as history:**
  - **Material presets:** *Superseded on 2026-11-18 (four presets, without Classic Paper; see above).* Coordinated pairs; choosing one sets both the background and the glyph colour. The selected preset is visibly indicated. The catalogue, all opaque (alpha 1), with WCAG 2.x contrast between background and glyphs:

    | Preset | Background | Glyph | Contrast |
    |---|---|---|---|
    | Limestone (the new default) | `#FAF8F5` | `#14171D` | 16.93:1 |
    | Dark Stela | `#1D2026` | `#F2CA50` | 10.37:1 |
    | Obsidian Basalt | `#090B0E` | `#E8DFD1` | 14.92:1 |
    | Classic Paper | `#FFFFFF` | `#000000` | 21:1 |
    | Weathered Limestone | `#C7BC9F` | `#101319` | 9.85:1 |

  - **Swatches in both colour pickers:** *Superseded on 2026-11-18 (preset tiles and the Custom Material dialog).* The background picker shows the presets' background colours and the glyph picker their glyph colours, from the same single definition of the presets. A swatch changes only its own colour, never the other.
  - **Custom colours and active-preset detection:** *Partly superseded on 2026-11-18 (opaque only, a 3:1 minimum for custom pairs, exact opaque pair matching); the saved keys and the absence of a saved preset name are retained.* Any colour can still be chosen. The active preset is found by an exact match of the current background and glyph colours, as RGBA pairs, against the catalogue; no preset name is saved. A manual change to either colour that leaves the pair matching no preset makes the material Custom, and the custom colours are kept; a preset can be chosen again at any time. The existing `mayastack:backgroundColor` and `mayastack:glyphColor` keys stay the only saved source of the colours.
  - **New default, Limestone:** *Retained, except that a saved pair with a missing, invalid or translucent colour now falls back to the complete Limestone pair, with a notice (2026-11-18).* Background `#FAF8F5` and glyphs `#14171D`, replacing white and black for users without saved colours. Saved colours are never overwritten. This changes those users' exported SVG and PNG appearance, as approved.
  - **Adaptive grid colour:** *Partly superseded on 2026-11-21: the adaptive stroke is on screen only, and exports keep `#ddd` (export boundary, above).* The grid's stroke adapts to the background instead of the fixed `#ddd` (G §5.1), which is faint on light backgrounds and dominant on dark ones. This changes the exported SVG and PNG appearance with the grid on, as approved.
  - **Settings panel:** *Retained; the heading is specified on 2026-11-18 as the panel's icon-and-title header.* The heading "Stela Material & Glyph Settings" with a tune-style icon, keeping UI-09's approved hierarchy of an "Exported appearance" group and a "Viewer guides" group. The "Viewer guides" group now holds three independent switches, all screen-only and off by default: "Show Place Tier Guides:" and "Show Dividing Hairlines:" (UI-09), and "Show Tier Annotations:" (UI-10), with its hint that tier annotations are hidden on narrow viewer widths.
  - **Colour-picker refinements:** *Partly superseded on 2026-11-18: no swatches, no opacity value, and focus returns to the Custom tile; the sliders' focus indicator in the `focus` token is retained.* Accessible swatches with a visible selected state; focus-visible styling, including a visible focus indicator on react-colorful's saturation, hue and alpha sliders in the app's semantic `focus` colour token (section D); focus restored to the picker's trigger after Escape; and a readable colour and opacity value.
  - **Unchanged:** the application's light and dark theme stays independent of the material: changing the theme never replaces the chosen colours. The tier guides keep deriving their colours from the background. No new dependency.
  - **Note (2026-11-15), for the detailed scope:** the tier annotation gutters (UI-10) take the paper's colour as shown, so a preset changes their background; their labels keep the theme's `fg-subtle` and `accent-fg`. The labels' contrast over the paper colours is under investigation (UI-14's entry), not an approved requirement of this task. *Update (2026-11-21): the issue was confirmed in the browser (UI-14's entry); its correction is a separate task, approved and pending, still not part of UI-15.* *Update (2026-11-21, after PR #33): the correction is merged (PR #33): the labels now take inks derived from the gutter's shown colour, not the theme's tokens (section D).*
  - **Not included:** "Surprise me", a random choice of material, deferred (section D).
- **To define in the detailed scope (2026-11-01, kept as history):** the adaptive grid colour's algorithm and contrast targets (its inclusion is approved); the panel's exact markup and styling within the approved direction; and whether a hex input accompanies the readable value, an implementation detail to evaluate. *The hex input was decided on 2026-11-18 (included); the other two items remain open (above).*
- **Visual reference (2026-11-01):** the third design-reference concept's settings card (its heading with a tune icon, swatch groups side by side under small labels, and compact rows with the label on the left and the switch on the right) is a visual reference for this redesign. It is a reference only: not an approved specification of exact markup, and not a reason to remove or simplify existing controls, such as the colour pickers, Show Grid and the viewer-guide switches (two when this was written; three since UI-10 added Show Tier Annotations), which the concept does not show. The approved decisions above and the five presets are unchanged. *The five presets were superseded on 2026-11-18 by the four of the revised scope; the concept stays a visual reference only.*
- **Next action:** none until UI-11 is completed and the annotation-label contrast prerequisite is resolved (order of work above). Then define slice S1's detailed scope and acceptance criteria in a preflight, and stop for review after each slice. Update (2026-11-21): UI-11 is completed (PR #32) and the contrast check confirmed the issue; UI-15 waits for the separate annotation-label contrast correction to be merged. Then the export golden baseline (export boundary, above) and S1's preflight. Update (2026-11-21, after PR #33): the prerequisites are met. UI-15's branch, `feat/ui-15-material-presets`, was created from `main` at `eadc357`; its first change is this documentation reconciliation, and no slice is implemented. Next: the export golden baseline, whose approach is proposed and awaits approval, then S1's preflight.

## D. Optional and deferred ideas

None of these are committed scope. Each needs a separate decision before implementation.

| Idea | Status | Notes |
|---|---|---|
| Alternative zero glyph | deferred | Needs artwork, attribution, licensing and rendering review (G §4.6, §10) |
| Long Count date mode | deferred | Needs its own research and specification (G §10.1) |
| Material colour presets | approved | Approved on 2026-11-01 as UI-15 (section C), with preset swatches in both colour pickers, a new Limestone default and an adaptive grid colour. The historical G §10 proposal remains unchanged. Update (2026-11-18): revised to four opaque presets, without Classic Paper, shown as diagonal tiles with a Custom Material dialog, which replace the swatches (UI-15's entry; plan-change log). Update (2026-11-21): the applied material stays the exported colours; the dialog's preview and draft never reach an export, and the adaptive grid colour is on screen only (UI-15's entry, "Export boundary") |
| "Surprise me" material | deferred | A random choice from a curated set of readable material pairs, never arbitrary colours. Left out of UI-15 (2026-11-01) |
| Copy SVG code | proposed | Listed as not approved (G §10). Copies the SVG markup as text, so it could reuse `copyText` (`src/utils/clipboard.ts`); see the renderer copy and export options below |
| Separate Date tab | proposed | Listed as not approved (G §10) |
| Tier-count chip | approved | Approved and implemented by UI-07's tier badge on the base-20 card ("12 tiers · 20⁰–20¹¹"), merged in PR #22. The historical G §10 proposal remains unchanged |
| Glyph legend (dot = 1, bar = 5, shell = 0) | proposed | Seen in design references; to be reviewed separately. Update (2026-11-01): a compact key under the viewer stage is planned as UI-13's slice 5c; the broader educational legend stays with UI-12 and this proposal. Update (2026-11-15): the compact key shipped as slice 5c (`f928cef`, PR #29); the broader legend remains this proposal |
| Educational information cards | proposed | A possible format for UI-12; the explanations themselves are approved |
| Heading order (`h1` followed by `h3`) | approved | Part of UI-04: the section headings become `h2` |
| Emoji in visible labels and accessible names (such as `📦 Export`) | deferred | Reviewed with UI-04 and deferred |
| Theme menu Escape and arrow-key support | deferred | Reviewed with UI-04 and deferred |
| Harden the toast reduced-motion test | proposed | Follow-up noted in PR #14 |
| Date picker's clear button reachable with the keyboard | proposed | react-datepicker renders it with `tabIndex={-1}`; needs a replacement button in `DateInput.tsx`. Found during UI-03 |
| Lining figures in the headings | proposed | Playfair Display's default old-style figures lower the "20" in "Base-20 Representation". Found during UI-03 |
| A visible focus ring on the colour picker's sliders | approved | react-colorful shows focus only by enlarging the pointer. Found during UI-03. Approved on 2026-11-01 as part of UI-15 (section C). Retained in UI-15's revised scope (2026-11-18), slice S5 |
| Select the number on focus | proposed | Would let a click or Tab into the field replace the whole value. Not implemented: UI-05 removes redundant leading zeros instead. Found during UI-05 |
| Export trigger over the footer at the end of the page | proposed | Below 640 px, the floating trigger covers part of the footer's copyright line at the very end of the page, whenever there is a result, now also from the start because of the initial 0. Found during UI-05; see UI-11. Update (2026-11-21): below 640 px the trigger still floats, as before; UI-11 (PR #32) moved it into the viewer's header only where the viewer sticks, so this remains open |
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
| Export trigger over content while scrolling | proposed | The floating trigger can cover any content scrolled into its band, e.g. the breakdown disclosure's chevron at 768 px. UI-07 keeps keyboard focus clear of it with `scroll-padding-bottom`; a layout that never overlaps belongs to UI-11. Added 2026-10-30. Update (2026-10-31): UI-07 also reserves space below the content from 640 px, so the end of the page scrolls clear of the trigger; content still passes under it mid-scroll. Update (2026-11-01): it also covers the bottom-right corner of UI-13's viewer stage, a known limitation that UI-11 must resolve (UI-11 in section C). Update (2026-11-15): the sticky desktop viewer (PR #29) is also to be validated against it (UI-11 in section C). Update (2026-11-21): resolved where the viewer sticks, by UI-11's header placement (PR #32); in non-sticky layouts the trigger still floats, unchanged (UI-11's record) |
| Long Count period names as tier labels | rejected | The third concept's labels (e.g. "Hablatun", "K'in"), considered for UI-10's annotations and rejected on 2026-11-01: they would make unsupported calendar claims (G §2, §10.1). The annotations label powers of 20 |
| Full decimal contribution as the per-tier annotation | rejected | Decided on 2026-11-01 for UI-10: the value beside each tier is its base-20 digit (0–19). The exact contributions stay in the base-20 card's breakdown (UI-07) |
| Ctrl + wheel zoom in the viewer | approved | Ctrl + wheel remains the browser's own zoom behaviour, as approved for the UI-13 viewer design on 2026-11-01 (section B). The viewer adds no Ctrl + wheel zoom of its own |
| Press-and-hold zoom buttons | rejected | Tried in UI-13's slice 6 and removed on 2026-11-07, after the independent review: little gain for a few levels, it could not be cancelled on touch, and it cost a hook, a separate animation curve and many tests. The buttons are click-only, and the keyboard shortcuts ignore key auto-repeat (UI-13's record; plan-change log) |
| 175% zoom level and Fit width | rejected | Left out when the 125% level was added on 2026-11-07; the range stays 25% to 400% (plan-change log, 2026-11-07) |
| 140 ms ease-out zoom animation ("Option B") | superseded | The 2026-11-01 approved approach, superseded at implementation (2026-11-06 and 2026-11-07): 200 ms with `cubic-bezier(0.4, 0, 0.2, 1)`, through the Web Animations API, on the viewer's paper (UI-13's record; `docs/DESIGN_SYSTEM.md` §8) |
| Hybrid stage sizing from `lg` (UI-13 slice 5d) | deferred | Deferred on 2026-11-15 to a later review, not implemented. UI-13 was completed without it, and no open task depends on it. If it is revisited, the sticky viewer's 40rem height threshold must be re-evaluated (UI-13's record) |
| Annotation label spacing at 25% | proposed | The labels look further from the paper at 25%. Investigated on 2026-11-14: no physical gap; the labels are about 1.5 px further from the paper, smaller and centred in the fixed 48 px gutter, mainly a proportional effect. To be reviewed, not changed (UI-10's record) |
| Transparent-background PNG export | proposed | A separate export feature, recorded on 2026-11-18 during UI-15's reconciliation for future consideration. Not part of UI-15's material selection, whose materials are opaque only, and not approved |
| Accessible colour suggestion | deferred | Suggesting an accessible colour when a custom material fails the 3:1 minimum. Deferred on 2026-11-18: UI-15's Custom Material dialog never adjusts a colour automatically and explains a failing ratio in visible text instead (UI-15's entry) |
| Annotation-label contrast correction | implemented | UI-15's reconciliation report calculated potentially low contrast for the tier annotation labels in cross-polarity material and theme combinations: calculations, not browser measurements. Approved order (2026-11-18): after UI-11, UI-14's browser verification of the labels' contrast is brought forward; only if it confirms the issue is a separate, focused correction made, before UI-15 starts. Not part of UI-15; not confirmed or fixed, and no colour change decided (UI-14's and UI-15's entries). Update (2026-11-21): confirmed by the browser check of 2026-11-20 (UI-14's entry): today's default white paper gives 2.78:1 (powers) and 1.74:1 (digits) in the dark theme, Weathered Limestone 3.19:1 and 3.41:1 in the light theme, against 4.5:1. Approved on 2026-11-21, not yet implemented: label inks derived from the gutter's shown colour, independently of the theme, with at least 4.5:1 for both labels on every opaque background. Each label keeps its theme-token ink (`fg-subtle` or `accent-fg` of the polarity that suits the paper) where that reaches 4.5:1, and is otherwise moved toward black or white just enough, deterministically, with conservative rounding. The tier guides, the renderer and the exports are unchanged. A separate task, on its own branch, before UI-15. Update (2026-11-21, after PR #33): implemented and merged in PR #33 (commit `c8ebf67`, merge `eadc357`) from `fix/annotation-label-contrast`, as approved. `getAnnotationLabelColors` (`src/utils/guideColors.ts`) derives both inks from the gutter's shown, opaque colour, so the same paper gives the same inks in either theme, and both labels reach at least 4.5:1 on every opaque background. The gutters pass the inks to the labels as custom properties. The export boundary is unchanged: the applied material colours are exported; the annotation labels and the screen-only guides are not; the exported grid stays `#ddd`; SVG geometry, markup, IDs and the export mechanism are unchanged. The record is in [the task records](ui-redesign-task-records.md) |

## E. Current progress and next task

- **Completed:** UI-01 (PR #12, phase 0), UI-02 (PR #14) and UI-03 (PR #19), which complete phase 1, UI-04 (PR #20), which completes phase 2, UI-05 and UI-06 (PR #21), which complete phase 3, UI-07 (PR #22), which completes phase 4, UI-08 (PR #23) and UI-09 (PR #24), which complete phase 5, and UI-13 and UI-10, merged together in PR #29 (merge `ec05880`, 2026-11-15) from `feat/ui-13-viewer-refinements`, which complete phase 8, and UI-11, merged in PR #32 (merge `f323650`, 2026-11-20) from `feat/ui-11-export-header`, which completes phase 6. UI-13's earlier slices were merged in PRs #25, #26 and #28, with its prerequisite UI-07 bugfix in PR #27. Outside the numbered tasks, the separate annotation-label contrast correction (section D) was merged in PR #33 (merge `eadc357`, 2026-11-21) from `fix/annotation-label-contrast`. Their records are in [the task records](ui-redesign-task-records.md).
- **In progress:** none.
- **Deferred within completed work:** UI-13's slice 5d, hybrid stage sizing, deferred to a later review, not implemented; not a dependency of any open task (section D).
- **Blockers:** none.
- **Decided:** the Export trigger stays floating in UI-04; the presentation of the export controls is reviewed in UI-11. UI-13 and UI-10 formed one combined phase, after UI-09 and before UI-11 and UI-12 (section C, "Order of work"), completed in PR #29. UI-15, material presets and settings-panel refinement, is approved and comes after that phase; the proposed sequence (section C, 2026-11-01) places it after UI-11, and its place relative to UI-12 is not yet decided. UI-15's scope was revised on 2026-11-18 (its entry): it starts after UI-11 and after the brought-forward browser verification of the annotation-label contrast, with any confirmed correction made separately first. UI-11 (PR #32) placed Export in the viewer's header where the viewer sticks, floating elsewhere; its resize-only Export-menu limitation is accepted as a known limitation (UI-11's record). The brought-forward contrast check confirmed the annotation-label issue (UI-14's entry), and its separate correction was approved on 2026-11-21 (section D) and merged in PR #33. UI-15's export boundary was decided on 2026-11-21: the applied material stays the exported colours, and the adaptive grid colour is on screen only (UI-15's entry). UI-15's persistence recovery (clearing both saved entries after an unsupported pair falls back, with no persistent dismissal) and its preview's always-suppressed grid were confirmed on 2026-11-21 (UI-15's entry).
- **Next task: UI-15** (section C, item 11), on `feat/ui-15-material-presets`: its prerequisites are met (UI-11 in PR #32; the annotation-label contrast correction in PR #33). First the export golden baseline, then S1's preflight. UI-14 remains the final validation task (item 12). UI-12's position stays undecided until the user approves a sequence.

### Plan-change log

The plan-change log is kept in [`ui-redesign-history.md`](ui-redesign-history.md).

## F. Completion record

Not completed. When the whole redesign is finished, record here: the completion date, the final validation performed, the final commit or PR, and any explicitly deferred items that remain outside the completed scope. Keep this document afterwards as project history.

## G. Reference: approved requirements

The sections below are the approved requirements, retained unchanged from the original roadmap. Section C maps their "Stage N" references to task IDs; where section C or the plan-change log records a later approved decision, that decision applies.

The current maximum numeral size is 128 digits (99 tiers), established in UI-07; earlier 500-digit references are historical.

UI-15's revised scope (2026-11-18; approved design, not implemented) supersedes these historical statements, which stay below as first written: §2's "Customizable background and glyph colours, including alpha", a description of the application before UI-15; §4.7's "Preserve existing settings and customization options", where a saved colour pair is incomplete, invalid or contains a translucent value, which then falls back to the complete Limestone pair with a user-visible notice; §8 Stage 6's "Existing user customizations are not silently discarded", to the extent that it conflicts with that opaque-only fallback; and §9's "Preserve grid, background colour, glyph colour, and theme functionality", insofar as it implies continued support for translucent materials. Material colour presets, listed in §10 as an optional idea that is not approved, were approved as UI-15's original scope on 2026-11-01; that listing is historical and superseded. Details are in UI-15's entry (section C).

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
