import * as path from 'node:path';
import * as fs from 'node:fs';
import simpleGit from 'simple-git';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';

/**
 * 执行 branch 命令 - 查看模块仓库分支信息
 */
export async function branchExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置（branch 命令需要配置文件已存在）
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }
  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 确定模块列表
  let modules: Module[];
  if (moduleArg) {
    const m = cm.findModule(config, moduleArg);
    if (!m) throw new Error(`模块不存在: ${moduleArg}`);
    modules = [m];
  } else {
    if (Object.keys(config.modules).length === 0) {
      console.log('⚠️  未注册任何模块仓库');
      console.log('   请先执行: git mrepo clone 或 git mrepo add');
      return;
    }
    modules = Object.values(config.modules);
  }

  console.log('📊 模块仓库分支信息...\n');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    // 目录不存在，跳过
    if (!fs.existsSync(modulePath)) {
      console.log('  ⚠️  目录不存在，跳过');
      continue;
    }

    // 检查目录自身是否是 Git 仓库（避免被父级仓库误判）
    if (!fs.existsSync(path.join(modulePath, '.git'))) {
      console.log('  ⚠️  不是 Git 仓库（缺少 .git），跳过');
      continue;
    }

    try {
      const git = simpleGit(modulePath);

      // 获取当前分支
      const status = await git.status();
      const currentBranch = status.current;

      console.log(`  当前分支: ${currentBranch || '未知'}`);
      console.log(`  配置分支: ${module.branch}`);

      // 获取本地分支列表
      const branchSummary = await git.branchLocal();
      console.log('  本地分支:');
      for (const branchName of branchSummary.all) {
        if (branchName === currentBranch) {
          console.log(`    • ${branchName} (当前)`);
        } else {
          console.log(`    • ${branchName}`);
        }
      }

      // 获取远程分支
      const remoteBranchList = await git.branch(['-r']);
      const remoteBranches = remoteBranchList.all.filter(b => b.trim() && !b.includes('HEAD'));

      if (remoteBranches.length > 0) {
        console.log('  远程分支:');
        for (const branchName of remoteBranches) {
          console.log(`    • ${branchName.trim()}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  获取分支信息失败: ${(error as Error).message}`);
    }
  }
}
