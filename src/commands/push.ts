import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, countUnpushedCommits } from '../utils/index.js';

/**
 * 执行 push 命令 - 推送模块仓库变更
 */
export async function pushExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 确定模块列表
  const modules: Module[] = moduleArg
    ? [(() => {
        const m = cm.findModule(config, moduleArg);
        if (!m) throw new Error(`模块不存在: ${moduleArg}`);
        return m;
      })()]
    : Object.values(config.modules);

  if (modules.length === 0) {
    console.log('⚠️  没有模块需要推送');
    return;
  }

  console.log('🔄 推送模块仓库变更...');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const fullPath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    if (!fs.existsSync(fullPath)) {
      console.log('  ⚠️  目录不存在');
      continue;
    }

    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      console.log('  ⚠️  不是 Git 仓库（缺少 .git），跳过');
      continue;
    }

    const unpushedCount = countUnpushedCommits(fullPath, module.branch);

    if (unpushedCount === 0) {
      console.log('  ✅ 没有需要推送的提交');
    } else {
      console.log(`  未推送提交: ${unpushedCount}`);
    }

    try {
      execSync(`git push origin "${module.branch}"`, {
        cwd: fullPath,
        encoding: 'utf-8',
      });
      console.log(`  ✅ 已推送 ${unpushedCount} 个提交`);
    } catch (error) {
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}
