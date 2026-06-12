import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';

/**
 * 执行 clean 命令 - 清理模块仓库未跟踪文件
 */
export async function cleanExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置（clean 命令需要配置文件已存在）
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

  console.log('🧹 清理模块仓库未跟踪文件...\n');

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
      // 获取未跟踪文件
      const statusText = execSync('git status --short', {
        cwd: modulePath,
        encoding: 'utf-8',
      });

      const untrackedFiles = statusText.split('\n').filter(line => line.startsWith('??'));

      if (untrackedFiles.length === 0) {
        console.log('  ✅ 没有未跟踪文件');
      } else {
        console.log(`  ⚠️  发现 ${untrackedFiles.length} 个未跟踪文件:`);
        for (const file of untrackedFiles) {
          const filePath = file.substring(2).trim();
          console.log(`    ${filePath}`);
        }

        console.log('  💡 清理命令:');
        console.log(`    cd ${modulePath} && git clean -n    # 预览要删除的文件`);
        console.log(`    cd ${modulePath} && git clean -f    # 删除未跟踪文件`);
        console.log(`    cd ${modulePath} && git clean -fd   # 删除未跟踪文件和目录`);
        console.log(`    cd ${modulePath} && git clean -fdx  # 删除所有未跟踪内容（包括忽略文件）`);
      }
    } catch (error) {
      console.log(`  ⚠️  检查状态失败: ${(error as Error).message}`);
    }
  }

  console.log('\n✅ 清理检查完成');
  console.log('⚠️  警告:');
  console.log('   git clean 命令会永久删除文件，请谨慎使用');
  console.log('   建议先使用 -n 参数预览，确认后再执行删除');
}
