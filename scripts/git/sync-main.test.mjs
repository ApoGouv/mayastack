// @ts-check
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCommand, WorkflowError } from './common.mjs';
import { syncMain } from './sync-main.mjs';

// Every test runs against throwaway repositories in the system temp directory: a bare "origin",
// a working clone, and a second clone that merges the feature branch into origin's main, as
// GitHub does when a pull request is merged. Only the GitHub CLI is faked; Git runs for real.

const FEATURE = 'feature/sync-test';

/** Runs git in a test repository, and fails the test if it fails */
function git(cwd, ...args) {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args],
    { cwd, encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** @type {{ root: string, origin: string, work: string, other: string }} */
let repo;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'sync-main-'));
  repo = { root, origin: join(root, 'origin.git'), work: join(root, 'work'), other: join(root, 'other') };

  git(root, 'init', '--bare', '--initial-branch=main', repo.origin);
  git(root, 'clone', repo.origin, repo.work);
  writeFileSync(join(repo.work, 'a.txt'), 'a\n');
  git(repo.work, 'add', 'a.txt');
  git(repo.work, 'commit', '-m', 'initial');
  git(repo.work, 'push', '-u', 'origin', 'main');

  git(repo.work, 'switch', '-c', FEATURE);
  writeFileSync(join(repo.work, 'b.txt'), 'b\n');
  git(repo.work, 'add', 'b.txt');
  git(repo.work, 'commit', '-m', 'feature work');
  git(repo.work, 'push', '-u', 'origin', FEATURE);

  // The pull request is merged on "GitHub"
  git(root, 'clone', repo.origin, repo.other);
  git(repo.other, 'merge', '--no-ff', `origin/${FEATURE}`, '-m', 'Merge pull request #1');
  git(repo.other, 'push', 'origin', 'main');
});

afterEach(() => {
  rmSync(repo.root, { recursive: true, force: true });
});

/** The state of the working clone that a failed sync must leave unchanged */
const state = () => ({
  branch: git(repo.work, 'symbolic-ref', '--quiet', '--short', 'HEAD'),
  main: git(repo.work, 'rev-parse', 'refs/heads/main'),
  feature: git(repo.work, 'rev-parse', `refs/heads/${FEATURE}`),
});

/**
 * A runner that runs Git for real and answers the GitHub CLI with fake responses.
 * @param {(args: string[]) => { status: number | null, stdout?: string, stderr?: string, error?: Error }} gh
 */
function fakeGh(gh) {
  /** @type {string[][]} */
  const calls = [];
  /** @type {import('./common.mjs').Runner} */
  const run = (command, args, options) => {
    calls.push([command, ...args]);
    if (command === 'gh') return { stdout: '', stderr: '', ...gh(args) };
    return runCommand(command, args, options);
  };
  return { run, calls };
}

/** A GitHub CLI that is installed and logged in, listing the given pull requests */
const ghListing = (/** @type {object[]} */ prs) =>
  fakeGh((args) => (args[0] === 'pr' ? { status: 0, stdout: JSON.stringify(prs) } : { status: 0 }));

const mergedPr = (headRefOid) => ({ number: 1, state: 'MERGED', url: 'https://github.com/example/repo/pull/1', headRefOid });

/** Runs the sync in the working clone */
const sync = (/** @type {import('./common.mjs').Runner} */ run, options = {}) =>
  syncMain({ cwd: repo.work, repoRoot: repo.work, run, log: () => {}, ...options });

/** Expects the sync to stop with a WorkflowError matching the message, and returns the error */
function expectStop(fn, message) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(WorkflowError);
    expect(error.message).toMatch(message);
    return error;
  }
  throw new Error('Expected the sync to stop, but it succeeded');
}

const wasFetched = (calls) => calls.some(([command, sub]) => command === 'git' && sub === 'fetch');
const wasSwitched = (calls) => calls.some(([command, sub]) => command === 'git' && (sub === 'switch' || sub === 'merge'));

describe('git:sync-main', { timeout: 60_000 }, () => {
  it('switches to main and fast-forwards it to origin/main after the pull request is merged', () => {
    const before = state();
    const { run, calls } = ghListing([mergedPr(before.feature)]);

    const result = sync(run);

    const originMain = git(repo.origin, 'rev-parse', 'refs/heads/main');
    expect(result.commit).toBe(originMain);
    expect(result.subject).toBe('Merge pull request #1');
    expect(result.pr.number).toBe(1);
    expect(state()).toEqual({ branch: 'main', main: originMain, feature: before.feature });
    expect(git(repo.work, 'status', '--porcelain', '--untracked-files=all')).toBe('');
    // The branch name is passed to gh as its own argument, never through a shell
    expect(calls).toContainEqual(expect.arrayContaining(['gh', 'pr', 'list', '--head', FEATURE, '--base', 'main']));
  });

  it('stops on an untracked file, before contacting GitHub or fetching', () => {
    writeFileSync(join(repo.work, 'notes.txt'), 'mine\n');
    const before = state();
    const { run, calls } = ghListing([mergedPr(before.feature)]);

    expectStop(() => sync(run), /uncommitted or untracked changes/);
    expect(state()).toEqual(before);
    expect(existsSync(join(repo.work, 'notes.txt'))).toBe(true);
    expect(calls.some(([command]) => command === 'gh')).toBe(false);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops on staged and unstaged changes, and leaves them as they are', () => {
    writeFileSync(join(repo.work, 'a.txt'), 'staged\n');
    git(repo.work, 'add', 'a.txt');
    writeFileSync(join(repo.work, 'b.txt'), 'unstaged\n');
    const before = state();
    const { run, calls } = ghListing([mergedPr(before.feature)]);

    // The status codes are shown intact: "M " staged, " M" unstaged
    expectStop(() => sync(run), /:\nM  a\.txt\n M b\.txt$/);
    expect(state()).toEqual(before);
    expect(git(repo.work, 'diff', '--cached', '--name-only')).toBe('a.txt');
    expect(git(repo.work, 'diff', '--name-only')).toBe('b.txt');
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when main is already checked out', () => {
    git(repo.work, 'switch', 'main');
    const { run, calls } = ghListing([]);

    expectStop(() => sync(run), /already on main/);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops on a detached HEAD', () => {
    git(repo.work, 'switch', '--detach');
    const { run, calls } = ghListing([]);

    expectStop(() => sync(run), /HEAD is detached/);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when no pull request is found for the branch', () => {
    const before = state();
    const { run, calls } = ghListing([]);

    expectStop(() => sync(run), /No pull request from feature\/sync-test into main/);
    expect(state()).toEqual(before);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when the pull request is still open', () => {
    const before = state();
    const { run, calls } = ghListing([{ ...mergedPr(before.feature), state: 'OPEN' }]);

    expectStop(() => sync(run), /is still open/);
    expect(state()).toEqual(before);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when the pull request was closed without being merged', () => {
    const before = state();
    const { run } = ghListing([{ ...mergedPr(before.feature), state: 'CLOSED' }]);

    expectStop(() => sync(run), /closed without being merged/);
    expect(state()).toEqual(before);
  });

  it('stops when the local branch has commits that the merged pull request did not include', () => {
    const merged = state().feature;
    writeFileSync(join(repo.work, 'c.txt'), 'later\n');
    git(repo.work, 'add', 'c.txt');
    git(repo.work, 'commit', '-m', 'work after the merge');
    const before = state();
    const { run, calls } = ghListing([mergedPr(merged)]);

    expectStop(() => sync(run), /was merged at .* but feature\/sync-test is at/);
    expect(state()).toEqual(before);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when the GitHub CLI is not installed', () => {
    const before = state();
    const { run, calls } = fakeGh(() => ({ status: null, error: Object.assign(new Error('spawnSync gh ENOENT'), { code: 'ENOENT' }) }));

    expectStop(() => sync(run), /GitHub CLI \(gh\) is not available/);
    expect(state()).toEqual(before);
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when the GitHub CLI is not logged in', () => {
    const before = state();
    const { run, calls } = fakeGh((args) => (args[0] === 'auth' ? { status: 1, stderr: 'not logged in' } : { status: 0 }));

    expectStop(() => sync(run), /not logged in/);
    expect(state()).toEqual(before);
    expect(calls.some(([command, sub]) => command === 'gh' && sub === 'pr')).toBe(false);
  });

  it('stops when the pull request lookup fails', () => {
    const before = state();
    const { run } = fakeGh((args) => (args[0] === 'pr' ? { status: 1, stderr: 'HTTP 502' } : { status: 0 }));

    expectStop(() => sync(run), /Could not look up the pull request.*HTTP 502/);
    expect(state()).toEqual(before);
  });

  it('stops when fetching fails, without switching branches', () => {
    git(repo.work, 'remote', 'set-url', 'origin', join(repo.root, 'missing.git'));
    const before = state();
    const { run, calls } = ghListing([mergedPr(before.feature)]);

    expectStop(() => sync(run), /`git fetch origin` failed/);
    expect(state()).toEqual(before);
    expect(wasSwitched(calls)).toBe(false);
  });

  it('stops when local main has its own commits and cannot be fast-forwarded', () => {
    git(repo.work, 'switch', 'main');
    writeFileSync(join(repo.work, 'local.txt'), 'local\n');
    git(repo.work, 'add', 'local.txt');
    git(repo.work, 'commit', '-m', 'local main commit');
    git(repo.work, 'switch', FEATURE);
    const before = state();
    const { run, calls } = ghListing([mergedPr(before.feature)]);

    expectStop(() => sync(run), /cannot be fast-forwarded/);
    expect(state()).toEqual(before);
    expect(wasSwitched(calls)).toBe(false);
  });

  it('stops when there is no local main, without creating one', () => {
    git(repo.work, 'branch', '-D', 'main');
    const { run, calls } = ghListing([mergedPr(git(repo.work, 'rev-parse', 'HEAD'))]);

    expectStop(() => sync(run), /no local main branch/);
    expect(git(repo.work, 'branch', '--list', 'main')).toBe('');
    expect(wasFetched(calls)).toBe(false);
  });

  it('stops when run from a different repository', () => {
    const { run, calls } = ghListing([]);

    expectStop(() => sync(run, { repoRoot: repo.other }), /not .*other/);
    expect(calls.some(([command]) => command === 'gh')).toBe(false);
  });

  it('stops when a git command cannot be run at all', () => {
    const run = () => ({ status: null, stdout: '', stderr: '', error: new Error('spawnSync git ENOENT') });

    expectStop(() => sync(run), /Could not run git/);
  });
});
