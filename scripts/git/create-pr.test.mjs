// @ts-check
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPO_ROOT, WorkflowError, runCommand } from './common.mjs';
import {
  COMMAND, NotConfirmedError, confirmInTerminal, createPr, parseCliArgs, parseGitHubRepo, requireOptionsNotTakenByNpm,
} from './create-pr.mjs';

// Every test runs against throwaway repositories in the system temp directory, in folders whose
// names contain spaces. The working clone's origin is configured as a GitHub URL, and a
// url.insteadOf rule in that clone's own configuration maps it to a local bare repository, so
// fetches and pushes stay on disk. Only the GitHub CLI is faked.

const GITHUB_URL = 'https://github.com/test-owner/test-repo.git';
const BRANCH = 'feature/pr-test';
const TITLE = 'feat: add a thing';
const BODY = '## Summary\n\nAdds a thing.\n';

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

/** Commits a new file on the current branch */
function commitFile(cwd, name, message) {
  writeFileSync(join(cwd, name), `${name}\n`);
  git(cwd, 'add', name);
  git(cwd, 'commit', '-m', message);
}

/** @type {{ root: string, origin: string, work: string, drafts: string, titleFile: string, bodyFile: string }} */
let repo;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'create pr '));
  repo = {
    root,
    origin: join(root, 'origin repo.git'),
    work: join(root, 'work tree'),
    drafts: join(root, 'pr drafts'),
    titleFile: join(root, 'pr drafts', 'title.txt'),
    bodyFile: join(root, 'pr drafts', 'body.md'),
  };
  git(root, 'init', '--bare', '--initial-branch=main', repo.origin);
  git(root, 'clone', repo.origin, repo.work);
  commitFile(repo.work, 'a.txt', 'initial');
  git(repo.work, 'push', 'origin', 'main');
  git(repo.work, 'config', `url.${repo.origin}.insteadOf`, GITHUB_URL);
  git(repo.work, 'remote', 'set-url', 'origin', GITHUB_URL);
  git(repo.work, 'switch', '-c', BRANCH);
  commitFile(repo.work, 'b.txt', 'feature work');

  mkdirSync(repo.drafts);
  writeFileSync(repo.titleFile, `${TITLE}\n`);
  writeFileSync(repo.bodyFile, BODY);
});

afterEach(() => {
  rmSync(repo.root, { recursive: true, force: true });
});

/** The commit a branch is at on the "GitHub" remote, or null if it is not there */
function remoteHead(branch = BRANCH) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repo.origin, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
const fail = (stderr) => ({ status: 1, stdout: '', stderr });

/**
 * A runner that runs Git for real and fakes the GitHub CLI: it records the pull request that
 * `gh pr create` is given (reading the body file, and the head commit from the remote), and
 * `gh pr view` returns it, optionally altered.
 */
function fakeGh({ prs = [], missing = false, authFails = false, repoFails = false, permission = 'WRITE', createFails = false, alter = (pr) => pr } = {}) {
  /** @type {string[][]} */
  const calls = [];
  /** @type {any} */
  let created = null;
  /** @type {import('./common.mjs').Runner} */
  const run = (command, args, options) => {
    calls.push([command, ...args]);
    if (command !== 'gh') return runCommand(command, args, options);
    if (missing) return { status: null, stdout: '', stderr: '', error: new Error('spawnSync gh ENOENT') };
    const [first, second] = args;
    const flag = (name) => args[args.indexOf(name) + 1];
    if (first === '--version') return ok('gh version 2.0.0');
    if (first === 'auth') return authFails ? fail('You are not logged into any GitHub hosts.') : ok();
    if (first === 'repo') return repoFails ? fail('HTTP 404: Not Found') : ok(JSON.stringify({ nameWithOwner: 'test-owner/test-repo', viewerPermission: permission }));
    if (first === 'pr' && second === 'list') return ok(JSON.stringify(prs));
    if (first === 'pr' && second === 'create') {
      if (createFails) return fail('GraphQL: something went wrong');
      created = {
        number: 7,
        url: 'https://github.com/test-owner/test-repo/pull/7',
        title: flag('--title'),
        body: readFileSync(flag('--body-file'), 'utf8'),
        baseRefName: flag('--base'),
        headRefName: flag('--head'),
        headRefOid: remoteHead(flag('--head')),
        state: 'OPEN',
      };
      return ok(`${created.url}\n`);
    }
    if (first === 'pr' && second === 'view') return ok(JSON.stringify(alter({ ...created })));
    return fail(`unexpected gh call: ${args.join(' ')}`);
  };
  return { run, calls, created: () => created };
}

/** @type {string[]} */
let logs;
beforeEach(() => {
  logs = [];
});

/** Runs createPr in the working clone, confirming unless told otherwise */
const create = (gh, options = {}) =>
  createPr({
    titleFile: repo.titleFile,
    bodyFile: repo.bodyFile,
    cwd: repo.work,
    repoRoot: repo.work,
    run: gh.run,
    log: (line) => logs.push(line),
    confirm: async () => 'yes',
    ...options,
  });

/** Expects createPr to stop with an error of the given type matching the message */
async function expectStop(promise, message, type = WorkflowError) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(type);
    expect(error.message).toMatch(message);
    return error;
  }
  throw new Error('Expected createPr to stop, but it succeeded');
}

const pushed = (calls) => calls.some(([command, sub]) => command === 'git' && sub === 'push');
const createCalled = (calls) => calls.some(([command, a, b]) => command === 'gh' && a === 'pr' && b === 'create');
const ghCalled = (calls) => calls.some(([command]) => command === 'gh');

describe('git:create-pr', { timeout: 60_000 }, () => {
  describe('title and description', () => {
    it('requires exactly one of --title and --title-file', async () => {
      const gh = fakeGh();
      await expectStop(create(gh, { titleFile: undefined }), /exactly one of --title or --title-file/);
      await expectStop(create(gh, { title: TITLE }), /exactly one of --title or --title-file/);
      expect(ghCalled(gh.calls)).toBe(false);
    });

    it('rejects an empty, multi-line, padded or overlong title', async () => {
      const gh = fakeGh();
      writeFileSync(repo.titleFile, '\n');
      await expectStop(create(gh), /title is empty/);
      await expectStop(create(gh, { titleFile: undefined, title: 'feat: one\nfeat: two' }), /single line/);
      await expectStop(create(gh, { titleFile: undefined, title: ' feat: padded' }), /starts or ends with whitespace/);
      await expectStop(create(gh, { titleFile: undefined, title: `feat: ${'x'.repeat(260)}` }), /GitHub allows at most 256/);
      expect(ghCalled(gh.calls)).toBe(false);
    });

    it('requires an existing, non-empty description file', async () => {
      const gh = fakeGh();
      await expectStop(create(gh, { bodyFile: undefined }), /--body-file/);
      await expectStop(create(gh, { bodyFile: join(repo.drafts, 'missing.md') }), /description file does not exist/);
      writeFileSync(repo.bodyFile, '  \n\n');
      await expectStop(create(gh), /description is empty/);
      expect(ghCalled(gh.calls)).toBe(false);
    });

    it('rejects draft files inside the repository', async () => {
      const inside = join(repo.work, 'body.md');
      writeFileSync(inside, BODY);
      await expectStop(create(fakeGh(), { bodyFile: inside }), /description file is inside the repository/);
    });

    it('rejects Claude session links in the title or description', async () => {
      writeFileSync(repo.bodyFile, `${BODY}\nhttps://claude.ai/code/session_123\n`);
      await expectStop(create(fakeGh()), /description contains a Claude session link/);
      await expectStop(create(fakeGh(), { titleFile: undefined, title: 'feat: see https://claude.ai/code/x' }), /title contains a Claude session link/);
    });
  });

  describe('branch and working tree', () => {
    it('stops on main', async () => {
      git(repo.work, 'switch', 'main');
      await expectStop(create(fakeGh()), /already on main/);
    });

    it('stops on a detached HEAD', async () => {
      git(repo.work, 'switch', '--detach');
      await expectStop(create(fakeGh()), /HEAD is detached/);
    });

    it('stops on uncommitted or untracked changes, before contacting GitHub', async () => {
      writeFileSync(join(repo.work, 'notes.txt'), 'mine\n');
      const gh = fakeGh();
      await expectStop(create(gh), /uncommitted or untracked changes:\n\?\? notes\.txt/);
      expect(ghCalled(gh.calls)).toBe(false);
    });

    it('stops when the branch has no commits to propose', async () => {
      git(repo.work, 'switch', '-c', 'feature/empty', 'main');
      await expectStop(create(fakeGh()), /no commits that are not already on origin\/main/);
    });
  });

  describe('upstream and remote branch', () => {
    it('stops when the branch tracks another upstream', async () => {
      git(repo.work, 'fetch', 'origin');
      git(repo.work, 'branch', `--set-upstream-to=origin/main`);
      const gh = fakeGh();
      await expectStop(create(gh), /tracks origin\/main, not origin\/feature\/pr-test/);
      expect(pushed(gh.calls)).toBe(false);
    });

    it('stops when the remote branch has commits the local branch does not', async () => {
      git(repo.work, 'push', 'origin', `${BRANCH}:${BRANCH}`);
      const other = join(repo.root, 'other clone');
      git(repo.root, 'clone', repo.origin, other);
      git(other, 'switch', BRANCH);
      commitFile(other, 'c.txt', 'someone else');
      git(other, 'push', 'origin', BRANCH);
      const before = remoteHead();

      const gh = fakeGh();
      await expectStop(create(gh), /origin\/feature\/pr-test has commits that are not on your local/);
      expect(pushed(gh.calls)).toBe(false);
      expect(remoteHead()).toBe(before);
    });
  });

  describe('GitHub CLI and existing pull requests', () => {
    it('stops when gh is not installed', async () => {
      await expectStop(create(fakeGh({ missing: true })), /GitHub CLI \(gh\) is not available/);
    });

    it('stops when gh is not logged in', async () => {
      await expectStop(create(fakeGh({ authFails: true })), /not logged in/);
    });

    it('stops when gh cannot access the repository, or cannot push to it', async () => {
      await expectStop(create(fakeGh({ repoFails: true })), /cannot access test-owner\/test-repo.*HTTP 404/);
      await expectStop(create(fakeGh({ permission: 'READ' })), /cannot push to test-owner\/test-repo/);
    });

    it('stops when a pull request is already open for the branch', async () => {
      const gh = fakeGh({ prs: [{ number: 3, state: 'OPEN', url: 'https://github.com/test-owner/test-repo/pull/3' }] });
      await expectStop(create(gh), /#3 is already open .*pull\/3/);
      expect(pushed(gh.calls)).toBe(false);
      expect(createCalled(gh.calls)).toBe(false);
    });
  });

  describe('confirmation', () => {
    it('only validates and shows the proposal with --check', async () => {
      const gh = fakeGh();
      const head = git(repo.work, 'rev-parse', 'HEAD');
      expect(await create(gh, { check: true, confirm: async () => { throw new Error('must not ask'); } })).toEqual({ status: 'checked' });
      expect(pushed(gh.calls)).toBe(false);
      expect(createCalled(gh.calls)).toBe(false);
      expect(remoteHead()).toBeNull();
      const shown = logs.join('\n');
      for (const expected of ['main ← feature/pr-test', `Commit: ${head}`, `Title: ${TITLE}`, BODY.trimEnd(), `git push origin refs/heads/${BRANCH}:refs/heads/${BRANCH}`]) {
        expect(shown).toContain(expected);
      }
    });

    it('pushes and creates nothing when the user declines', async () => {
      const gh = fakeGh();
      await expectStop(create(gh, { confirm: async () => 'no' }), /Cancelled\. Nothing was pushed or created/, NotConfirmedError);
      expect(pushed(gh.calls)).toBe(false);
      expect(createCalled(gh.calls)).toBe(false);
      expect(remoteHead()).toBeNull();
    });

    it('pushes and creates nothing without an interactive terminal', async () => {
      const gh = fakeGh();
      await expectStop(create(gh, { confirm: async () => 'no-terminal' }), /needs an interactive terminal/, NotConfirmedError);
      expect(pushed(gh.calls)).toBe(false);
      expect(remoteHead()).toBeNull();
    });

    it('pushes nothing if the working tree changed while waiting for confirmation', async () => {
      const gh = fakeGh();
      const confirm = async () => {
        writeFileSync(join(repo.work, 'late.txt'), 'late\n');
        return /** @type {const} */ ('yes');
      };
      await expectStop(create(gh, { confirm }), /uncommitted or untracked changes after confirming/);
      expect(pushed(gh.calls)).toBe(false);
    });
  });

  describe('push and create', () => {
    it('pushes the branch, creates the pull request and verifies it', async () => {
      const gh = fakeGh();
      const head = git(repo.work, 'rev-parse', 'HEAD');

      const result = await create(gh);

      expect(result).toEqual({ status: 'created', number: 7, url: 'https://github.com/test-owner/test-repo/pull/7', title: TITLE, state: 'OPEN' });
      expect(remoteHead()).toBe(head);
      // Only this branch, to the same name, without force or setting an upstream
      expect(gh.calls).toContainEqual(['git', 'push', 'origin', `refs/heads/${BRANCH}:refs/heads/${BRANCH}`]);
      expect(spawnSync('git', ['config', '--get', `branch.${BRANCH}.remote`], { cwd: repo.work }).status).toBe(1);
      expect(git(repo.work, 'symbolic-ref', '--short', 'HEAD')).toBe(BRANCH);
      expect(git(repo.work, 'rev-parse', 'HEAD')).toBe(head);
      expect(gh.created()).toMatchObject({ title: TITLE, body: BODY, baseRefName: 'main', headRefName: BRANCH });
    });

    it('creates no pull request when the push fails', async () => {
      git(repo.work, 'config', 'remote.origin.pushurl', join(repo.root, 'missing remote.git'));
      const gh = fakeGh();
      const error = await expectStop(create(gh), /Pushing feature\/pr-test failed/);
      expect(error.hint).toMatch(/No pull request was created/);
      expect(createCalled(gh.calls)).toBe(false);
      expect(remoteHead()).toBeNull();
    });

    it('reports a pushed branch when creating the pull request fails, and a second run skips the push', async () => {
      const head = git(repo.work, 'rev-parse', 'HEAD');
      const error = await expectStop(create(fakeGh({ createFails: true })), /was pushed to origin at .*Creating the pull request failed: GraphQL/);
      expect(error.hint).toMatch(/Nothing else was done/);
      expect(remoteHead()).toBe(head);

      const retry = fakeGh();
      const result = await create(retry);
      expect(result.status).toBe('created');
      expect(pushed(retry.calls)).toBe(false);
    });

    it('updates a remote branch that is behind with a fast-forward push', async () => {
      git(repo.work, 'push', 'origin', `${BRANCH}:${BRANCH}`);
      commitFile(repo.work, 'c.txt', 'more work');
      const result = await create(fakeGh());
      expect(result.status).toBe('created');
      expect(remoteHead()).toBe(git(repo.work, 'rev-parse', 'HEAD'));
    });

    it('reports a created pull request that does not match what was approved', async () => {
      const gh = fakeGh({ alter: (pr) => ({ ...pr, title: 'something else' }) });
      await expectStop(create(gh), /was created \(.*pull\/7\), but its title differ/);
    });

    it('passes special characters in branch names, titles, descriptions and paths unchanged', async () => {
      // Characters a shell would interpret; Git does not allow spaces in branch names
      const branch = "feature/ü&$(rm)'q';%PATH%!#`t`";
      git(repo.work, 'switch', '-c', branch, 'main');
      commitFile(repo.work, 'd.txt', 'special branch');
      const title = 'feat: "quoted" & $(rm -rf /) | %PATH% `tick` ü; done';
      const body = '## Summary\n\nUses `code`, $(subshells), "quotes", \'apostrophes\' & pipes | here.\n\n- ü ✓\n';
      writeFileSync(repo.titleFile, `${title}\n`);
      writeFileSync(repo.bodyFile, body);

      const gh = fakeGh();
      const result = await create(gh);

      expect(result.status).toBe('created');
      expect(gh.created()).toMatchObject({ title, body, headRefName: branch });
      expect(remoteHead(branch)).toBe(git(repo.work, 'rev-parse', 'HEAD'));
      expect(gh.calls).toContainEqual(expect.arrayContaining(['gh', 'pr', 'create', '--head', branch, '--title', title, '--body-file', repo.bodyFile]));
    });
  });
});

describe('confirmInTerminal', () => {
  /** Streams that look like a terminal, with the user typing the given line */
  const terminal = (line) => {
    const input = Object.assign(new PassThrough(), { isTTY: true });
    const output = Object.assign(new PassThrough(), { isTTY: true });
    input.end(`${line}\n`);
    return { input, output };
  };

  it('accepts only the exact confirmation word', async () => {
    expect(await confirmInTerminal('Confirm? ', terminal('create'))).toBe('yes');
    expect(await confirmInTerminal('Confirm? ', terminal('  create  '))).toBe('yes');
    expect(await confirmInTerminal('Confirm? ', terminal('yes'))).toBe('no');
    expect(await confirmInTerminal('Confirm? ', terminal(''))).toBe('no');
  });

  it('never accepts piped or redirected input', async () => {
    const input = new PassThrough();
    input.end('create\n');
    expect(await confirmInTerminal('Confirm? ', { input, output: Object.assign(new PassThrough(), { isTTY: true }) })).toBe('no-terminal');
  });
});

describe('command line and URLs', () => {
  it('parses the options and rejects unknown ones', () => {
    expect(parseCliArgs(['--title-file', 'a b.txt', '--body-file', 'c.md', '--check'])).toEqual({
      title: undefined, titleFile: 'a b.txt', bodyFile: 'c.md', check: true, help: false,
    });
    expect(() => parseCliArgs(['--yes'])).toThrow(WorkflowError);
    expect(() => parseCliArgs(['positional'])).toThrow(WorkflowError);
  });

  it('stops when npm took options meant for the script', () => {
    // What npm passes on after Windows PowerShell's npm.ps1 drops the `--`
    const env = { npm_lifecycle_event: 'git:create-pr', npm_config_check: 'true', npm_config_title_file: 'true', npm_config_body_file: 'true' };
    expect(() => requireOptionsNotTakenByNpm(env)).toThrow(/npm took --title-file, --body-file, --check as its own options/);
    // A lost --check alone must not let a run go ahead as a real one
    expect(() => requireOptionsNotTakenByNpm({ npm_lifecycle_event: 'git:create-pr', npm_config_check: 'true' })).toThrow(WorkflowError);
    // Options that reached the script, through npm with `--` or through node directly
    expect(() => requireOptionsNotTakenByNpm({ npm_lifecycle_event: 'git:create-pr' })).not.toThrow();
    expect(() => requireOptionsNotTakenByNpm({ npm_config_check: 'true' })).not.toThrow();
  });

  it('recognises GitHub remote URLs only', () => {
    expect(parseGitHubRepo('https://github.com/ApoGouv/mayastack.git')).toBe('ApoGouv/mayastack');
    expect(parseGitHubRepo('git@github.com:ApoGouv/mayastack.git\n')).toBe('ApoGouv/mayastack');
    expect(parseGitHubRepo('ssh://git@github.com/ApoGouv/mayastack')).toBe('ApoGouv/mayastack');
    expect(parseGitHubRepo('https://gitlab.com/ApoGouv/mayastack.git')).toBeNull();
    expect(parseGitHubRepo('C:/repos/origin.git')).toBeNull();
  });
});

describe('documented command', () => {
  /** Runs the script as documented, from the repository root, without a shell or npm */
  function runDocumented(/** @type {string[]} */ args, /** @type {Record<string, string>} */ extraEnv = {}) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^npm_/i.test(name)));
    return spawnSync(process.execPath, ['scripts/git/create-pr.mjs', ...args], {
      cwd: REPO_ROOT, encoding: 'utf8', shell: false, env: { ...env, ...extraEnv },
    });
  }

  it('shows the documented command in its usage', () => {
    const result = runDocumented(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Usage: ${COMMAND} --title-file <file> --body-file <file> [--check]`);
  });

  it('receives option values containing spaces intact', () => {
    // Read-only: the script stops at the missing title file, before fetching or reading branches
    const titleFile = join(repo.root, 'missing drafts', 'pr title.txt');
    const bodyFile = join(repo.root, 'missing drafts', 'pr body.md');
    const result = runDocumented(['--check', '--title-file', titleFile, '--body-file', bodyFile]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`The title file does not exist: ${titleFile}`);
  });

  it('explains, rather than misreads, arguments that npm stripped of their options', () => {
    const titleFile = join(repo.root, 'pr title.txt');
    const bodyFile = join(repo.root, 'pr body.md');
    const result = runDocumented([titleFile, bodyFile], {
      npm_lifecycle_event: 'git:create-pr', npm_config_check: 'true', npm_config_title_file: 'true', npm_config_body_file: 'true',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('npm took --title-file, --body-file, --check as its own options');
    expect(result.stderr).toContain(`Run the script with node instead, from the repository root: ${COMMAND}`);
    expect(result.stderr).not.toContain('Unexpected argument');
  });
});
