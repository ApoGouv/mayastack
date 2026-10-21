#!/usr/bin/env node
// @ts-check
/**
 * npm run git:sync-main
 *
 * After a feature branch's pull request has been merged on GitHub: checks that it is safe to
 * leave the branch, then switches to local `main` and fast-forwards it to `origin/main`.
 *
 * Safety: it never commits, stages, stashes, pushes, rebases, resets, deletes branches, creates
 * branches or changes Git configuration. It stops at the first failed check or command, before
 * any further change. Git and the GitHub CLI are run with argument arrays, never through a shell.
 */
import { pathToFileURL } from 'node:url';
import { BASE, REMOTE, REPO_ROOT, WorkflowError, createWorkflow, runCommand } from './common.mjs';

/**
 * Switches from a merged feature branch to an up-to-date local `main`.
 *
 * @param {{ cwd?: string, repoRoot?: string, run?: import('./common.mjs').Runner, log?: (line: string) => void }} [options]
 * @returns {{ commit: string, subject: string, pr: { number: number, url: string } }}
 * @throws {WorkflowError} at the first failed check or command
 */
export function syncMain({ cwd = process.cwd(), repoRoot = REPO_ROOT, run = runCommand, log = console.log } = {}) {
  const { exec, git, gitSucceeds, requireCleanTree, requireRepository, requireFeatureBranch, requireGh } =
    createWorkflow({ cwd, repoRoot, run });

  // 1. The intended repository
  requireRepository();

  // 2. A feature branch, not the base branch or a detached HEAD
  const branch = requireFeatureBranch({
    detachedHint: 'Check out the merged feature branch, then run the command again.',
    onBaseHint: `This command starts from a merged feature branch. To update ${BASE} itself, use \`git pull --ff-only ${REMOTE} ${BASE}\`.`,
  });
  log(`Branch: ${branch}`);

  // 3. A clean working tree (staged, unstaged and untracked)
  requireCleanTree();

  // Local main and the remote must exist: they are never created here
  if (!gitSucceeds('show-ref', '--verify', '--quiet', `refs/heads/${BASE}`)) {
    throw new WorkflowError(`There is no local ${BASE} branch.`, `Create it yourself if you want one (for example \`git switch ${BASE}\`), then run the command again.`);
  }
  if (!gitSucceeds('remote', 'get-url', REMOTE)) {
    throw new WorkflowError(`There is no \`${REMOTE}\` remote.`, `Add the GitHub remote as \`${REMOTE}\`, then run the command again.`);
  }
  const head = git('rev-parse', 'HEAD');

  // 4. The branch's pull request into main is merged, at exactly this commit
  requireGh('the pull request cannot be verified');
  const list = exec('gh', [
    'pr', 'list', '--head', branch, '--base', BASE, '--state', 'all',
    '--json', 'number,state,url,headRefOid', '--limit', '50',
  ]);
  if (list.error || list.status !== 0) {
    throw new WorkflowError(
      `Could not look up the pull request for ${branch}: ${(list.error?.message ?? list.stderr).trim()}`,
      'Check your network connection and `gh auth status`, then run the command again. Nothing was changed.'
    );
  }
  /** @type {{ number: number, state: string, url: string, headRefOid: string }[]} */
  let prs;
  try {
    prs = JSON.parse(list.stdout);
    if (!Array.isArray(prs)) throw new Error('not a list');
  } catch {
    throw new WorkflowError(`Unexpected output from \`gh pr list\`: ${list.stdout.trim()}`);
  }
  const merged = prs.find((pr) => pr.state === 'MERGED' && pr.headRefOid === head);
  if (!merged) {
    const open = prs.find((pr) => pr.state === 'OPEN');
    const mergedElsewhere = prs.find((pr) => pr.state === 'MERGED');
    if (open) {
      throw new WorkflowError(`Pull request #${open.number} for ${branch} is still open: ${open.url}`, 'Merge it on GitHub first, then run the command again. Nothing was changed.');
    }
    if (mergedElsewhere) {
      throw new WorkflowError(
        `Pull request #${mergedElsewhere.number} was merged at ${mergedElsewhere.headRefOid.slice(0, 7)}, but ${branch} is at ${head.slice(0, 7)}.`,
        'Your local branch has commits that were not part of the merged pull request. Push them and open a new pull request, or check the branch; nothing was changed.'
      );
    }
    if (prs.length > 0) {
      throw new WorkflowError(`The pull request for ${branch} was closed without being merged: ${prs[0].url}`, 'Nothing was changed.');
    }
    throw new WorkflowError(
      `No pull request from ${branch} into ${BASE} was found on GitHub.`,
      'Check that the branch was pushed under this name and its pull request targets main. Nothing was changed.'
    );
  }
  log(`Pull request #${merged.number} is merged: ${merged.url}`);

  // 5. The latest remote state
  git('fetch', REMOTE);
  if (!gitSucceeds('rev-parse', '--verify', '--quiet', `refs/remotes/${REMOTE}/${BASE}`)) {
    throw new WorkflowError(`${REMOTE}/${BASE} does not exist after fetching.`, 'Nothing was changed apart from the fetch.');
  }
  // Fast-forward only: local main must not have commits of its own
  if (!gitSucceeds('merge-base', '--is-ancestor', `refs/heads/${BASE}`, `refs/remotes/${REMOTE}/${BASE}`)) {
    throw new WorkflowError(
      `Local ${BASE} has commits that are not on ${REMOTE}/${BASE}, so it cannot be fast-forwarded.`,
      `Inspect them with \`git log ${REMOTE}/${BASE}..${BASE}\`. You are still on ${branch}; nothing was changed apart from the fetch.`
    );
  }
  // The tree could have changed while gh and fetch ran
  requireCleanTree('before switching');

  // 6–7. Switch to main and fast-forward it
  git('switch', BASE);
  const afterSwitch = `You are now on ${BASE}; ${branch} is unchanged.`;
  try {
    git('merge', '--ff-only', `refs/remotes/${REMOTE}/${BASE}`);
  } catch (error) {
    throw new WorkflowError(`${/** @type {Error} */ (error).message}`, `${afterSwitch} No further changes were made.`);
  }

  // 8. Verify the result
  const current = git('symbolic-ref', '--quiet', '--short', 'HEAD');
  const commit = git('rev-parse', 'HEAD');
  const remoteCommit = git('rev-parse', `refs/remotes/${REMOTE}/${BASE}`);
  if (current !== BASE || commit !== remoteCommit) {
    throw new WorkflowError(`After updating, HEAD is ${current} at ${commit.slice(0, 7)}, not ${BASE} at ${remoteCommit.slice(0, 7)}.`, afterSwitch);
  }
  requireCleanTree('after updating');

  // 9. Done
  const subject = git('log', '-1', '--format=%s');
  return { commit, subject, pr: { number: merged.number, url: merged.url } };
}

/** Runs the sync from the command line, with an exit code of 0 or 1 */
export function main() {
  try {
    const { commit, subject, pr } = syncMain();
    console.log(`\n✔ ${BASE} is up to date with ${REMOTE}/${BASE} after merged pull request #${pr.number}.`);
    console.log(`  ${commit.slice(0, 7)} ${subject}`);
    console.log(`  Full commit: ${commit}`);
    console.log('  Your feature branch was left in place; delete it yourself when you no longer need it.');
    return 0;
  } catch (error) {
    if (error instanceof WorkflowError) {
      console.error(`\n✖ ${error.message}`);
      if (error.hint) console.error(`  ${error.hint}`);
    } else {
      console.error('\n✖ Unexpected error:', error);
    }
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
