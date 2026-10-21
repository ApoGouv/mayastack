# Git workflow scripts

Two Node.js scripts handle the routine Git and GitHub steps of MayaStack's workflow:

| Command | Use it to |
|---|---|
| `npm run git:create-pr` | Push the committed feature branch you are on and open its pull request into `main`, with a title and description you supply |
| `npm run git:sync-main` | After that pull request is merged, switch to `main` and fast-forward it to `origin/main` |

Both scripts only run predictable Git and GitHub CLI commands. They never commit, stage, stash, rebase, reset, force-push, merge pull requests, delete branches or change Git configuration. They stop at the first failed check, before any further change, and say what was and was not done. Every command runs with an argument array and no shell, so branch names, titles and paths are never interpreted by a shell. Neither script retries a failed step.

In Claude Code, the [`/finish-pr`](../../.claude/skills/finish-pr/SKILL.md) skill drafts the pull request and hands it to `git:create-pr` (see [Using `/finish-pr`](#using-finish-pr)). [`CLAUDE.md`](../../CLAUDE.md) describes what Claude may and may not run.

## Prerequisites

- Node.js and the project's dependencies (`npm install`), as for the rest of the project.
- Git, with this repository cloned and `origin` pointing to it on GitHub.
- The [GitHub CLI](https://cli.github.com/) (`gh`), logged in with `gh auth login`. Check with `gh auth status`. Your account needs write access to the repository to open pull requests.
- A clean working tree: both scripts stop if there are staged, unstaged or untracked changes.

## `git:create-pr`: open a pull request

Run it on the feature branch you want to propose, after committing your work.

### 1. Write the title and description to files

Keep both files **outside the repository** (for example in your temp directory), so they can never be committed. The script refuses files inside the repository.

- **Title file:** one line; at most 256 characters; no leading or trailing spaces. The file may end with one line break.
- **Description file:** Markdown, not empty, at most 65,536 characters. It is passed to GitHub unchanged.
- Neither may contain a Claude session link (`https://claude.ai/code/…`).
- Save them as UTF-8 **without a byte-order mark**. Windows PowerShell 5.1's `Set-Content -Encoding UTF8` adds one, and the title check then fails. `[IO.File]::WriteAllText()` does not add one (see the PowerShell example below).

### 2. Check the proposal (optional, changes nothing on GitHub)

```bash
npm run git:create-pr -- --check --title-file "/tmp/pr-title.txt" --body-file "/tmp/pr-body.md"
```

`--check` runs every check below and shows the proposal, then stops: it does not ask for confirmation, push or create anything. Its only change is a `git fetch origin`, which updates your remote-tracking branches (such as `origin/main`) so the checks use GitHub's current state.

### 3. Create the pull request

```bash
npm run git:create-pr -- --title-file "/tmp/pr-title.txt" --body-file "/tmp/pr-body.md"
```

The script first checks, in order:

1. You are in this repository, on a branch (not a detached HEAD) other than `main`, with a clean working tree.
2. The title and description files are valid (as above).
3. `origin` is a GitHub repository, and `gh` is installed, logged in, can reach it and has write access.
4. After fetching, your branch has commits that are not on `origin/main`. If `origin/main` has commits your branch lacks, this is shown as a note.
5. If your branch has an upstream set, it is `origin/<your branch>`.
6. The branch on GitHub (read directly from GitHub) is absent, already at your commit, or behind it. If it has commits you do not have, the script stops: it never force-pushes or merges.
7. No pull request is already open for this branch into `main`. Earlier closed or merged ones are only noted.

It then shows the repository, `main ← <branch>`, the commit SHA, the commits, the planned push, the title and the full description, and asks you to type `create`. After you confirm, it checks again that the branch, the commit and the clean working tree have not changed, then:

- pushes only this branch, to the same name (`git push origin refs/heads/<branch>:refs/heads/<branch>`), without force and without setting an upstream, and checks that GitHub now has the branch at your commit. The push is skipped if GitHub already has it;
- creates the pull request into `main` with exactly the given title and description;
- verifies the created pull request (title, description, base and head branches, head commit and state) and prints its URL, number, title and state.

Because no upstream is set, push later commits yourself with `git push origin <branch>`, or set an upstream if you want one.

### Confirmation needs an interactive terminal

The script asks for `create` only when both its input and its output are a real interactive terminal. Only that exact word confirms (surrounding spaces are ignored). Piped or redirected input never counts, and there is no option to skip the question.

If there is no interactive terminal, the script stops with exit code 2 and pushes nothing. This is the case when Claude Code runs it, and possibly in the standalone Git Bash window, which cannot always give Node a real terminal. Use PowerShell, Windows Terminal or the VS Code integrated terminal instead.

### Exit codes and failures

| Exit code | Meaning |
|---|---|
| 0 | The pull request was created and verified (or, with `--check`, everything passed) |
| 1 | A check or a step failed. The message says what was and was not done |
| 2 | Nothing was confirmed (declined, or no interactive terminal). Nothing was pushed or created |

If the push succeeded but creating or verifying the pull request failed, the message says so and includes the pull request's URL if it was created. Running the command again is safe: it skips the push when GitHub already has your commit, and stops if a pull request is already open, so it never creates a duplicate.

### Options

| Option | Meaning |
|---|---|
| `--title-file <file>` | The title, from a file outside the repository |
| `--title <title>` | The title as an argument instead. Prefer `--title-file`: shells can change special characters in arguments |
| `--body-file <file>` | The Markdown description, from a file outside the repository (required) |
| `--check` | Check and show the proposal only (see above) |
| `--help` | Show the usage |

### Windows PowerShell

In Windows PowerShell 5.1, `npm` runs `npm.ps1`, which drops some of the arguments after `--`: the script then stops with a usage message and changes nothing. Run the script with `node` instead (or use `npm.cmd run git:create-pr -- …`):

```powershell
$title = Join-Path $env:TEMP 'pr-title.txt'
$body  = Join-Path $env:TEMP 'pr-body.md'
[IO.File]::WriteAllText($title, 'feat(example): describe the change')
[IO.File]::WriteAllText($body, "## Summary`n`nWhat changed and why.`n")

node scripts/git/create-pr.mjs --check --title-file $title --body-file $body
node scripts/git/create-pr.mjs --title-file $title --body-file $body
```

`npm run git:sync-main` takes no arguments, so it works as shown in every shell.

## Using `/finish-pr`

In Claude Code, `/finish-pr` splits the work between Claude, you and the script:

1. Claude inspects the branch, the commits, the diff and the test results, and drafts a title and description.
2. Claude writes them to two files outside the repository and runs `git:create-pr --check` to validate them.
3. Claude shows you the exact title, description, base and head branches, commit and planned push, and waits for your approval. If you ask for changes, it edits the files and checks them again.
4. After you approve, Claude does not push or create anything. It gives you the exact command to run in your own terminal, where you type `create`.
5. You share the script's output. Claude verifies the pull request read-only, using the exact URL the script printed, and reports it. It deletes the draft files afterwards.

Claude never runs `git:create-pr` without `--check`, and never feeds or bypasses its confirmation.

## `git:sync-main`: update `main` after a merge

Run it on the feature branch whose pull request has just been merged:

```bash
npm run git:sync-main
```

Before changing anything, it checks, in order:

1. You are in this repository, on a branch (not a detached HEAD) other than `main`, with a clean working tree.
2. A local `main` branch and an `origin` remote exist. It never creates `main`.
3. `gh` is installed and logged in, and GitHub has a pull request from this branch into `main` that is **merged at exactly your branch's current commit**. An open, closed or missing pull request, or one merged at a different commit (for example because you committed more afterwards), stops it. It does not infer a merge from what `main` contains.

Then it:

1. runs `git fetch origin`, and checks that `origin/main` exists;
2. checks, still on your branch, that `main` can be fast-forwarded to `origin/main` (it has no commits of its own), and that the working tree is still clean;
3. switches to `main` and fast-forwards it (`git merge --ff-only origin/main`);
4. verifies that you are on `main`, at the same commit as `origin/main`, with a clean working tree, and prints that commit.

Your feature branch is left in place; delete it yourself when you no longer need it. If a step fails after switching, the message says that you are now on `main` and your feature branch is unchanged. Exit code 0 means `main` was updated; 1 means a check or step failed.

## Tests

```bash
npx vitest run scripts/git/
```

The tests (also part of `npm test`) use temporary Git repositories and a fake GitHub CLI, so they never contact GitHub or change this repository.
