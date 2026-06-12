import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot, hasUncommittedChanges } from '../utils/index.js';

/**
 * 执行 diff 命令 - 查看模块仓库改动
 */
export async function diffExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 未指定模块：显示提示和概览
  if (!moduleArg) {
    if (Object.keys(config.modules).length === 0) {
      console.log('⚠️  未注册任何模块仓库');
      console.log('   请先执行: git mrepo clone 或 git mrepo add');
      return;
    }

    console.log('⚠️  请指定模块名称查看详细 diff');
    console.log('💡 使用方法: git mrepo diff <module-name>\n');

    // 显示有改动的模块概览
    console.log('📊 有改动的模块:');
    let hasChanges = false;

    for (const module of Object.values(config.modules)) {
      const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

      if (!fs.existsSync(modulePath) || !fs.existsSync(path.join(modulePath, '.git'))) {
        continue;
      }

      try {
        const statusOutput = execSync('git status --short', {
          cwd: modulePath,
          encoding: 'utf-8',
        });

        const changedFiles = statusOutput.trim().split('\n').filter(line => line.trim());

        if (changedFiles.length > 0) {
          console.log(`[${module.name}] ${module.path} - 有 ${changedFiles.length} 个文件改动`);
          hasChanges = true;
        }
      } catch {
        // 忽略错误
      }
    }

    if (!hasChanges) {
      console.log('✅ 没有模块有改动');
    }

    return;
  }

  // 指定了模块：显示完整 diff
  const module = cm.findModule(config, moduleArg);
  if (!module) {
    throw new Error(`模块不存在: ${moduleArg}`);
  }

  const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

  if (!fs.existsSync(modulePath)) {
    console.log('⚠️  目录不存在，需要克隆');
    return;
  }

  if (!fs.existsSync(path.join(modulePath, '.git'))) {
    console.log('⚠️  不是 Git 仓库（缺少 .git）');
    return;
  }

  console.log(`📝 模块 [${module.name}] 的改动:\n`);

  try {
    const output = execSync('git diff', {
      cwd: modulePath,
      encoding: 'utf-8',
    });

    if (output.trim()) {
      console.log(output);
    } else {
      console.log('✅ 没有未暂存的改动');
      console.log('💡 提示: 使用 git diff --cached 查看已暂存的改动');
    }
  } catch (error: any) {
    console.log(`❌ ${error.stderr?.toString() || error.message}`);
  }
}