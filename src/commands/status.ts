import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, Module } from '../config.js';
import { getGitRoot, hasUncommittedChanges, countUnpushedCommits } from '../utils/index.js';

/**
 * 执行 status 命令 - 查看模块仓库状态
 */
export async function statusExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置（status 命令需要配置文件已存在）
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

  // 新增：如果指定了单个模块，显示完整状态
  if (moduleArg && modules.length === 1) {
    const module = modules[0];
    console.log(`📊 模块仓库状态 [${module.name}]:\n`);

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    if (!fs.existsSync(modulePath)) {
      console.log('⚠️  目录不存在，需要克隆');
      return;
    }

    if (!fs.existsSync(path.join(modulePath, '.git'))) {
      console.log('⚠️  不是 Git 仓库（缺少 .git）');
      return;
    }

    try {
      const output = execSync('git status', {
        cwd: modulePath,
        encoding: 'utf-8',
      });
      console.log(output);
    } catch (error: any) {
      console.log(`❌ ${error.stderr?.toString() || error.message}`);
    }
    return;
  }

  // 原有的简要概览逻辑
  console.log('📊 模块仓库状态:');

  for (const module of modules) {
    console.log(`\n[${module.name}] ${module.path}:`);
    console.log(`  分支: ${module.branch}`);
    console.log(`  远程: ${module.remote}`);

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    // 检查目录是否存在
    if (!fs.existsSync(modulePath)) {
      console.log('  ⚠️  目录不存在，需要克隆');
      continue;
    }

    // 检查未提交改动
    const hasChanges = await hasUncommittedChanges(modulePath);
    if (hasChanges) {
      console.log('  ⚠️  有未提交改动');
    } else {
      console.log('  ✅ 工作目录干净');
    }

    // 检查未推送提交
    const unpushedCount = countUnpushedCommits(modulePath, module.branch);
    if (unpushedCount > 0) {
      console.log(`  ⚠️  未推送提交: ${unpushedCount}`);
    } else {
      console.log('  ✅ 已推送所有提交');
    }
  }
}
