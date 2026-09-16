import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import prompts from 'prompts';
import { ConfigManager, Module } from '../config.js';
import { attachDirToRemote } from '../utils/git.js';
import { getGitRoot } from '../utils/gitignore.js';
import { countFilesAndSize } from '../utils/file-stats.js';
import { detectModuleIssues, isGitDirectoryHealthy, ModuleIssue } from '../utils/module-health.js';

/**
 * fix 命令主函数
 * @param moduleArg 模块名称或路径（可选）
 * @param batch 是否批量模式
 */
export async function fixExecute(moduleArg?: string, batch?: boolean): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  // 加载配置
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件不存在');
    console.log('   请先执行: git mrepo init');
    return;
  }

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  if (!config || !config.modules || Object.keys(config.modules).length === 0) {
    console.log('⚠️  未找到任何模块配置');
    return;
  }

  // 单模块模式
  if (moduleArg) {
    const module = cm.findModule(config, moduleArg);
    if (!module) {
      throw new Error(`未找到模块: ${moduleArg}`);
    }
    await fixSingleModule(module, root, configPath, config, cm);
    return;
  }

  // 批量模式
  if (batch) {
    await fixAllModules(root, configPath, config, cm);
    return;
  }

  // 交互式选择模块
  const modules = Object.values(config.modules);
  const issues = detectModuleIssues(root, modules);

  if (issues.length === 0) {
    console.log('✅ 所有模块状态正常，无需修复');
    return;
  }

  console.log(`🔍 检测到 ${issues.length} 个模块存在问题:\n`);

  const choices = issues.map((issue, index) => ({
    title: `${index + 1}. ${issue.module.name} - ${issue.description}`,
    value: issue,
    selected: false,
  }));

  const response = await prompts({
    type: 'multiselect',
    name: 'selected',
    message: '选择要修复的模块（空格选择，回车确认）',
    choices,
    hint: '- 空格选择  - a 切换全部  - 回车确认',
  });

  if (!response.selected || response.selected.length === 0) {
    console.log('ℹ️  已取消修复');
    return;
  }

  // 依次修复选中的模块
  for (const issue of response.selected) {
    console.log('\n' + '='.repeat(60));
    await fixSingleModule(issue.module, root, configPath, config, cm, issue);
  }

  console.log('\n✅ 修复完成！');
}

/**
 * 修复单个模块
 */
async function fixSingleModule(
  module: Module,
  root: string,
  configPath: string,
  config: any,
  cm: ConfigManager,
  detectedIssue?: ModuleIssue
): Promise<void> {
  const modulePath = path.join(root, module.path);

  console.log(`\n🔍 检查模块 [${module.name}]...`);

  // 检测问题（如果没有传入）
  let issue = detectedIssue;
  if (!issue) {
    const issues = detectModuleIssues(root, [module]);
    if (issues.length === 0) {
      console.log('✅ 模块状态正常，无需修复');
      return;
    }
    issue = issues[0];
  }

  // 显示问题详情
  console.log(`  目录: ${module.path}`);
  console.log(`  问题: ${issue.description}`);

  // 如果目录存在，统计文件
  if (fs.existsSync(modulePath)) {
    const stats = countFilesAndSize(modulePath);
    console.log(`  现有文件: ${stats.count} 个文件（总计 ${stats.formatted})`);
  }

  // 根据问题类型提供不同的修复选项
  const options = getRepairOptions(issue.type, modulePath);

  if (options.length === 0) {
    console.log('⚠️  此问题无法通过 fix 命令修复，请手动处理');
    return;
  }

  // 提供修复选择
  const choices = options.map((opt, index) => ({
    title: `${index + 1}. ${opt.label}`,
    value: opt.action,
  }));

  choices.push({
    title: `${options.length + 1}. 跳过此模块`,
    value: 'skip',
  });

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: '请选择修复方式',
    choices,
    initial: 0,
  });

  if (!response.action || response.action === 'skip') {
    console.log('ℹ️  已跳过修复');
    return;
  }

  // 执行修复
  try {
    await executeRepair(response.action, module, modulePath, root, configPath, config, cm);
    console.log(`\n✅ 模块 [${module.name}] 已成功修复！`);
  } catch (error: any) {
    console.error(`\n❌ 修复失败: ${error.message}`);
  }
}

/**
 * 根据问题类型获取修复选项
 */
function getRepairOptions(issueType: string, modulePath: string): Array<{ label: string; action: string }> {
  const options: Array<{ label: string; action: string }> = [];

  if (issueType === 'missing_directory') {
    options.push({
      label: '克隆模块（从远程仓库克隆到本地）',
      action: 'clone',
    });
  } else if (issueType === 'missing_git' || issueType === 'git_corrupted') {
    options.push({
      label: '关联修复（✅  推荐：保留现有内容，恢复 Git 管理）',
      action: 'attach',
    });
    options.push({
      label: '重新克隆（⚠️  会清空目录，丢失现有内容）',
      action: 'clone_force',
    });
  }

  return options;
}

/**
 * 执行修复操作
 */
async function executeRepair(
  action: string,
  module: Module,
  modulePath: string,
  root: string,
  configPath: string,
  config: any,
  cm: ConfigManager
): Promise<void> {
  switch (action) {
    case 'clone':
      await repairMissingDirectory(module, modulePath, root);
      break;

    case 'clone_force':
      await repairByClone(module, modulePath, root);
      break;

    case 'attach':
      await repairByAttach(module, modulePath, root, configPath, config, cm);
      break;

    default:
      throw new Error(`未知的修复操作: ${action}`);
  }
}

/**
 * 修复缺失目录：克隆模块
 */
async function repairMissingDirectory(module: Module, modulePath: string, root: string): Promise<void> {
  console.log('✅ 正在执行克隆修复...');

  // 确保父目录存在
  const parentDir = path.dirname(modulePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // 克隆仓库
  console.log('  ✓ 克隆远程仓库');
  execSync(`git clone -b "${module.branch}" "${module.remote}" "${modulePath}"`, {
    cwd: root,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  // 验证克隆成功
  if (!fs.existsSync(path.join(modulePath, '.git'))) {
    throw new Error('克隆失败：.git 目录不存在');
  }

  console.log('  ✓ 验证 Git 仓库状态');
}

/**
 * 重新克隆修复（会删除现有内容）
 */
async function repairByClone(module: Module, modulePath: string, root: string): Promise<void> {
  console.log('⚠️  正在执行重新克隆修复（将删除现有内容）...');

  // 确认删除
  const confirm = await prompts({
    type: 'confirm',
    message: '此操作将删除目录中的所有内容，确认继续？',
    initial: false,
  });

  if (!confirm) {
    throw new Error('用户取消操作');
  }

  // 删除目录
  if (fs.existsSync(modulePath)) {
    console.log('  ✓ 删除现有目录');
    fs.rmSync(modulePath, { recursive: true, force: true });
  }

  // 克隆仓库
  console.log('  ✓ 克隆远程仓库');
  execSync(`git clone -b "${module.branch}" "${module.remote}" "${modulePath}"`, {
    cwd: root,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  // 验证克隆成功
  if (!fs.existsSync(path.join(modulePath, '.git'))) {
    throw new Error('克隆失败：.git 目录不存在');
  }

  console.log('  ✓ 验证 Git 仓库状态');
}

/**
 * 关联修复（保留现有内容）
 */
async function repairByAttach(
  module: Module,
  modulePath: string,
  root: string,
  configPath: string,
  config: any,
  cm: ConfigManager
): Promise<void> {
  console.log('✅ 正在执行关联修复...');

  try {
    // 使用 attachDirToRemote 函数
    console.log('  ✓ 克隆到临时目录');
    const actualBranch = attachDirToRemote(modulePath, module.remote, module.branch);

    // 如果分支不同，更新配置
    if (actualBranch && actualBranch !== module.branch) {
      console.log(`  ℹ️  实际分支为 ${actualBranch}，将更新配置`);
      const modConfig = config.modules[module.name];
      if (modConfig) {
        modConfig.branch = actualBranch;
        cm.save(configPath, config);
      }
    }

    // 验证 Git 状态
    console.log('  ✓ 验证 Git 仓库状态');
    if (!isGitDirectoryHealthy(modulePath)) {
      throw new Error('关联失败：.git 目录仍然不健康');
    }
  } catch (error: any) {
    throw new Error(`关联修复失败: ${error.message}`);
  }
}

/**
 * 批量修复所有模块
 */
async function fixAllModules(
  root: string,
  configPath: string,
  config: any,
  cm: ConfigManager
): Promise<void> {
  const modules = Object.values(config.modules);
  const issues = detectModuleIssues(root, modules);

  if (issues.length === 0) {
    console.log('✅ 所有模块状态正常，无需修复');
    return;
  }

  console.log(`🔍 检测到 ${issues.length} 个模块存在问题\n`);

  // 分类问题
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const warningIssues = issues.filter((i) => i.severity === 'warning');

  if (criticalIssues.length > 0) {
    console.log(`⚠️  发现 ${criticalIssues.length} 个严重问题，需要手动确认修复：\n`);
    for (const issue of criticalIssues) {
      console.log(`  - ${issue.module.name}: ${issue.description}`);
    }
    console.log('\n💡 请使用交互模式逐个修复: git mrepo fix');
    return;
  }

  // 只有问题级别的问题可以自动修复（使用 attach 方式）
  console.log('🔧 正在自动修复警告级别的问题...\n');

  const results: Array<{ module: string; success: boolean; error?: string }> = [];

  for (const issue of warningIssues) {
    const modulePath = path.join(root, issue.module.path);

    console.log(`修复模块 [${issue.module.name}]...`);

    try {
      await repairByAttach(issue.module, modulePath, root, configPath, config, cm);
      results.push({ module: issue.module.name, success: true });
      console.log(`  ✅ 成功`);
    } catch (error: any) {
      results.push({ module: issue.module.name, success: false, error: error.message });
      console.log(`  ❌ 失败: ${error.message}`);
    }
  }

  // 显示修复报告
  console.log('\n' + '='.repeat(60));
  console.log('修复报告:\n');

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`✅ 成功修复: ${successCount} 个模块`);
  if (failCount > 0) {
    console.log(`❌ 修复失败: ${failCount} 个模块`);
    for (const result of results.filter((r) => !r.success)) {
      console.log(`  - ${result.module}: ${result.error}`);
    }
  }
}