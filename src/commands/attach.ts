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

  // fetch 远程
  console.log('获取远程信息...');
  try {
    execSync('git fetch origin', { cwd: dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e: any) {
    // fetch 失败可能是远程不存在或网络问题，继续尝试本地分支
    console.log(`   ⚠️  fetch 失败: ${e.stderr?.toString() || e.message}`);
  }

  // 设置分支（尝试追踪远程分支）
  let actualBranch: string;
  const targetBranch = branch || 'main';

  // 检查远程是否有该分支
  try {
    const remoteBranches = execSync('git branch -r', { cwd: dir, encoding: 'utf-8' }).trim();
    const hasRemoteBranch = remoteBranches.includes(`origin/${targetBranch}`);

    if (hasRemoteBranch) {
      console.log(`检出远程分支: ${targetBranch}`);
      execSync(`git checkout -b "${targetBranch}" --track "origin/${targetBranch}"`, { cwd: dir, encoding: 'utf-8' });
      actualBranch = targetBranch;
    } else {
      // 远程没有该分支，创建本地分支
      console.log(`创建本地分支: ${targetBranch}`);
      execSync(`git checkout -b "${targetBranch}"`, { cwd: dir, encoding: 'utf-8' });
      actualBranch = targetBranch;
    }
  } catch (e: any) {
    // fallback: 直接创建本地分支
    console.log(`   ⚠️  分支操作失败，创建默认分支: ${targetBranch}`);
    try {
      execSync(`git branch -M "${targetBranch}"`, { cwd: dir, encoding: 'utf-8' });
      actualBranch = targetBranch;
    } catch {
      const headBranch = await simpleGit(dir).revparse(['--abbrev-ref', 'HEAD']);
      actualBranch = headBranch.trim() || targetBranch;
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
  console.log(`✅ 已更新 .gitignore（忽略 ${dir}/.git/）`);

  console.log('\n✅ 关联完成');
  console.log(`   目录: ${dir}`);
  console.log(`   远程: ${url}`);
  console.log(`   分支: ${actualBranch}`);

  // 检查是否有追踪
  try {
    const tracking = execSync('git rev-parse --abbrev-ref @{upstream}', { cwd: dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (tracking && tracking.startsWith('origin/')) {
      console.log(`   追踪: ${tracking}`);
      console.log('\n💡 后续操作:');
      console.log(`   git mrepo pull ${moduleName}           拉取远程更新`);
      console.log(`   git mrepo push ${moduleName}           推送本地变更`);
    } else {
      console.log('\n💡 后续操作:');
      console.log(`   1. 添加文件并提交:`);
      console.log(`      cd ${dir} && git add . && git commit -m "初始化"`);
      console.log(`   2. 推送到远程:`);
      console.log(`      git push -u origin ${actualBranch}`);
    }
  } catch {
    // 没有追踪关系
    console.log('\n💡 后续操作:');
    console.log(`   1. 添加文件并提交:`);
    console.log(`      cd ${dir} && git add . && git commit -m "初始化"`);
    console.log(`   2. 推送到远程:`);
    console.log(`      git push -u origin ${actualBranch}`);
  }
}
