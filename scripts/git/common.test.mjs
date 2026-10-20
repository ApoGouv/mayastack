// @ts-check
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkflowError, createWorkflow, isInside, runCommand } from './common.mjs';

/** @type {string} */
let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'git common '));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runCommand', () => {
  it('passes every argument unchanged, without a shell', () => {
    const args = ['a b', '"double"', "'single'", '$(echo hi)', '`tick`', '&|;<>', '%PATH%', '^caret', '!bang', 'ü ✓', ''];
    const result = runCommand(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', ...args], { cwd: root });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(args);
  });

  it('reports a command that cannot be started instead of throwing', () => {
    const result = runCommand('mayastack-no-such-command', [], { cwd: root });
    expect(result.error).toBeInstanceOf(Error);
    expect(result.status).toBeNull();
  });
});

describe('isInside', () => {
  it('distinguishes a folder, its contents, and siblings that share its name as a prefix', () => {
    const repo = join(root, 'repo');
    mkdirSync(join(repo, 'docs'), { recursive: true });
    mkdirSync(join(root, 'repo-drafts'));
    writeFileSync(join(repo, 'docs', 'file.md'), 'x');
    writeFileSync(join(root, 'repo-drafts', 'body.md'), 'x');

    expect(isInside(repo, repo)).toBe(true);
    expect(isInside(join(repo, 'docs', 'file.md'), repo)).toBe(true);
    expect(isInside(join(root, 'repo-drafts', 'body.md'), repo)).toBe(false);
    expect(isInside(root, repo)).toBe(false);
  });
});

describe('createWorkflow checks', () => {
  /** A repository with one commit on main, checked out on a feature branch */
  const makeRepo = () => {
    const repo = join(root, 'repo');
    const git = (...args) => {
      const result = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
    };
    mkdirSync(repo);
    git('init', '--initial-branch=main');
    writeFileSync(join(repo, 'a.txt'), 'a\n');
    git('add', 'a.txt');
    git('commit', '-m', 'initial');
    git('switch', '-c', 'feature/x');
    return { repo, git };
  };
  const hints = { detachedHint: 'detached hint', onBaseHint: 'base hint' };

  it('accepts the intended repository on a feature branch with a clean tree', () => {
    const { repo } = makeRepo();
    const workflow = createWorkflow({ cwd: repo, repoRoot: repo, run: runCommand });
    workflow.requireRepository();
    expect(workflow.requireFeatureBranch(hints)).toBe('feature/x');
    workflow.requireCleanTree();
  });

  it('rejects another repository, the base branch and a dirty tree, with their hints', () => {
    const { repo, git } = makeRepo();
    const other = join(root, 'other');
    mkdirSync(other);
    expect(() => createWorkflow({ cwd: repo, repoRoot: other, run: runCommand }).requireRepository()).toThrow(/not .*other/);

    const workflow = createWorkflow({ cwd: repo, repoRoot: repo, run: runCommand });
    git('switch', 'main');
    expect(() => workflow.requireFeatureBranch(hints)).toThrow(expect.objectContaining({ message: 'You are already on main.', hint: 'base hint' }));

    writeFileSync(join(repo, 'a.txt'), 'changed\n');
    expect(() => workflow.requireCleanTree('now')).toThrow(/changes now:\n M a\.txt$/);
  });

  it('stops when gh is missing or not logged in, without running anything else', () => {
    const { repo } = makeRepo();
    const missing = createWorkflow({ cwd: repo, repoRoot: repo, run: () => ({ status: null, stdout: '', stderr: '', error: new Error('ENOENT') }) });
    expect(() => missing.requireGh('it cannot work')).toThrow(WorkflowError);
    expect(() => missing.requireGh('it cannot work')).toThrow('The GitHub CLI (gh) is not available, so it cannot work.');

    /** @type {string[][]} */
    const calls = [];
    const loggedOut = createWorkflow({
      cwd: repo,
      repoRoot: repo,
      run: (command, args) => {
        calls.push([command, ...args]);
        return args[0] === 'auth' ? { status: 1, stdout: '', stderr: 'no' } : { status: 0, stdout: '', stderr: '' };
      },
    });
    expect(() => loggedOut.requireGh('it cannot work')).toThrow(/not logged in to GitHub, so it cannot work/);
    expect(calls).toEqual([['gh', '--version'], ['gh', 'auth', 'status']]);
  });
});
