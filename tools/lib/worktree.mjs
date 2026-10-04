// A task that works on its own git branch in its own folder (a "worktree"), so what Claude does never collides with the folder you are
// using. The office creates it when the task is sent, shows the result as a summary (files, +/−, commits) and lets you merge it into the
// folder's current branch, open a PR, or throw it away. Every git call is `execFile` with an argument list: no shell, no spliced text.
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const worktreesDir = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-worktrees');
const MAX_DIFF = 60_000;

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }).trim();
const gitTry = (cwd, args) => { try { return git(cwd, args); } catch { return null; } };
const run = (cmd, args, cwd) => new Promise((resolve, reject) => {
  execFile(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000 }, (err, stdout, stderr) => (err ? reject(new Error(String(stderr || err.message).trim().split('\n').pop())) : resolve(String(stdout).trim())));
});
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

/** The top folder of the repo `cwd` is in, or null when it isn't a git repo. */
export const repoRoot = (cwd) => gitTry(cwd, ['rev-parse', '--show-toplevel']);

/** Is this folder one of the office's own worktrees (so it should not show up as a project)? */
export const isOfficeWorktree = (cwd) => typeof cwd === 'string' && (cwd === worktreesDir() || cwd.startsWith(`${worktreesDir()}${path.sep}`));

/** Makes branch `asa/<id>-<slug>` from the repo's current HEAD in its own folder. Throws when the folder isn't a repo or git refuses. */
export function create({ cwd, id, title }) {
  const repo = repoRoot(cwd);
  if (!repo) throw new Error('git');
  const base = git(repo, ['rev-parse', 'HEAD']);
  const baseBranch = gitTry(repo, ['symbolic-ref', '--short', 'HEAD']) ?? null;
  const branch = `asa/${id}${slug(title) ? `-${slug(title)}` : ''}`;
  fs.mkdirSync(worktreesDir(), { recursive: true });
  const dir = path.join(worktreesDir(), `${path.basename(repo)}-${id}`);
  git(repo, ['worktree', 'add', '-b', branch, dir, base]);
  return { repo, dir, branch, base, baseBranch, state: 'open' };
}

const exists = (wt) => { try { return fs.statSync(wt.dir).isDirectory(); } catch { return false; } };

/** What changed against where the branch started: files with +/−, commits, untracked files. */
export function summary(wt) {
  if (!exists(wt)) return { files: [], insertions: 0, deletions: 0, commits: 0, gone: true };
  gitTry(wt.dir, ['add', '-N', '.']); // new files show up in the numbers too (index only, nothing is committed)
  const files = [];
  let insertions = 0;
  let deletions = 0;
  for (const line of (gitTry(wt.dir, ['diff', '--numstat', wt.base]) ?? '').split('\n').filter(Boolean)) {
    const [a, d, ...p] = line.split('\t');
    const add = a === '-' ? 0 : Number(a);
    const del = d === '-' ? 0 : Number(d);
    insertions += add;
    deletions += del;
    files.push({ path: p.join('\t'), add, del });
  }
  const commits = Number(gitTry(wt.dir, ['rev-list', '--count', `${wt.base}..HEAD`]) ?? 0);
  return { files: files.slice(0, 200), insertions, deletions, commits, gone: false };
}

/** The full diff against the start (cut at ~60 KB). */
export function diff(wt) {
  if (!exists(wt)) return '';
  gitTry(wt.dir, ['add', '-N', '.']);
  const out = gitTry(wt.dir, ['diff', wt.base]) ?? '';
  return out.length > MAX_DIFF ? `${out.slice(0, MAX_DIFF)}\n… (dipotong)` : out;
}

/** Commits whatever is still loose in the worktree (so nothing is lost when it is merged, pushed or cleaned up). Returns whether it committed. */
export function commitIfDirty(wt, message) {
  if (!exists(wt) || !gitTry(wt.dir, ['status', '--porcelain'])) return false;
  git(wt.dir, ['add', '-A']);
  git(wt.dir, ['-c', 'user.name=Asa Office', '-c', 'user.email=asaoffice@localhost', 'commit', '-q', '-m', `${String(message || 'Asa Office').slice(0, 120)}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`]);
  return true;
}

/** Takes the worktree away. The branch is deleted too when it has nothing on it (or `dropBranch`), otherwise kept so no commit is lost. */
export function remove(wt, { dropBranch = false } = {}) {
  if (exists(wt)) gitTry(wt.repo, ['worktree', 'remove', '--force', wt.dir]);
  gitTry(wt.repo, ['worktree', 'prune']);
  const ahead = Number(gitTry(wt.repo, ['rev-list', '--count', `${wt.base}..${wt.branch}`]) ?? 0);
  if (dropBranch || ahead === 0) gitTry(wt.repo, ['branch', '-D', wt.branch]);
}

/** Merges the branch into the folder's current branch. On a conflict (or a dirty folder git won't merge into) nothing is changed and it throws. */
export function merge(wt, message) {
  if (!exists(wt)) throw new Error('gone');
  commitIfDirty(wt, message);
  if (!gitTry(wt.repo, ['symbolic-ref', '--short', 'HEAD'])) throw new Error('detached');
  try {
    git(wt.repo, ['merge', '--no-edit', wt.branch]);
  } catch (err) {
    gitTry(wt.repo, ['merge', '--abort']);
    throw new Error(/conflict/i.test(String(err.stdout ?? err.message)) ? 'conflict' : 'merge');
  }
  const into = gitTry(wt.repo, ['symbolic-ref', '--short', 'HEAD']);
  remove(wt, { dropBranch: true });
  return into;
}

/** Throws everything away (the work is lost). */
export function discard(wt) { remove(wt, { dropBranch: true }); }

/** Pushes the branch and opens a PR against the branch it started from. Returns the PR address. */
export async function openPr(wt, title, body) {
  if (!exists(wt)) throw new Error('gone');
  commitIfDirty(wt, title);
  await run('git', ['push', '-u', 'origin', wt.branch], wt.dir);
  const args = ['pr', 'create', '--head', wt.branch, '--title', String(title || wt.branch).slice(0, 200), '--body', String(body ?? '').slice(0, 4000)];
  if (wt.baseBranch) args.push('--base', wt.baseBranch);
  const out = await run('gh', args, wt.dir);
  return out.split('\n').find((l) => /^https?:\/\//.test(l)) ?? out;
}
