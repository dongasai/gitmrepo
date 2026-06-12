import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
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

/**
 * 递归复制目录
 */
export function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 将已有目录关联到远程仓库（attach 逻辑）
 * 克隆到临时目录，复制 .git 到目标目录，检查文件一致性
 */
export function attachDirToRemote(modulePath: string, remote: string, branch: string): string | null {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-mrepo-attach-'));
  try {
    execSync(`git clone -b "${branch}" "${remote}" "${tempDir}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 获取实际分支
    let actualBranch = branch;
    try {
      actualBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim();
    } catch { /* 使用传入的 branch */ }

    // 复制 .git 目录到目标目录
    const gitDirSrc = path.join(tempDir, '.git');
    const gitDirDest = path.join(modulePath, '.git');
    copyDir(gitDirSrc, gitDirDest);

    return actualBranch;
  } catch (e: any) {
    throw new Error(`关联失败: ${e.stderr?.toString() || e.message}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
