// @ts-check
/**
 * Shared building blocks for the Git workflow scripts in this folder (sync-main, create-pr):
 * running commands safely, and the checks both scripts make before changing anything.
 *
 * Commands always run with an argument array and `shell: false`, so branch names, titles and
 * paths are never interpreted by a shell.
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = 'main';
export const REMOTE = 'origin';

/** The repository these scripts belong to */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * @typedef {{ status: number | null, stdout: string, stderr: string, error?: Error }} CommandResult
 * @typedef {(command: string, args: string[], options: { cwd: string }) => CommandResult} Runner
 */

/** A check or command that stops a workflow script, with how to resolve it */
export class WorkflowError extends Error {
  /** @param {string} message @param {string} [hint] */
  constructor(message, hint) {
    super(message);
    this.name = 'WorkflowError';
    this.hint = hint;
  }
}

/** @type {Runner} */
export function runCommand(command, args, { cwd }) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 120_000,
    // Never wait for a credential or confirmation prompt
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

/** A path in a form that can be compared (real path; case-insensitive on Windows) */
export function normalizePath(/** @type {string} */ path) {
  const real = realpathSync.native(resolve(path));
  return process.platform === 'win32' ? real.toLowerCase() : real;
}

/** Whether `path` is `directory` or inside it (both must exist) */
export function isInside(/** @type {string} */ path, /** @type {string} */ directory) {
  const rel = relative(normalizePath(directory), normalizePath(path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** The stderr (or spawn error) of a failed command, for messages */
const failure = (/** @type {CommandResult} */ result) => (result.error?.message ?? result.stderr).trim();

/**
 * Command helpers and shared checks, bound to a working directory and runner.
 * @param {{ cwd: string, repoRoot: string, run: Runner }} options
 */
export function createWorkflow({ cwd, repoRoot, run }) {
  /** @param {string} command @param {string[]} args */
  const exec = (command, args) => run(command, args, { cwd });

  /** Runs git and returns its trimmed output; stops if it fails */
  const git = (/** @type {string[]} */ ...args) => {
    const result = exec('git', args);
    if (result.error || result.status !== 0) {
      const detail = failure(result);
      throw new WorkflowError(`\`git ${args.join(' ')}\` failed${detail ? `: ${detail}` : '.'}`);
    }
    return result.stdout.trim();
  };

  /** Whether git exits successfully (for yes/no checks) */
  const gitSucceeds = (/** @type {string[]} */ ...args) => {
    const result = exec('git', args);
    if (result.error) throw new WorkflowError(`Could not run git: ${result.error.message}`, 'Check that Git is installed and on PATH.');
    return result.status === 0;
  };

  /** Stops unless the working tree has no staged, unstaged or untracked changes */
  const requireCleanTree = (/** @type {string} */ when = '') => {
    const args = ['status', '--porcelain=v1', '--untracked-files=all'];
    const result = exec('git', args);
    if (result.error || result.status !== 0) {
      throw new WorkflowError(`\`git ${args.join(' ')}\` failed: ${failure(result)}`);
    }
    // Only trailing whitespace is trimmed: a leading space is part of a line's status code
    const changes = result.stdout.trimEnd();
    if (changes) {
      throw new WorkflowError(
        `The working tree has uncommitted or untracked changes${when ? ` ${when}` : ''}:\n${changes}`,
        'Commit them, or move them aside yourself, then run the command again. Nothing was changed.'
      );
    }
  };

  /** Stops unless the working directory is inside this repository */
  const requireRepository = () => {
    const result = exec('git', ['rev-parse', '--show-toplevel']);
    if (result.error) {
      throw new WorkflowError(`Could not run git: ${result.error.message}`, 'Check that Git is installed and on PATH.');
    }
    if (result.status !== 0) {
      throw new WorkflowError(`${cwd} is not inside a Git repository.`, `Run the command from ${repoRoot}.`);
    }
    const toplevel = result.stdout.trim();
    if (normalizePath(toplevel) !== normalizePath(repoRoot)) {
      throw new WorkflowError(`This is the repository at ${toplevel}, not ${repoRoot}.`, `Run the command from ${repoRoot}.`);
    }
  };

  /**
   * The checked-out branch; stops on a detached HEAD or the base branch.
   * @param {{ detachedHint: string, onBaseHint: string }} hints
   */
  const requireFeatureBranch = ({ detachedHint, onBaseHint }) => {
    const result = exec('git', ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    if (result.status !== 0) throw new WorkflowError('HEAD is detached: no branch is checked out.', detachedHint);
    const branch = result.stdout.trim();
    if (branch === BASE) throw new WorkflowError(`You are already on ${BASE}.`, onBaseHint);
    return branch;
  };

  /**
   * Stops unless the GitHub CLI is installed and logged in.
   * @param {string} purpose what gh is needed for, e.g. "the pull request cannot be verified"
   */
  const requireGh = (purpose) => {
    const version = exec('gh', ['--version']);
    if (version.error || version.status !== 0) {
      throw new WorkflowError(
        `The GitHub CLI (gh) is not available, so ${purpose}.`,
        'Install gh from https://cli.github.com/ and run `gh auth login`, then run the command again. Nothing was changed.'
      );
    }
    if (exec('gh', ['auth', 'status']).status !== 0) {
      throw new WorkflowError(
        `The GitHub CLI is not logged in to GitHub, so ${purpose}.`,
        'Run `gh auth login` (or check `gh auth status`), then run the command again. Nothing was changed.'
      );
    }
  };

  return { exec, git, gitSucceeds, requireCleanTree, requireRepository, requireFeatureBranch, requireGh };
}
