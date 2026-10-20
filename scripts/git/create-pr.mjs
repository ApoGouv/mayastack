#!/usr/bin/env node
// @ts-check
/**
 * npm run git:create-pr -- --title-file <file> --body-file <file> [--check]
 *
 * Pushes the current feature branch to `origin` and opens its pull request into `main`, with
 * the exact title and Markdown body supplied, after checking that it is safe and after the user
 * types a confirmation in an interactive terminal. With --check it only validates and shows the
 * proposal: nothing is pushed or created, and no confirmation is asked.
 *
 * It never commits, stages, switches branches, force-pushes, sets an upstream or changes any
 * other Git configuration, merges, deletes branches or deploys, and it never retries a failed
 * step. Git and the GitHub CLI are run with argument arrays, never through a shell.
 *
 * Exit codes: 0 created (or checked with --check), 1 stopped by a check or a failed step,
 * 2 not confirmed (declined, or no interactive terminal to confirm in).
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { BASE, REMOTE, REPO_ROOT, WorkflowError, createWorkflow, isInside, runCommand } from './common.mjs';

/** The word the user must type to push and create the pull request */
export const CONFIRM_WORD = 'create';

/** GitHub's limits for a pull request title and body */
export const MAX_TITLE_LENGTH = 256;
export const MAX_BODY_LENGTH = 65_536;

/** Claude session links must never appear in pull requests (CLAUDE.md) */
const SESSION_LINK = /https?:\/\/(?:www\.)?claude\.ai\/(?:code|chat)\b/i;

/** The confirmation was declined, or there was no interactive terminal to ask in */
export class NotConfirmedError extends WorkflowError {
  /** @param {string} message @param {string} [hint] */
  constructor(message, hint) {
    super(message, hint);
    this.name = 'NotConfirmedError';
  }
}

/**
 * Asks for the confirmation word in an interactive terminal.
 * Piped or redirected input never counts as a confirmation.
 *
 * @param {string} question
 * @param {{ input?: NodeJS.ReadStream | import('node:stream').Readable & { isTTY?: boolean }, output?: NodeJS.WriteStream | import('node:stream').Writable & { isTTY?: boolean } }} [streams]
 * @returns {Promise<'yes' | 'no' | 'no-terminal'>}
 */
export async function confirmInTerminal(question, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY) return 'no-terminal';
  const readline = createInterface({ input, output });
  try {
    const answer = await readline.question(question);
    return answer.trim() === CONFIRM_WORD ? 'yes' : 'no';
  } finally {
    readline.close();
  }
}

/**
 * Reads a draft file (title or body). Drafts must be regular files outside the repository, so
 * they can never be committed by accident.
 * @param {string} path @param {string} label @param {{ cwd: string, repoRoot: string }} where
 */
function readDraft(path, label, { cwd, repoRoot }) {
  const file = resolve(cwd, path);
  let stats;
  try {
    stats = statSync(file);
  } catch {
    throw new WorkflowError(`The ${label} file does not exist: ${file}`, 'Check the path, then run the command again. Nothing was changed.');
  }
  if (!stats.isFile()) throw new WorkflowError(`The ${label} file is not a regular file: ${file}`);
  if (isInside(file, repoRoot)) {
    throw new WorkflowError(
      `The ${label} file is inside the repository: ${file}`,
      'Keep drafts outside the repository (for example in your temp directory), so they are never committed. Nothing was changed.'
    );
  }
  return { file, text: readFileSync(file, 'utf8') };
}

/**
 * The validated title, from --title or --title-file. A title file may end with one line break;
 * nothing else is changed.
 * @param {{ title?: string, titleFile?: string, cwd: string, repoRoot: string }} options
 */
export function readTitle({ title, titleFile, cwd, repoRoot }) {
  if ((title === undefined) === (titleFile === undefined)) {
    throw new WorkflowError('Give the pull request title with exactly one of --title or --title-file.');
  }
  const text = titleFile !== undefined ? readDraft(titleFile, 'title', { cwd, repoRoot }).text.replace(/\r?\n$/, '') : /** @type {string} */ (title);
  if (text.trim() === '') throw new WorkflowError('The pull request title is empty.');
  if (/[\r\n]/.test(text)) throw new WorkflowError('The pull request title must be a single line.');
  if (text !== text.trim()) throw new WorkflowError('The pull request title starts or ends with whitespace.', 'Remove it, so the title is used exactly as written.');
  if (text.length > MAX_TITLE_LENGTH) throw new WorkflowError(`The pull request title is ${text.length} characters long; GitHub allows at most ${MAX_TITLE_LENGTH}.`);
  if (SESSION_LINK.test(text)) throw new WorkflowError('The pull request title contains a Claude session link.', 'Remove it (CLAUDE.md does not allow session links in pull requests).');
  return text;
}

/**
 * The validated body file. The file is passed to GitHub unchanged.
 * @param {{ bodyFile?: string, cwd: string, repoRoot: string }} options
 */
export function readBody({ bodyFile, cwd, repoRoot }) {
  if (bodyFile === undefined) throw new WorkflowError('Give the pull request description with --body-file.');
  const { file, text } = readDraft(bodyFile, 'description', { cwd, repoRoot });
  if (text.trim() === '') throw new WorkflowError('The pull request description is empty.');
  if (text.includes('\0')) throw new WorkflowError('The pull request description is not a text file.');
  if (text.length > MAX_BODY_LENGTH) throw new WorkflowError(`The pull request description is ${text.length} characters long; GitHub allows at most ${MAX_BODY_LENGTH}.`);
  if (SESSION_LINK.test(text)) throw new WorkflowError('The pull request description contains a Claude session link.', 'Remove it (CLAUDE.md does not allow session links in pull requests).');
  return { file, text };
}

/** The owner/name of a GitHub remote URL, or null for another host */
export function parseGitHubRepo(/** @type {string} */ url) {
  const match = url.trim().match(/^(?:https:\/\/(?:[^@/]+@)?github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return match ? `${match[1]}/${match[2]}` : null;
}

/** Line endings and trailing whitespace aside, whether two descriptions are the same */
const sameText = (/** @type {string} */ a, /** @type {string} */ b) => a.replace(/\r\n/g, '\n').trimEnd() === b.replace(/\r\n/g, '\n').trimEnd();

/**
 * Checks everything, shows the proposal, asks for confirmation, then pushes the branch, creates
 * the pull request and verifies it.
 *
 * @param {{
 *   title?: string, titleFile?: string, bodyFile?: string, check?: boolean,
 *   cwd?: string, repoRoot?: string, run?: import('./common.mjs').Runner, log?: (line: string) => void,
 *   confirm?: (question: string) => Promise<'yes' | 'no' | 'no-terminal'>,
 * }} options
 * @returns {Promise<{ status: 'checked' } | { status: 'created', number: number, url: string, title: string, state: string }>}
 * @throws {WorkflowError} at the first failed check or step (NotConfirmedError if not confirmed)
 */
export async function createPr({
  title, titleFile, bodyFile, check = false,
  cwd = process.cwd(), repoRoot = REPO_ROOT, run = runCommand, log = console.log, confirm = confirmInTerminal,
}) {
  const { exec, git, gitSucceeds, requireCleanTree, requireRepository, requireFeatureBranch, requireGh } =
    createWorkflow({ cwd, repoRoot, run });

  // The intended repository, and the drafts
  requireRepository();
  const prTitle = readTitle({ title, titleFile, cwd, repoRoot });
  const body = readBody({ bodyFile, cwd, repoRoot });

  // A feature branch with a clean working tree
  const branch = requireFeatureBranch({
    detachedHint: 'Check out the feature branch you want to open a pull request for, then run the command again.',
    onBaseHint: `Pull requests are opened from a feature branch into ${BASE}. Check out the feature branch, then run the command again.`,
  });
  requireCleanTree();

  // The GitHub repository behind origin, which gh must be able to reach
  const originUrlResult = exec('git', ['config', '--get', `remote.${REMOTE}.url`]);
  if (originUrlResult.status !== 0) {
    throw new WorkflowError(`There is no \`${REMOTE}\` remote.`, `Add the GitHub remote as \`${REMOTE}\`, then run the command again.`);
  }
  const repo = parseGitHubRepo(originUrlResult.stdout);
  if (!repo) throw new WorkflowError(`\`${REMOTE}\` is not a GitHub repository: ${originUrlResult.stdout.trim()}`);
  requireGh('the pull request cannot be created');
  const repoView = exec('gh', ['repo', 'view', repo, '--json', 'nameWithOwner,viewerPermission']);
  if (repoView.error || repoView.status !== 0) {
    throw new WorkflowError(
      `The GitHub CLI cannot access ${repo}: ${(repoView.error?.message ?? repoView.stderr).trim()}`,
      'Check your network connection and `gh auth status`. Nothing was changed.'
    );
  }
  /** @type {{ nameWithOwner?: string, viewerPermission?: string }} */
  let repoInfo;
  try {
    repoInfo = JSON.parse(repoView.stdout);
  } catch {
    throw new WorkflowError(`Unexpected output from \`gh repo view\`: ${repoView.stdout.trim()}`);
  }
  if (!['ADMIN', 'MAINTAIN', 'WRITE'].includes(repoInfo.viewerPermission ?? '')) {
    throw new WorkflowError(`Your GitHub account cannot push to ${repo} (permission: ${repoInfo.viewerPermission ?? 'unknown'}).`, 'Nothing was changed.');
  }

  // Commits to propose against the latest main
  git('fetch', REMOTE);
  if (!gitSucceeds('rev-parse', '--verify', '--quiet', `refs/remotes/${REMOTE}/${BASE}`)) {
    throw new WorkflowError(`${REMOTE}/${BASE} does not exist after fetching.`, 'Nothing was changed apart from the fetch.');
  }
  const head = git('rev-parse', 'HEAD');
  const commits = git('log', '--format=%h %s', `refs/remotes/${REMOTE}/${BASE}..HEAD`);
  if (!commits) {
    throw new WorkflowError(`${branch} has no commits that are not already on ${REMOTE}/${BASE}.`, 'There is nothing to propose. Nothing was changed apart from the fetch.');
  }
  const behind = Number(git('rev-list', '--count', `HEAD..refs/remotes/${REMOTE}/${BASE}`));

  // The upstream, if one is set, must be the same branch on origin
  const upstream = exec('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream.status === 0 && upstream.stdout.trim() !== `${REMOTE}/${branch}`) {
    throw new WorkflowError(
      `${branch} tracks ${upstream.stdout.trim()}, not ${REMOTE}/${branch}.`,
      'Check the branch\'s upstream yourself; this command does not change it. Nothing was changed apart from the fetch.'
    );
  }

  // The branch on GitHub: absent (push it), at this commit (no push), or behind it (fast-forward push)
  const remoteRef = `refs/heads/${branch}`;
  const remoteSha = () => {
    const out = git('ls-remote', '--heads', REMOTE, remoteRef);
    const line = out.split('\n').find((entry) => entry.endsWith(`\t${remoteRef}`));
    return line ? line.split('\t')[0] : null;
  };
  const remoteBefore = remoteSha();
  /** @type {'new' | 'update' | 'none'} */
  let push;
  if (remoteBefore === null) push = 'new';
  else if (remoteBefore === head) push = 'none';
  else if (gitSucceeds('merge-base', '--is-ancestor', remoteBefore, 'HEAD')) push = 'update';
  else {
    throw new WorkflowError(
      `${REMOTE}/${branch} has commits that are not on your local ${branch} (it is at ${remoteBefore.slice(0, 7)}).`,
      'Compare them yourself; this command never force-pushes or merges. Nothing was changed apart from the fetch.'
    );
  }

  // No pull request is open for this branch into main
  const list = exec('gh', ['pr', 'list', '--repo', repo, '--head', branch, '--base', BASE, '--state', 'all', '--json', 'number,state,url', '--limit', '50']);
  if (list.error || list.status !== 0) {
    throw new WorkflowError(`Could not look up existing pull requests: ${(list.error?.message ?? list.stderr).trim()}`, 'Nothing was changed apart from the fetch.');
  }
  /** @type {{ number: number, state: string, url: string }[]} */
  let existing;
  try {
    existing = JSON.parse(list.stdout);
    if (!Array.isArray(existing)) throw new Error('not a list');
  } catch {
    throw new WorkflowError(`Unexpected output from \`gh pr list\`: ${list.stdout.trim()}`);
  }
  const open = existing.find((pr) => pr.state === 'OPEN');
  if (open) throw new WorkflowError(`Pull request #${open.number} is already open for ${branch}: ${open.url}`, 'Nothing was changed apart from the fetch.');

  // The proposal
  const pushCommand = `git push ${REMOTE} ${remoteRef}:${remoteRef}`;
  log(`Repository: ${repo}`);
  log(`Pull request: ${BASE} ← ${branch}`);
  log(`Commit: ${head}`);
  log(`Commits:\n${commits.split('\n').map((line) => `  ${line}`).join('\n')}`);
  if (behind > 0) log(`Note: ${REMOTE}/${BASE} has ${behind} commit(s) that ${branch} does not include.`);
  for (const pr of existing) log(`Note: earlier pull request #${pr.number} for this branch is ${pr.state.toLowerCase()}: ${pr.url}`);
  log(`Push: ${push === 'none' ? `none (${REMOTE}/${branch} is already at this commit)` : pushCommand}`);
  log(`Title: ${prTitle}`);
  log(`Description (${body.file}):\n----------\n${body.text.trimEnd()}\n----------`);

  if (check) {
    log('Checked: nothing was pushed or created.');
    return { status: 'checked' };
  }

  // Explicit confirmation, typed in a terminal
  const answer = await confirm(`Type "${CONFIRM_WORD}" to ${push === 'none' ? '' : 'push the branch and '}create this pull request, or anything else to cancel: `);
  if (answer === 'no-terminal') {
    throw new NotConfirmedError(
      'Confirmation needs an interactive terminal, and there is none here. Nothing was pushed or created.',
      'Run the same command yourself in a terminal and type the confirmation there.'
    );
  }
  if (answer !== 'yes') throw new NotConfirmedError('Cancelled. Nothing was pushed or created.');

  // Nothing may have changed while the user was reading
  requireCleanTree('after confirming');
  if (git('symbolic-ref', '--quiet', '--short', 'HEAD') !== branch || git('rev-parse', 'HEAD') !== head) {
    throw new WorkflowError('The branch or commit changed while waiting for confirmation.', 'Run the command again to review the new state. Nothing was pushed or created.');
  }

  // Push only this branch, to the same name, without force and without changing configuration
  if (push !== 'none') {
    const pushed = exec('git', ['push', REMOTE, `${remoteRef}:${remoteRef}`]);
    if (pushed.error || pushed.status !== 0) {
      throw new WorkflowError(
        `Pushing ${branch} failed: ${(pushed.error?.message ?? pushed.stderr).trim()}`,
        'No pull request was created. Fix the cause, then run the command again.'
      );
    }
    if (remoteSha() !== head) {
      throw new WorkflowError(`After pushing, ${REMOTE}/${branch} is not at ${head.slice(0, 7)}.`, 'No pull request was created. Check the branch on GitHub.');
    }
  }
  const pushedNote = push === 'none' ? `Nothing was pushed (${REMOTE}/${branch} was already at ${head.slice(0, 7)}).` : `${branch} was pushed to ${REMOTE} at ${head.slice(0, 7)}.`;

  // Create the pull request with exactly the given title and body
  const created = exec('gh', ['pr', 'create', '--repo', repo, '--base', BASE, '--head', branch, '--title', prTitle, '--body-file', body.file]);
  if (created.error || created.status !== 0) {
    throw new WorkflowError(
      `${pushedNote} Creating the pull request failed: ${(created.error?.message ?? created.stderr).trim()}`,
      'Nothing else was done. Fix the cause, then run the command again (the branch is already on GitHub), or create the pull request on GitHub.'
    );
  }
  const url = created.stdout.trim().split('\n').pop()?.trim() ?? '';

  // Verify what GitHub now has
  const viewed = exec('gh', ['pr', 'view', url, '--repo', repo, '--json', 'number,url,title,state,baseRefName,headRefName,headRefOid,body']);
  if (viewed.error || viewed.status !== 0) {
    throw new WorkflowError(`${pushedNote} The pull request was created (${url}), but it could not be verified: ${(viewed.error?.message ?? viewed.stderr).trim()}`, 'Check it on GitHub.');
  }
  /** @type {{ number: number, url: string, title: string, state: string, baseRefName: string, headRefName: string, headRefOid: string, body: string }} */
  const pr = JSON.parse(viewed.stdout);
  const differences = [
    pr.title !== prTitle && 'title',
    !sameText(pr.body ?? '', body.text) && 'description',
    pr.baseRefName !== BASE && 'base branch',
    pr.headRefName !== branch && 'head branch',
    pr.headRefOid !== head && 'head commit',
    pr.state !== 'OPEN' && 'state',
  ].filter(Boolean);
  if (differences.length > 0) {
    throw new WorkflowError(`${pushedNote} The pull request was created (${pr.url}), but its ${differences.join(', ')} differ(s) from what was approved.`, 'Check it on GitHub. Nothing else was done.');
  }
  return { status: 'created', number: pr.number, url: pr.url, title: pr.title, state: pr.state };
}

const USAGE = `Usage: npm run git:create-pr -- --title-file <file> --body-file <file> [--check]
       (or --title "<title>" instead of --title-file)

  --title-file <file>  The pull request title (one line), from a file outside the repository
  --title <title>      The title as an argument (prefer --title-file: npm passes arguments through a shell)
  --body-file <file>   The Markdown description, from a file outside the repository
  --check              Validate and show the proposal only; nothing is pushed or created`;

/** Parses the command line */
export function parseCliArgs(/** @type {string[]} */ args) {
  try {
    const { values } = parseArgs({
      args,
      options: {
        title: { type: 'string' },
        'title-file': { type: 'string' },
        'body-file': { type: 'string' },
        check: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
    return { title: values.title, titleFile: values['title-file'], bodyFile: values['body-file'], check: values.check, help: values.help };
  } catch (error) {
    throw new WorkflowError(/** @type {Error} */ (error).message, USAGE);
  }
}

/** Runs the command from the command line and returns its exit code */
export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseCliArgs(args);
    if (options.help) {
      console.log(USAGE);
      return 0;
    }
    const result = await createPr(options);
    if (result.status === 'created') {
      console.log(`\n✔ Pull request #${result.number} was created and verified: ${result.url}`);
      console.log(`  Title: ${result.title}`);
      console.log(`  State: ${result.state}`);
    }
    return 0;
  } catch (error) {
    if (error instanceof WorkflowError) {
      console.error(`\n✖ ${error.message}`);
      if (error.hint) console.error(`  ${error.hint}`);
      return error instanceof NotConfirmedError ? 2 : 1;
    }
    console.error('\n✖ Unexpected error:', error);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
