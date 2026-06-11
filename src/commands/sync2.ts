import * as path from 'node:path';
import * as fs from 'node:fs';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';
import simpleGit from 'simple-git';

/**
 * 执行 sync2 命令 - 从子仓库同步配置信息到 .gitmrepo
 */
export async function sync2Execute(moduleArg?: string): Promise<void> {
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
    console.log('⚠️  没有模块需要同步');
    return;
  }

  console.log('🔄 从子仓库同步配置信息...');

  let updateCount = 0;
  let consistentCount = 0;
  let hasChanges = false;

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const fullPath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    if (!fs.existsSync(fullPath)) {
      console.log('  ⚠️  目录不存在，跳过');
      continue;
    }

    try {
      const git = simpleGit(fullPath);
      const status = await git.status();
      const actualBranch = status.current;
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r: any) => r.name === 'origin');
      const actualUrl = origin?.refs?.fetch || 'unknown';

      // 对比分支
      if (actualBranch && actualBranch !== module.branch) {
        console.log(`  当前分支: ${actualBranch} (配置: ${module.branch}) → 已更新`);
        module.branch = actualBranch;
        hasChanges = true;
        updateCount++;
      } else if (actualBranch) {
        console.log(`  当前分支: ${actualBranch} (一致)`);
        consistentCount++;
      }

      // 对比 URL
      if (actualUrl !== 'unknown' && actualUrl !== module.remote) {
        console.log(`  远程 URL: ${actualUrl} (配置: ${module.remote}) → 已更新`);
        module.remote = actualUrl;
        hasChanges = true;
        updateCount++;
      } else if (actualUrl !== 'unknown') {
        console.log(`  远程 URL: ${actualUrl} (一致)`);
        consistentCount++;
      }
    } catch (error) {
      console.log(`  ❌ 获取信息失败: ${(error as Error).message}`);
    }
  }

  // 如果有更新，保存配置
  if (hasChanges) {
    cm.save(configPath, config);
  }

  console.log('\n✅ 同步完成');
  console.log(`   更新: ${updateCount}`);
  console.log(`   一致: ${consistentCount}`);
}
