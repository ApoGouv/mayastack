---
name: finish-pr
description: Publish an already reviewed and committed feature branch and open its GitHub pull request, after the user approves the exact title and description. Never commits, merges, force-pushes or pushes to the base branch.
argument-hint: "[base-branch, default: main]"
disable-model-invocation: true
---

# Finish PR: publish a reviewed branch and open its pull request

The user reviews diffs and creates commits themselves. This skill only publishes the current, already committed feature branch and opens one pull request for it. It is not general Git automation.

Base branch: `$ARGUMENTS` if given, otherwise `main`. Remote: `origin`.

Follow `CLAUDE.md` throughout, in particular its Git safety rules and its rule against Claude session URLs in pull request titles and descriptions.

## Never

- Commit, stage, amend, stash, reset, rebase, cherry-pick, clean, or otherwise rewrite history or the working tree.
- Push to the base branch, push any branch other than the current feature branch, or push with `--force`, `--force-with-lease` or a `+refspec`.
- Merge or close a pull request, delete local or remote branches, or deploy.
- Change Git configuration, remotes, credentials or GitHub CLI authentication, or install tools.
- Approve the proposal on the user's behalf, or push or create the PR in the same turn as asking for approval.
- Retry a failed push or PR creation, or work around a failure, without the user's go-ahead.

When any check below fails, **stop and explain** what was found and why it blocks publishing. Do not try to fix it.

## 1. Preflight (read-only)

Run these, read the output, and stop on any problem:

1. `git rev-parse --show-toplevel` and `git branch --show-current`. Stop on a detached HEAD, or when the current branch is the base branch.
2. `git status --porcelain --untracked-files=all`. Stop if anything is listed: uncommitted or untracked work must be committed or set aside by the user first.
3. `git remote -v`. Stop unless `origin` points to a GitHub repository.
4. `git fetch origin` (updates remote-tracking refs only; no `--prune`). Then confirm `origin/<base>` exists.
5. Upstream: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (no upstream is fine: the branch has not been pushed).
   - If there is an upstream, it must be `origin/<current-branch>`; otherwise stop.
   - `git rev-list --left-right --count @{u}...HEAD`: stop if the branch is behind or has diverged from its upstream. Ahead means a push is needed; equal means already pushed.
6. What the PR would contain, against the base:
   - `git log --oneline --no-decorate origin/<base>..HEAD` and `git diff --stat origin/<base>...HEAD`.
   - Stop if there are no commits.
   - Do not assume every commit belongs in the PR. If any commit looks unrelated to the branch's purpose, or there are merge commits or history you cannot explain, stop and ask the user.
   - If `origin/<base>` has commits the branch lacks (`git rev-list --count HEAD..origin/<base>`), report it; do not rebase or merge. The user decides whether that matters.
7. GitHub CLI: `gh --version` and `gh auth status`. If `gh` is missing or not authenticated, report it and stop before any push. Do not suggest or attempt another authentication method.
8. Existing PR: `gh pr list --head <current-branch> --state all --json number,url,state,baseRefName`. If an open PR exists, report its URL and stop. If a closed or merged PR exists for this branch, report it and ask before continuing.

## 2. Proposal (no publishing yet)

Read the commits and the diff (not just the file names) and draft:

- **Title:** a concise Conventional Commit-style title (e.g. `fix(theme): …`), at most about 72 characters.
- **Description (Markdown):** a short summary, the notable changes, verification, and scope or follow-ups where useful.
  - Verification lists only checks that were actually run, with their real results: in this session, or as reported by the user. Otherwise write that they were not run here, or ask the user. Never invent results.
  - No Claude session URLs or session links. Include an attribution line only if the active instructions require one.
- **Base and head:** `<base>` ← `<current-branch>`, plus the head commit SHA (`git rev-parse HEAD`).
- **Push needed:** none, `git push -u origin <current-branch>` (no upstream), or `git push origin <current-branch>` (ahead of upstream).

Show the exact title, the full description, base, head, SHA and planned push command. Then ask the user to approve that exact proposal, and **end the turn**. If the user asks for changes, revise and ask again. Only an explicit approval of the final proposal counts.

## 3. Publish (only after explicit approval)

1. Recheck before acting: same branch, `git status --porcelain --untracked-files=all` still empty, and `git rev-parse HEAD` still equals the approved SHA. If anything changed, stop and report it.
2. Re-run the existing-PR check from step 1.8. If a PR now exists, report its URL and stop.
3. Push, only if needed, with exactly the approved command. Never force. If the push is rejected or fails, report the error and stop.
4. Write the approved description to a temporary file **outside the repository** (e.g. the session scratchpad or the system temp directory), then:
   `gh pr create --base <base> --head <current-branch> --title "<approved title>" --body-file <temp file>`
   Add `--draft` only if the user asked for a draft.
5. Verify with `gh pr view <current-branch> --json url,title,baseRefName,headRefName,body`: the title, base, head and body must match the approval, and the body must contain no Claude session URL. Report any mismatch instead of editing the PR silently.
6. Delete the temporary file.

If the push succeeded but PR creation failed, say so plainly: the branch is on `origin`, the PR was not created, and the error was this. Do not retry without the user's go-ahead.

## 4. Report

Report the PR URL (or the failure), the base and head, whether a push happened, and the final `git status`. Do not merge, delete branches or deploy.
