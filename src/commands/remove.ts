import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import prompts from 'prompts';
import { ConfigManager, Module } from '../config.js';
import { removeGitignoreForModule, getGitRoot } from '../utils/gitignore.js';

/**
 * 检查模块 Git 状态（未提交改动和未推送 commit）
 */
function checkModuleGitStatus(modulePath: string): { clean: boolean; message: string } {
  try {
    // 检查未提交改动
    const statusOutput = execSync('git status --short', {
      cwd: modulePath,
      encoding: 'utf-8'
    }).trim();

    if (statusOutput) {
      return {
        clean: false,
        message: `有未提交的改动:\n${statusOutput.split('\n').map(line => '    ' + line).join('\n')}`
      };
    }

    // 检查未推送的 commit
    const logOutput = execSync('git log @{u}..HEAD --oneline', {
      cwd: modulePath,
      encoding: 'utf-8'
    }).trim();

    if (logOutput) {
      const commits = logOutput.split('\n').length;
      return {
        clean: false,
        message: `有 ${commits} 个未推送的 commit:\n${logOutput.split('\n').map(line => '    ' + line).join('\n')}`
      };
    }

    return { clean: true, message: '' };
  } catch (error: any) {
    // Git 命令失败（可能 .git 目录不存在）
    return { clean: true, message: '' };
  }
}

/**
 * 交互式选择模块（多选）
 */
async function promptModuleSelection(modules: Module[]): Promise<Module[]> {
  const choices = modules.map(m => ({
    title: `${m.name.padEnd(20)} ${m.path}`,
    value: m.name,
    selected: false
  }));

  const response = await prompts({
    type: 'multiselect',
    name: 'selected',
    message: '选择要移除的模块',
    choices,
    hint: '- 空格选择  - a 切换全部  - 回车确认'
  });

  // 用户取消（Ctrl+C）
  if (!response.selected) {
    console.log('❌ 已取消操作');
    process.exit(0);
  }

  return modules.filter(m => response.selected.includes(m.name));
}

/**
 * 询问是否删除物理目录
 */
async function promptDeleteDirectory(): Promise<boolean> {
  const response = await prompts({
    type: 'select',
    name: 'delete',
    message: '是否同时删除物理目录（包括 .git）？',
    choices: [
      { title: '仅移除配置，保留目录（推荐）', value: false },
      { title: '移除配置并删除目录', value: true }
    ],
    initial: 0
  });

  // 用户取消
  if (response.delete === undefined) {
    console.log('❌ 已取消操作');
    process.exit(0);
  }

  return response.delete;
}

/**
 * 询问确认删除多个模块目录
 */
async function promptConfirmDelete(modules: Module[]): Promise<boolean> {
  console.log('\n⚠️  即将删除以下模块的目录（包括 .git）：');
  for (const m of modules) {
    console.log(`   - ${m.name} (${m.path})`);
  }

  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: '确认继续？',
    initial: false
  });

  if (!response.confirm) {
    console.log('❌ 已取消操作');
    process.exit(0);
  }

  return true;
}

/**
 * remove 命令主流程
 */
export async function removeExecute(moduleArg?: string, force?: boolean, skipCheck?: boolean): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 验证配置文件存在
  if (!fs.existsSync(configPath)) {
    console.log('⚠️ .gitmrepo 配置文件不存在');
    console.log('💡 请先运行: git mrepo init');
    return;
  }

  const manager = new ConfigManager();
  const config = ConfigManager.load(configPath);

  // 检查是否有注册模块
  const allModules = Object.values(config.modules);
  if (allModules.length === 0) {
    console.log('⚠️ 未注册任何模块仓库');
    return;
  }

  // 确定要移除的模块列表
  let modulesToRemove: Module[];

  if (moduleArg) {
    // 单模块模式
    const module = manager.findModule(config, moduleArg);
    if (!module) {
      console.log(`⚠️ 模块不存在: ${moduleArg}`);
      return;
    }
    modulesToRemove = [module];
  } else {
    // 交互选择模式
    modulesToRemove = await promptModuleSelection(allModules);
    if (modulesToRemove.length === 0) {
      console.log('⚠️ 未选择任何模块');
      return;
    }
  }

  console.log(`\n已选择: ${modulesToRemove.map(m => m.name).join(', ')} (${modulesToRemove.length}个模块)\n`);

  // 确定是否删除物理目录
  let shouldDeleteDirectory: boolean;

  if (force) {
    // --force 模式：直接删除，跳过询问
    shouldDeleteDirectory = true;
    console.log('⚠️  --force 模式：将直接删除物理目录（跳过询问）');

    // 显示即将删除的模块列表
    console.log('   即将删除以下模块的目录（包括 .git）：');
    for (const m of modulesToRemove) {
      console.log(`   - ${m.name} (${m.path})`);
    }

    // 询问最终确认
    await promptConfirmDelete(modulesToRemove);
  } else {
    // 默认模式：询问用户
    shouldDeleteDirectory = await promptDeleteDirectory();
  }

  // 前置 Git 状态检查
  if (!skipCheck) {
    console.log('\n🔍 检查模块 Git 状态...\n');

    const failedModules: Array<{ module: Module; message: string }> = [];

    for (const module of modulesToRemove) {
      const modulePath = path.isAbsolute(module.path)
        ? module.path
        : path.join(root, module.path);

      const { clean, message } = checkModuleGitStatus(modulePath);
      if (!clean) {
        failedModules.push({ module, message });
      } else {
        console.log(`[${module.name}]: ✅ Git 状态干净`);
      }
    }

    if (failedModules.length > 0) {
      console.log('\n❌ 以下模块 Git 状态不干净，无法移除:\n');
      for (const { module, message } of failedModules) {
        console.log(`[${module.name}] ${module.path}:`);
        console.log(message);
        console.log('');
      }
      console.log('💡 请先完成以下操作后再移除:');
      console.log('  1. 提交改动: cd <module_path> && git add . && git commit -m "message"');
      console.log('  2. 推送 commit: git push');
      console.log('  3. 或使用 --skip-check 强制移除（危险操作）');
      return;
    }
  } else {
    console.log('\n⚠️  警告：已跳过 Git 状态检查');
    console.log('   可能导致未保存的代码丢失\n');
  }

  // 开始移除
  console.log('\n🔄 移除模块注册...\n');

  for (const module of modulesToRemove) {
    const modulePath = path.isAbsolute(module.path)
      ? module.path
      : path.join(root, module.path);

    console.log(`[${module.name}] ${module.path}:`);

    // 移除配置
    delete config.modules[module.name];
    console.log('  ✅ 已从 .gitmrepo 移除');

    // 清理 gitignore
    removeGitignoreForModule(root, module.path);
    console.log('  ✅ 已从 .gitignore 移除');

    // 删除物理目录（根据用户选择）
    if (shouldDeleteDirectory) {
      if (fs.existsSync(modulePath)) {
        fs.rmSync(modulePath, { recursive: true, force: true });
        console.log('  ✅ 已删除目录: ' + module.path);
      } else {
        console.log('  ℹ️  目录不存在: ' + module.path);
      }
    } else {
      console.log('  ℹ️  保留目录: ' + module.path);
      console.log('     如需删除，请使用 --force 选项');
    }

    console.log('');
  }

  // 保存配置
  manager.save(configPath, config);

  console.log('✅ 移除完成');
  console.log(`   已移除 ${modulesToRemove.length} 个模块`);
}