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
 * 克隆到临时目录,复制 .git 到目标目录，检查文件一致性
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

/**
 * 获取改动文件列表和统计信息（区分暂存区和未暂存）
 */
export async function getDetailedChanges(repoPath: string): Promise<{
  // 未跟踪文件
  added: string[];
  // 未暂存的修改
  modified: string[];
  // 未暂存的删除
  deleted: string[];
  // 重命名
  renamed: { from: string; to: string }[];
  // 已暂存的新增
  stagedAdded: string[];
  // 已暂存的修改
  stagedModified: string[];
  // 已暂存的删除
  stagedDeleted: string[];
  // 统计信息
  stats: { insertions: number; deletions: number };
}> {
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      stagedAdded: [],
      stagedModified: [],
      stagedDeleted: [],
      stats: { insertions: 0, deletions: 0 }
    };
  }

  try {
    const git = simpleGit(repoPath);
    const status = await git.status();
    const diffSummary = await git.diffSummary();

    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const renamed: { from: string; to: string }[] = [];
    const stagedAdded: string[] = [];
    const stagedModified: string[] = [];
    const stagedDeleted: string[] = [];

    // 分类文件（基于 index 和 working_dir 状态）
    for (const file of status.files) {
      const indexStatus = file.index;
      const workDirStatus = file.working_dir;

      // 未跟踪文件（工作区有，但未纳入版本控制）
      if (indexStatus === '?' && workDirStatus === '?') {
        added.push(file.path);
      }
      // 已暂存的新增
      else if (indexStatus === 'A') {
        stagedAdded.push(file.path);
      }
      // 已暂存的修改
      else if (indexStatus === 'M') {
        stagedModified.push(file.path);
        // 如果工作区也有修改（即暂存后又修改）
        if (workDirStatus === 'M') {
          modified.push(file.path);
        }
      }
      // 已暂存的删除
      else if (indexStatus === 'D') {
        stagedDeleted.push(file.path);
      }
      // 未暂存的修改（工作区修改，但未暂存）
      else if (workDirStatus === 'M' && indexStatus !== 'M') {
        modified.push(file.path);
      }
      // 未暂存的删除（工作区删除，但未暂存）
      else if (workDirStatus === 'D' && indexStatus !== 'D') {
        deleted.push(file.path);
      }
      // 重命名
      else if (indexStatus === 'R' || workDirStatus === 'R') {
        // simple-git 的 renamed 文件信息在 status.renamed 数组中
        const renamedFile = status.renamed.find(r => r.from === file.path || r.to === file.path);
        if (renamedFile) {
          renamed.push({ from: renamedFile.from, to: renamedFile.to });
        } else {
          renamed.push({ from: file.path, to: file.path });
        }
      }
    }

    return {
      added,
      modified,
      deleted,
      renamed,
      stagedAdded,
      stagedModified,
      stagedDeleted,
      stats: {
        insertions: diffSummary.insertions || 0,
        deletions: diffSummary.deletions || 0,
      },
    };
  } catch {
    return {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      stagedAdded: [],
      stagedModified: [],
      stagedDeleted: [],
      stats: { insertions: 0, deletions: 0 }
    };
  }
}

/**
 * 获取未推送提交的详细信息
 */
export async function getUnpushedCommitDetails(
  repoPath: string,
  branch: string,
  limit: number = 5
): Promise<Array<{ hash: string; message: string; author: string; date: string; relativeDate: string }>> {
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return [];
  }

  try {
    // 使用 execSync 确保准确性，避免 simple-git 的范围问题
    const output = execSync(
      `git log origin/${branch}..${branch} --pretty=format:"%H|%s|%an|%ad" --date=iso --max-count=${limit}`,
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    if (!output.trim()) {
      return [];
    }

    const lines = output.trim().split('\n');
    return lines.map((line) => {
      const [hash, message, author, date] = line.split('|');
      return {
        hash: hash.substring(0, 7),
        message,
        author,
        date,
        relativeDate: getRelativeDate(date),
      };
    });
  } catch {
    return [];
  }
}

/**
 * 计算相对时间
 */
function getRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  } catch {
    return dateStr;
  }
}
