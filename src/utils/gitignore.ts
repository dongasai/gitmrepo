import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

export function updateGitignoreForModule(root: string, modulePath: string): void {
  const gitignorePath = `${root}/.gitignore`;
  const entry = `${modulePath}.git/`;
  const entryNoSlash = `${modulePath}.git`;

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n${entry}\n`);
    return;
  }

  let content = fs.readFileSync(gitignorePath, 'utf-8');
  if (content.includes(entry) || content.includes(entryNoSlash)) return;

  if (content.includes('# git-mrepo 子模块 .git 目录')) {
    content = content.endsWith('\n') ? `${content}${entry}` : `${content}\n${entry}`;
  } else {
    content = content.endsWith('\n')
      ? `${content}\n# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n${entry}\n`
      : `${content}\n\n# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n${entry}\n`;
  }
  fs.writeFileSync(gitignorePath, content);
}

export function updateGitignoreForModules(root: string, modulePaths: string[]): void {
  for (const p of modulePaths) updateGitignoreForModule(root, p);
}

export function getGitRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('当前目录不是 Git 仓库');
  }
}
