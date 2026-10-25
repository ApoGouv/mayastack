---
name: finish-pr
description: Draft the pull request title and description for an already reviewed and committed feature branch, validate them with `node scripts/git/create-pr.mjs --check`, and hand the approved draft to the user to create the PR with that script in their own terminal. Never pushes, creates PRs, commits or merges itself.
disable-model-invocation: true
---

# Finish PR: draft a pull request and hand it to the create-pr script

The user reviews diffs and creates commits themselves. Responsibilities are split:

- **Claude (this skill):** understands the changes, drafts the title and description, and validates them with the script's read-only `--check` mode.
- **The user:** approves the draft, then runs the script in their own terminal and types its confirmation.
- **`scripts/git/create-pr.mjs`:** re-checks everything, pushes the branch and creates the pull request into `main`, then verifies it.

The script asks for its confirmation only in an interactive terminal. Claude's command runner has none, so the script refuses to push or create anything when Claude runs it without `--check`. That refusal is intended: never work around it.

Follow `CLAUDE.md` throughout, in particular its Git safety rules and its rule against Claude session URLs in pull request titles and descriptions. Pull requests always target `main`.

## Never

- Commit, stage, amend, stash, reset, rebase, cherry-pick, clean, or otherwise rewrite history or the working tree.
- Push, or create, edit, merge or close a pull request, yourself: no `git push`, `gh pr create`, `gh pr edit` or `gh pr merge`.
- Run the create-pr script (`node scripts/git/create-pr.mjs` or `npm run git:create-pr`) without `--check`, feed its confirmation through a pipe or input redirection, or look for any other way past its confirmation.
- Delete branches, deploy, change Git configuration, remotes, credentials or GitHub CLI authentication, or install tools.
- Approve the draft on the user's behalf, or change the approved title or description without approval.

When a check fails, **stop and explain** what was found. Do not try to fix it.

## 1. Inspect the changes (read-only)

1. `git branch --show-current` and `git status --porcelain --untracked-files=all`. Stop on `main`, a detached HEAD, or any listed change: uncommitted or untracked work must be committed or set aside by the user first.
2. `git fetch origin`, then read what the pull request would contain: `git log --oneline --no-decorate origin/main..HEAD` and `git diff origin/main...HEAD` (the diff itself, not just the file names). Stop and ask if any commit looks unrelated to the branch's purpose, or the history cannot be explained.
3. Collect the test evidence: checks actually run in this session, with their results, or results the user reported. Never invent results.

## 2. Draft and validate

1. Draft:
   - **Title:** a concise Conventional Commit-style title (e.g. `fix(theme): …`), one line, at most about 72 characters.
   - **Description (Markdown):** a short summary, the notable changes, verification (only real results, as above), and known limitations or follow-ups where useful. No Claude session URLs or session links. Include an attribution line only if the active instructions require one.
2. Write them to two files **outside the repository**, in the session scratchpad (or the system temp directory if there is none): `pr-title.txt` (the title, one line) and `pr-body.md` (the description).
3. Validate them, with paths quoted:
   `node scripts/git/create-pr.mjs --check --title-file "<title file>" --body-file "<body file>"`
   This re-checks the branch, working tree, remote and upstream state, GitHub access and existing pull requests, and prints the proposal. It pushes and creates nothing. If it stops, report its message and stop.

## 3. Ask for approval

Show the exact title, the full description, the base and head branches, the commit SHA and the planned push (from the `--check` output), and the two draft file paths. Ask the user to approve that exact proposal, and **end the turn**.

If the user asks for changes, edit the draft files accordingly, run the `--check` command again, and ask again. Only an explicit approval of the final proposal counts.

## 4. Hand off to the script

After approval, do not run the command yourself. Give the user the exact command to run in their own terminal, from the repository root, with the two draft file paths that were approved (unchanged, and without rewriting either file):

```
node scripts/git/create-pr.mjs --title-file "<title file>" --body-file "<body file>"
```

Give this direct `node` form rather than `npm run git:create-pr -- …`: in Windows PowerShell, `npm` runs `npm.ps1`, PowerShell removes the bare `--`, and npm then takes the options for itself, so the script receives only the file paths and stops.

Explain that it checks everything again, shows the same proposal, and pushes and creates the pull request only after they type `create`. The confirmation needs a real interactive terminal: if the standalone Git Bash window cannot provide one, the script stops with exit code 2 and nothing is pushed, so recommend PowerShell, Windows Terminal or the VS Code integrated terminal. It exits with code 0 when the pull request was created and verified, 1 when a check or step failed (its message says what did and did not happen), and 2 when nothing was confirmed. When it creates a pull request, it prints its URL (`✔ Pull request #<number> was created and verified: <URL>`, or the URL inside its message if a later step failed): ask the user to share that output. Then **end the turn**.

## 5. Verify and report

When the user says the command has run:

1. Take the pull request URL from the script's output. If the user has not shared it, ask for it. Do not look the pull request up by branch name: an earlier pull request for the same branch could be found instead.
2. Verify read-only: `gh pr view <URL> --json number,url,title,state,baseRefName,headRefName,headRefOid,body`. Check that the title equals the title file, the description equals the body file (line endings aside), the base is `main`, the head branch and commit are the approved ones, and there is no Claude session URL.
3. Report the pull request's URL, number, title and state, or exactly what did not match. Never report success before this check.
4. If the user reports that the script stopped or failed, relay its message. Do not retry, push or create anything yourself.
5. Delete the two draft files once the pull request is verified, or when the user abandons it.
