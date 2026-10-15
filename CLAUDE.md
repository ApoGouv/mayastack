# MayaStack - Claude Code Instructions

## 1. Project Overview

MayaStack is an open-source web application built with React, TypeScript, and Vite. It allows users to convert numbers and dates into visual Mayan numeral representations.

The application includes:

- Mayan numeral conversion and visualization.
- Interactive glyph stacks using dots, bars, and shells.
- Number and date input modes.
- Display customization and dark mode.
- SVG and PNG export, including configurable export dimensions.
- A GitHub Pages deployment.

The project is licensed under the MIT License.

### Core Domain Concepts

Treat MayaStack as an application for converting and visualizing numbers using Mayan numeral glyphs, not merely as a generic base-20 calculator.

Keep the following concerns distinct:

- **Numeric values:** The underlying numbers being represented.
- **Numeral conversion:** The positional digits and place values used to represent numbers.
- **Glyph rendering:** The visual representation of digits using dots, bars, and shells, including zero and vertical stacking.
- **Current date functionality:** Date-related inputs are currently handled through numeric conversion, not traditional Mayan Long Count calendar arithmetic.
- **Future calendar functionality:** A proper Mayan Long Count implementation is planned separately and must follow its own verified calendrical conventions.
- **Export rendering:** Producing reliable SVG and PNG output while preserving the intended glyph representation.

### Current Date Functionality and Future Calendar Support

MayaStack currently supports date-related input and visualization by converting numeric values. This is not a full implementation of the traditional Mayan Long Count calendar.

Do not assume that the current date functionality follows traditional Mayan calendar arithmetic, including the 360-day *tun* period.

A proper Mayan Long Count implementation is a planned future feature. It must not be introduced as part of bug fixes, testing infrastructure, numeric precision improvements, or other codebase maintenance unless explicitly requested.

Preserve the existing behavior of each mode. Do not reinterpret date inputs as Long Count dates or introduce calendar-specific arithmetic unless explicitly requested.

## 2. General Development Principles

- Inspect the existing implementation and project conventions before modifying code.
- Prefer small, focused changes over broad refactoring.
- Preserve existing functionality, visual design, responsiveness, and user preferences unless a change is explicitly requested.
- Use TypeScript types and explicit validation to make invalid states difficult to represent.
- Handle numeric precision correctly, especially for large integers. Avoid converting exact integer values through JavaScript `number` when precision could be lost. Consider `bigint` where appropriate.
- Do not silently transform invalid input into a different valid value.
- Keep calculation logic separate from presentation logic where practical.
- Avoid unnecessary dependencies and abstractions.
- Preserve accessibility, keyboard usability, and appropriate semantic markup.
- Follow the existing code style and component patterns unless there is a clear reason to improve them.
- Do not introduce historical or mathematical claims that have not been established by project requirements or reliable references.
- Prefer fixes that address the underlying cause instead of adding workarounds.

## 3. Repository Investigation

Before starting a task:

1. Inspect the current Git branch, working tree, and recent commit history.
2. Read `package.json` and relevant configuration files to identify the actual toolchain and available scripts.
3. Inspect the relevant source files and trace related behavior before editing.
4. Review existing tests and determine how the proposed change can be verified.
5. Identify the files expected to change and any potential side effects.

Do not assume that a previous audit, proposed patch, or earlier report accurately describes the current checkout. Verify the current repository state.

If the repository state differs materially from the expected state, or unrelated user changes could be affected, stop and report the discrepancy before proceeding.

Never assume that a previously proposed fix has already been applied. Confirm the actual implementation first.

## 4. Implementation and Change Scope

- Follow the current task's scope and acceptance criteria.
- Do not fix unrelated issues, add features, or perform opportunistic refactoring.
- Do not rewrite working code solely to introduce a preferred pattern.
- Investigate the root cause before applying a fix.
- Preserve existing public interfaces and behavior unless the task requires a deliberate change.
- When a change affects multiple modes, evaluate each mode independently.
- Add or update tests for bug fixes and new behavior where practical.
- When feasible, write a regression test that demonstrates the original defect and verifies the fix.
- If additional changes become necessary, explain why and obtain approval when they materially expand the task.
- Do not implement future roadmap items as part of unrelated maintenance tasks.
- If requirements are ambiguous or existing behavior is unclear, investigate and explain the uncertainty instead of inventing requirements.

## 5. Numeric Correctness and Mayan Numeral Conversion

Numeric conversion is a core part of MayaStack and must be treated carefully.

- Preserve exact integer values throughout calculations and conversions.
- Avoid JavaScript `number` precision loss for integers beyond `Number.MAX_SAFE_INTEGER`.
- Use `bigint` where appropriate, while respecting its limitations and the requirements of existing APIs and UI components.
- Validate inputs before conversion. Handle negative numbers, fractional values, `NaN`, and infinities according to the intended behavior of the relevant feature.
- Never allow invalid values to cause infinite loops, incorrect place values, or misleading visual output.
- Preserve correct handling of zero and positional transitions.
- Keep numeric values, positional digits, glyph representations, and display formatting distinct.
- Do not assume that a numeric conversion fix automatically corrects date handling or glyph rendering.
- Do not introduce traditional Mayan calendar arithmetic into the current numeric conversion logic.

When modifying conversion utilities, consider testing:

- Zero and single-digit values.
- Base-20 digit boundaries and positional transitions.
- Representative multi-digit values.
- Integers larger than `Number.MAX_SAFE_INTEGER`.
- Very large integers.
- Invalid inputs and unsupported values.
- Round-trip conversion where applicable.
- Correct correspondence between positional values and rendered glyphs.

Use exact strings or `bigint` literals when testing large integers. Creating a large integer as a JavaScript `number` first may already have lost precision.

## 6. Testing and Validation

- Read the available npm scripts before deciding which commands to run.
- Run focused tests for the modified behavior.
- Run the TypeScript check, lint, and production build when applicable.
- Run the relevant existing test suite after changes that could affect shared functionality.
- Do not claim that a command passed unless it was actually executed successfully.
- Report failures, warnings, skipped checks, and environmental limitations accurately.
- Do not weaken tests, lint rules, TypeScript checks, or build settings merely to make validation pass.
- Do not introduce testing infrastructure or testing dependencies unless the task calls for them or they are explicitly approved.
- Do not change unrelated configuration just to simplify testing.

When fixing a bug, add regression coverage where practical. When introducing a new feature, test its intended behavior and relevant edge cases.

For rendering and export changes, verify that the output preserves the intended glyphs, dimensions, and layout. Consider SVG compatibility beyond browser-only rendering when relevant.

## 7. Dependencies and Configuration

- Avoid unnecessary dependency changes.
- Do not perform broad dependency upgrades as part of an unrelated bug fix.
- Before adding a dependency, evaluate whether the existing stack already provides an appropriate solution.
- Preserve compatibility among the existing React, TypeScript, Vite, ESLint, and other configured tools.
- Review both `package.json` and the lockfile when dependencies change.
- Do not use force-based dependency fixes or introduce major version changes without investigating their impact.
- Do not modify build, deployment, TypeScript, or lint configuration unless required by the task.
- Explain the purpose and impact of any necessary dependency or configuration changes.

## 8. UI, Accessibility, and Export

When modifying the interface:

- Preserve the established design and responsive behavior.
- Ensure interactive controls have appropriate accessible names and keyboard behavior.
- Avoid breaking focus management, dialogs, menus, tooltips, or other interactive components.
- Preserve light and dark theme behavior.
- Validate user-configurable values rather than silently substituting unexpected defaults.
- Ensure exported SVG and PNG output reflects the user's selected settings and the intended numeral layout.
- Preserve existing export functionality unless the task explicitly changes it.
- Avoid unnecessary visual redesigns during functional bug fixes.

Do not treat a visually correct browser preview as sufficient proof that generated SVG output is correct in other rendering environments when cross-renderer compatibility is relevant.

## 9. Development Priorities and Roadmap

The current priority is to strengthen the existing codebase before adding major new features.

The intended order of work is:

1. Establish reliable automated testing and regression coverage.
2. Fix existing bugs and improve numeric correctness.
3. Improve input validation and error handling.
4. Correct theme, rendering, and SVG/PNG export issues.
5. Improve accessibility, reliability, and maintainability.
6. Evaluate and implement glyph SVG improvements where appropriate.
7. Consider additional features once the existing functionality is sufficiently reliable and well tested.

A proper Mayan Long Count calendar implementation is planned for a later phase. It should be designed and implemented separately after the existing codebase is sufficiently stable and tested.

This roadmap provides context and does not authorize Claude to implement every item automatically. Work only on the task explicitly requested.

## 10. Git and Safety

- Never discard, overwrite, or include pre-existing user changes without authorization.
- Do not use destructive Git operations, such as resetting or cleaning the working tree, without explicit authorization.
- Do not create commits or push changes unless explicitly authorized for the current task.
- Do not rebase, amend existing commits, force-push, or rewrite shared history without explicit authorization.
- Do not deploy the application or run deployment commands unless explicitly authorized.
- Before committing, review the staged diff and ensure it contains only the intended changes.
- Keep commits focused and use clear, descriptive commit messages.
- Never include secrets, credentials, local environment files, or unrelated generated artifacts in a commit.
- Do not assume that a clean working tree or a particular branch is guaranteed. Inspect the actual state before acting.

Committing, pushing, and deploying are separate actions and require their own authorization.

## 11. Documentation

- Keep documentation consistent with the actual implementation.
- Update the README when a task materially changes installation, development, features, or deployment instructions.
- Do not duplicate the README unnecessarily in this file.
- Keep this instruction file focused on development rules and project-specific constraints.
- Do not document planned behavior as if it were already implemented.
- Verify commands, scripts, and configuration before documenting them.
- Avoid expanding documentation with speculative architecture details.

## 12. Task Completion Report

At the end of each task, report:

1. **Summary:** What changed and why.
2. **Files changed:** Which files were modified and their purpose.
3. **Validation:** Tests and commands executed, with their actual results.
4. **Limitations:** Any remaining issues, uncertainties, or checks that could not be completed.
5. **Scope:** Any deviations from the requested task and why they were necessary.
6. **Git status:** Whether changes remain uncommitted or were committed with authorization.

Keep the report factual and concise. Distinguish verified results from assumptions and recommendations.

Do not claim that the application is fully correct or bug-free simply because the available checks pass.