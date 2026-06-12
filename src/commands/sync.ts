import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager } from '../config.js';
import { getGitRoot, updateGitignoreForModules, hasUncommittedChanges, attachDirToRemote } from '../utils/index.js';

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
    const gitExists = dirExists && fs.existsSync(path.join(fullPath, '.git'));

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
    } else if (!gitExists) {
      // 目录存在但无 .git，执行 attach（克隆到临时目录，复制 .git 进来）
      console.log('  目录存在但无 .git，执行关联...');
      try {
        const actualBranch = attachDirToRemote(fullPath, module.remote, module.branch);
        console.log(`  ✅ 已关联到 ${module.remote} (${actualBranch})`);

        // 检查文件一致性
        try {
          const statusOutput = execSync('git status --short', { cwd: fullPath, encoding: 'utf-8' }).trim();
          if (statusOutput === '') {
            console.log('  📁 文件完全一致');
          } else {
            console.log('  ⚠️  有文件差异:');
            console.log('  ' + statusOutput.split('\n').join('\n  '));
          }
        } catch { /* 忽略一致性检查错误 */ }

        clonedPaths.push(module.path);
        successCount++;
      } catch (error) {
        const msg = (error as any).message || '未知错误';
        console.log(`  ❌ 关联失败: ${msg}`);
      }
    } else if (force) {
      // 目录存在且有 .git，强制同步
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
      // 目录存在且有 .git，检查是否有未提交改动
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

  // 批量更新 .gitignore（新克隆或关联的模块）
  if (clonedPaths.length > 0) {
    updateGitignoreForModules(root, clonedPaths);
  }

  console.log('\n✅ 同步完成');
  console.log(`   成功: ${successCount}`);
  console.log(`   跳过: ${skipCount}`);
}
