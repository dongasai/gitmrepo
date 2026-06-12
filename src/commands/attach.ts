import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, updateGitignoreForModule } from '../utils/index.js';
import simpleGit from 'simple-git';

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

  // git init
  console.log('初始化 Git 仓库...');
  try {
    execSync('git init', { cwd: dir, encoding: 'utf-8' });
  } catch (e: any) {
    throw new Error(`git init 失败: ${e.stderr?.toString() || e.message}`);
  }

  // git remote add
  console.log(`添加远程仓库: ${url}`);
  try {
    execSync(`git remote add origin "${url}"`, { cwd: dir, encoding: 'utf-8' });
  } catch (e: any) {
    throw new Error(`git remote add 失败: ${e.stderr?.toString() || e.message}`);
  }

  // 设置分支
  let actualBranch: string;
  if (branch) {
    console.log(`设置分支: ${branch}`);
    try {
      execSync(`git checkout -b "${branch}"`, { cwd: dir, encoding: 'utf-8' });
    } catch (e: any) {
      throw new Error(`创建分支失败: ${e.stderr?.toString() || e.message}`);
    }
    actualBranch = branch;
  } else {
    actualBranch = 'main';
    console.log(`使用默认分支: ${actualBranch}`);
    try {
      execSync('git branch -M main', { cwd: dir, encoding: 'utf-8' });
    } catch {
      const headBranch = await simpleGit(dir).revparse(['--abbrev-ref', 'HEAD']);
      actualBranch = headBranch.trim() || 'main';
    }
  }

  console.log(`当前分支: ${actualBranch}`);

  // 注册到配置
  const moduleName = deriveModuleName(dir);
  console.log('\n注册到配置文件...');

  const configPath = path.join(root, '.gitmrepo');
  const cm = new ConfigManager();
  const config = fs.existsSync(configPath) ? ConfigManager.load(configPath) : (() => {
    console.log('⚠️  配置文件不存在，将创建新配置');
    return ConfigManager.create();
  })();

  const module: Module = { name: moduleName, path: dir, remote: url, branch: actualBranch, auto_sync: true };
  cm.addModule(config, module);
  cm.save(configPath, config);
  console.log('✅ 已注册到 .gitmrepo');

  console.log('更新 .gitignore...');
  updateGitignoreForModule(root, dir);
  console.log(`✅ 已更新 .gitignore（忽略 ${dir}.git/）`);

  console.log('\n✅ 关联完成');
  console.log(`   目录: ${dir}`);
  console.log(`   远程: ${url}`);
  console.log(`   分支: ${actualBranch}`);

  console.log('\n💡 下一步:');
  console.log(`   1. 添加文件并提交:`);
  console.log(`      cd ${dir} && git add . && git commit -m "初始化"`);
  console.log(`   2. 推送到远程:`);
  console.log(`      git push -u origin ${actualBranch}`);
}
