import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import simpleGit from 'simple-git';

export async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  // 检查目录自身是否是 Git 仓库（避免被父级仓库误判）
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return false;
  }
  try {
    const status = await simpleGit(repoPath).status();
    return status.files.length > 0;
  } catch {
    return false;
  }
}

export function countUnpushedCommits(repoPath: string, branch: string): number {
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return 0;
  }
  try {
    return parseInt(execSync(`git rev-list --count origin/${branch}..${branch}`, { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10) || 0;
  } catch {
    return 0;
  }
}

export function countRemoteNewCommits(repoPath: string, branch: string): number {
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return 0;
  }
  try {
    return parseInt(execSync(`git rev-list --count ${branch}..origin/${branch}`, { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10) || 0;
  } catch {
    return 0;
  }
}
