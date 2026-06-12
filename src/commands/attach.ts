import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, updateGitignoreForModule, copyDir } from '../utils/index.js';

function deriveModuleName(dir: string): string {
  return dir.replace(/\/$/, '').split('/').pop() || dir;
}

export async function attachExecute(url: string, dir: string, branch?: string): Promise<void> {
  const root = getGitRoot();

  if (!fs.existsSync(dir)) {
    throw new Error(`目录不存在: ${dir}`);
  }

  // 检查是否已是 Git 仓库（检查目录自身，避免被父级仓库误判）
  if (fs.existsSync(path.join(dir, '.git'))) {
    console.log('⚠️  目录已经是 Git 仓库');
    console.log(`   如果想注册已有仓库，请使用: git mrepo add ${dir}`);
    return;
  }

  console.log('🔗 关联目录到远程仓库...\n');

  // 1. 克隆到临时目录
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-mrepo-attach-'));
  console.log(`克隆远程仓库到临时目录...`);
  try {
    const cloneCmd = branch
      ? `git clone -b "${branch}" "${url}" "${tempDir}"`
      : `git clone "${url}" "${tempDir}"`;
    execSync(cloneCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e: any) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`克隆失败: ${e.stderr?.toString() || e.message}`);
  }

  // 2. 获取实际分支
  let actualBranch: string;
  try {
    actualBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim();
  } catch {
    actualBranch = branch || 'main';
  }

  console.log(`   远程分支: ${actualBranch}`);

  // 3. 复制 .git 目录到目标目录
  console.log(`复制 .git 目录到 ${dir}...`);
  const gitDirSrc = path.join(tempDir, '.git');
  const gitDirDest = path.join(dir, '.git');
  try {
    copyDir(gitDirSrc, gitDirDest);
  } catch (e: any) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`复制 .git 失败: ${e.message}`);
  }

  // 4. 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 5. 检查文件一致性
  console.log('检查文件一致性...');
  let statusOutput: string;
  try {
    statusOutput = execSync('git status --short', { cwd: dir, encoding: 'utf-8' }).trim();
  } catch (e: any) {
    throw new Error(`git status 失败: ${e.stderr?.toString() || e.message}`);
  }

  if (statusOutput === '') {
    console.log('✅ 文件完全一致');
  } else {
    console.log('⚠️  有文件差异:');
    console.log(statusOutput);
  }

  // 6. 注册到配置
  const moduleName = deriveModuleName(dir);
  console.log('\n注册到配置文件...');

  const configPath = path.join(root, '.gitmrepo');
  const cm = new ConfigManager();
  const config = fs.existsSync(configPath) ? ConfigManager.load(configPath) : (() => {
    console.log('⚠️  配置文件不存在，将创建新配置');
    return ConfigManager.create();
  })();

  const module: Module = { name: moduleName, path: dir, remote: url, branch: actualBranch };
  cm.addModule(config, module);
  cm.save(configPath, config);
  console.log('✅ 已注册到 .gitmrepo');

  // 7. 更新 .gitignore
  updateGitignoreForModule(root, dir);
  console.log(`✅ 已更新 .gitignore（忽略 ${dir}/.git/）`);

  // 8. 输出结果
  console.log('\n✅ 关联完成');
  console.log(`   目录: ${dir}`);
  console.log(`   远程: ${url}`);
  console.log(`   分支: ${actualBranch}`);
  console.log(`   状态: ${statusOutput === '' ? '文件完全一致' : '有文件差异'}`);

  if (statusOutput !== '') {
    console.log('\n💡 提示：请检查差异，确认后可以提交');
  }
}