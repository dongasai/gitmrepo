import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, countRemoteNewCommits } from '../utils/index.js';

/**
 * 执行 fetch 命令 - 获取模块仓库远程信息
 */
export async function fetchExecute(moduleArg?: string): Promise<void> {
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
    console.log('⚠️  没有模块需要获取');
    return;
  }

  console.log('🔄 获取模块仓库远程信息...');

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

    try {
      execSync('git fetch origin', {
        cwd: fullPath,
        encoding: 'utf-8',
      });
      console.log(`  分支: ${module.branch}`);
      console.log('  ✅ 已获取远程信息');

      const remoteNewCommits = countRemoteNewCommits(fullPath, module.branch);
      if (remoteNewCommits > 0) {
        console.log(`  远程新提交: ${remoteNewCommits}`);
      } else {
        console.log('  远程新提交: 0 (已经是最新)');
      }
    } catch (error) {
      console.log(`  分支: ${module.branch}`);
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}
