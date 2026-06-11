import * as path from 'node:path';
import * as fs from 'node:fs';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot } from '../utils/index.js';

/**
 * 执行 config 命令 - 查看模块仓库配置信息
 */
export async function configExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置（config 命令需要配置文件已存在）
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }
  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  console.log('⚙️  模块仓库配置信息...\n');

  // 打印全局配置
  if (config.settings) {
    console.log('全局配置:');
    if (config.settings.default_branch) {
      console.log(`  默认分支: ${config.settings.default_branch}`);
    }
    if (config.settings.show_all_modules_in_status !== undefined) {
      console.log(`  status 显示所有模块: ${config.settings.show_all_modules_in_status}`);
    }
    if (config.settings.auto_ignore_git !== undefined) {
      console.log(`  自动忽略 .git 目录: ${config.settings.auto_ignore_git}`);
    }
  } else {
    console.log('全局配置:');
    console.log('  （无全局配置）');
  }

  console.log('');

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

  console.log('模块配置:');

  for (const module of modules) {
    console.log(`\n[${module.name}] ${module.path}:`);
    console.log(`  远程 URL: ${module.remote}`);
    console.log(`  分支: ${module.branch}`);
    if (module.auto_sync !== undefined) {
      console.log(`  自动同步: ${module.auto_sync}`);
    }

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);
    if (!fs.existsSync(modulePath)) {
      console.log('  ⚠️  目录不存在');
    }
  }

  console.log('\n✅ 配置信息查看完成');
  console.log('💡 提示:');
  console.log('   要修改配置，请手动编辑 .gitmrepo 文件');
  console.log('   或使用 sync2 命令从子仓库同步配置');
}
