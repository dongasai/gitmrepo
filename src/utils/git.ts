import { execSync } from 'node:child_process';
import simpleGit from 'simple-git';

export async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  try {
    const status = await simpleGit(repoPath).status();
    return status.files.length > 0;
  } catch {
    return false;
  }
}

export function countUnpushedCommits(repoPath: string, branch: string): number {
  try {
    return parseInt(execSync(`git rev-list --count origin/${branch}..${branch}`, { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10) || 0;
  } catch {
    return 0;
  }
}

export function countRemoteNewCommits(repoPath: string, branch: string): number {
  try {
    return parseInt(execSync(`git rev-list --count ${branch}..origin/${branch}`, { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10) || 0;
  } catch {
    return 0;
  }
}
