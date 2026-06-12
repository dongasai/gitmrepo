import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';

/**
 * 执行 pull 命令 - 拉取模块仓库更新
 */
export async function pullExecute(moduleArg?: string): Promise<void> {
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
    console.log('⚠️  没有模块需要拉取');
    return;
  }

  console.log('🔄 拉取模块仓库更新...');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const fullPath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠️  目录不存在，需要克隆`);
      console.log(`     请执行: git mrepo clone ${module.remote} -b ${module.branch}`);
      continue;
    }

    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      console.log(`  ⚠️  不是 Git 仓库（缺少 .git），跳过`);
      continue;
    }

    try {
      // 记录 pull 前的 HEAD
      const headBefore = execSync('git rev-parse HEAD', {
        cwd: fullPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const output = execSync(`git pull origin "${module.branch}"`, {
        cwd: fullPath,
        encoding: 'utf-8',
      });

      if (output.includes('Already up to date') || output.includes('Already up-to-date')) {
        console.log(`  分支: ${module.branch}`);
        console.log('  ✅ 已经是最新的');
      } else {
        // 统计拉取的提交数量
        const headAfter = execSync('git rev-parse HEAD', {
          cwd: fullPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        let pulledCommits = 0;
        if (headBefore !== headAfter) {
          try {
            pulledCommits = parseInt(
              execSync(`git rev-list --count ${headBefore}..HEAD`, {
                cwd: fullPath,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
              }).trim(),
              10
            ) || 0;
          } catch {
            pulledCommits = 1;
          }
        }

        console.log(`  分支: ${module.branch}`);
        console.log(`  ✅ 已更新 (${pulledCommits} commits pulled)`);
      }
    } catch (error) {
      console.log(`  分支: ${module.branch}`);
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}
