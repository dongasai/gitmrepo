import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, updateGitignoreForModules, hasUncommittedChanges } from '../utils/index.js';

/**
 * 执行 sync 命令 - 同步所有模块仓库
 */
export async function syncExecute(force: boolean): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();
  const modules = Object.values(config.modules);

  if (modules.length === 0) {
    console.log('⚠️  没有模块需要同步');
    return;
  }

  console.log('🔄 同步模块仓库...');

  let successCount = 0;
  let skipCount = 0;
  const clonedPaths: string[] = [];

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const fullPath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);
    const dirExists = fs.existsSync(fullPath);

    if (!dirExists) {
      // 目录不存在，执行 clone
      console.log('  目录不存在，执行 clone...');
      try {
        execSync(`git clone -b "${module.branch}" "${module.remote}" "${fullPath}"`, {
          encoding: 'utf-8',
        });
        console.log(`  ✅ 已克隆到 ${module.path} (${module.branch})`);
        clonedPaths.push(module.path);
        successCount++;
      } catch (error) {
        const stderr = (error as any).stderr?.toString() || '未知错误';
        console.log(`  ❌ 克隆失败: ${stderr}`);
      }
    } else if (force) {
      // 目录存在且强制同步
      console.log('  目录存在，执行 pull...');
      try {
        execSync(`git pull origin "${module.branch}"`, {
          cwd: fullPath,
          encoding: 'utf-8',
        });
        console.log('  ✅ 已更新');
        successCount++;
      } catch (error) {
        const stderr = (error as any).stderr?.toString() || '未知错误';
        console.log(`  ❌ 拉取失败: ${stderr}`);
      }
    } else {
      // 目录存在，检查是否有未提交改动
      try {
        const hasChanges = await hasUncommittedChanges(fullPath);
        if (hasChanges) {
          console.log('  ⚠️  有未提交改动，跳过更新');
          console.log('     请先提交或使用 --force 强制同步');
          skipCount++;
          continue;
        }
      } catch {
        // 忽略错误
      }

      // 执行 pull
      console.log('  目录存在，执行 pull...');
      try {
        execSync(`git pull origin "${module.branch}"`, {
          cwd: fullPath,
          encoding: 'utf-8',
        });
        console.log('  ✅ 已更新');
        successCount++;
      } catch (error) {
        const stderr = (error as any).stderr?.toString() || '未知错误';
        console.log(`  ❌ 拉取失败: ${stderr}`);
      }
    }
  }

  // 批量更新 .gitignore（新克隆的模块）
  if (clonedPaths.length > 0) {
    updateGitignoreForModules(root, clonedPaths);
  }

  console.log('\n✅ 同步完成');
  console.log(`   成功: ${successCount}`);
  console.log(`   跳过: ${skipCount}`);
}
