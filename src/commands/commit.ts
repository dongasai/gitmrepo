import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';

/**
 * 执行 commit 命令 - 创建模块仓库提交
 */
export async function commitExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置（commit 命令需要配置文件已存在）
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

  console.log('📝 创建模块仓库提交...\n');

  let successCount = 0;
  let skipCount = 0;

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    // 目录不存在，跳过
    if (!fs.existsSync(modulePath)) {
      console.log('  ⚠️  目录不存在，跳过');
      skipCount++;
      continue;
    }

    // 检查目录自身是否是 Git 仓库（避免被父级仓库误判）
    if (!fs.existsSync(path.join(modulePath, '.git'))) {
      console.log('  ⚠️  不是 Git 仓库（缺少 .git），跳过');
      skipCount++;
      continue;
    }

    try {
      // 检查暂存的改动
      const statusText = execSync('git status --short', {
        cwd: modulePath,
        encoding: 'utf-8',
      });

      // 检查是否有暂存改动（行首为 A/M/D/R）
      const hasStaged = statusText.split('\n').some(line =>
        /^[AMDR]/.test(line.trim())
      );

      if (!hasStaged) {
        console.log('  ⚠️  没有暂存的改动');
        console.log('  请先执行: cd path && git add <files>');
        skipCount++;
      } else {
        console.log('  ⚠️  需要手动输入提交消息');
        console.log('  请执行: cd path && git commit');
        console.log('  或者使用: git commit -m "<message>"');
        successCount++;
      }
    } catch (error) {
      console.log(`  ⚠️  检查状态失败: ${(error as Error).message}`);
      skipCount++;
    }
  }

  console.log(`\n✅ 提交检查完成`);
  console.log(`   成功: ${successCount}`);
  console.log(`   跳过: ${skipCount}`);

  console.log('\n💡 提示:');
  console.log('   git-mrepo 不自动创建提交，需要手动执行 git commit');
  console.log('   这样可以更好地控制提交消息和内容');
}
