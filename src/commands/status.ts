import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ConfigManager, Module } from '../config.js';
import {
  getGitRoot,
  hasUncommittedChanges,
  countUnpushedCommits,
  countRemoteNewCommits,
  getDetailedChanges,
  getUnpushedCommitDetails,
} from '../utils/index.js';

/**
 * 执行 status 命令 - 查看模块仓库状态
 */
export async function statusExecute(moduleArg?: string, detail?: boolean): Promise<void> {
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

  // 如果指定了单个模块，显示完整状态（不受 detail 参数影响）
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

  // 批量概览模式
  if (detail) {
    await displayDetailedStatus(modules, root);
  } else {
    await displayBriefStatus(modules, root);
  }
}

/**
 * 显示简要状态（原有逻辑）
 */
async function displayBriefStatus(modules: Module[], root: string): Promise<void> {
  console.log('📊 模块仓库状态:');

  for (const module of modules) {
    console.log(`\n[${module.name}] ${module.path}:`);
    console.log(`  分支: ${module.branch}`);
    console.log(`  远程: ${module.remote}`);

    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    // 检查目录是否存在
    if (!fs.existsSync(modulePath)) {
      console.log('  ⚠️  目录不存在');
      console.log('  💡 修复方案:');
      console.log(`     git mrepo clone ${module.remote} ${module.path}`);
      continue;
    }

    // 检查 .git 目录是否存在
    if (!fs.existsSync(path.join(modulePath, '.git'))) {
      console.log('  ⚠️  不是 Git 仓库（缺少 .git）');
      console.log('  💡 使用 git mrepo fix 修复');
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

/**
 * 显示详细状态（新增逻辑）
 */
async function displayDetailedStatus(modules: Module[], root: string): Promise<void> {
  console.log('📊 模块仓库详细状态:\n');

  for (const module of modules) {
    const modulePath = path.isAbsolute(module.path) ? module.path : path.join(root, module.path);

    console.log(`On branch ${module.branch}`);

    // 检查目录是否存在
    if (!fs.existsSync(modulePath)) {
      console.log('⚠️  目录不存在');
      console.log('💡 修复方案:');
      console.log(`  git mrepo clone ${module.remote} ${module.path}`);
      console.log('─'.repeat(60) + '\n');
      continue;
    }

    // 检查 .git 目录是否存在
    if (!fs.existsSync(path.join(modulePath, '.git'))) {
      console.log('⚠️  不是 Git 仓库（缺少 .git）');
      console.log('💡 使用 git mrepo fix 修复');
      console.log('─'.repeat(60) + '\n');
      continue;
    }

    // 显示分支状态（领先/落后）
    const unpushedCount = countUnpushedCommits(modulePath, module.branch);
    const remoteNewCount = countRemoteNewCommits(modulePath, module.branch);

    if (unpushedCount > 0) {
      console.log(`Your branch is ahead of 'origin/${module.branch}' by ${unpushedCount} commit.`);
      console.log(`  (use "git mrepo push ${module.name}" to publish your local commits)`);
    }
    if (remoteNewCount > 0) {
      console.log(`Your branch is behind 'origin/${module.branch}' by ${remoteNewCount} commit.`);
      console.log(`  (use "git mrepo pull ${module.name}" to update your local branch)`);
    }
    if (unpushedCount === 0 && remoteNewCount === 0) {
      console.log(`Your branch is up to date with 'origin/${module.branch}'.`);
    }

    // 获取改动详情
    const changes = await getDetailedChanges(modulePath);
    const hasStagedChanges = changes.stagedModified.length > 0 || changes.stagedAdded.length > 0 || changes.stagedDeleted.length > 0;
    const hasUnstagedChanges = changes.modified.length > 0 || changes.deleted.length > 0;
    const hasUntrackedFiles = changes.added.length > 0;

    if (hasStagedChanges) {
      console.log('\nChanges to be committed:');
      console.log('  (use "git restore --staged <file>..." to unstage)');
      if (changes.stagedModified.length > 0) {
        for (const file of changes.stagedModified) {
          console.log(`\tmodified:   ${file}`);
        }
      }
      if (changes.stagedAdded.length > 0) {
        for (const file of changes.stagedAdded) {
          console.log(`\tnew file:   ${file}`);
        }
      }
      if (changes.stagedDeleted.length > 0) {
        for (const file of changes.stagedDeleted) {
          console.log(`\tdeleted:    ${file}`);
        }
      }
    }

    if (hasUnstagedChanges) {
      console.log('\nChanges not staged for commit:');
      console.log('  (use "git add <file>..." to update what will be committed)');
      console.log('  (use "git restore <file>..." to discard changes in working directory)');
      if (changes.modified.length > 0) {
        for (const file of changes.modified) {
          console.log(`\tmodified:   ${file}`);
        }
      }
      if (changes.deleted.length > 0) {
        for (const file of changes.deleted) {
          console.log(`\tdeleted:    ${file}`);
        }
      }
    }

    if (hasUntrackedFiles) {
      console.log('\nUntracked files:');
      console.log('  (use "git add <file>..." to include in what will be committed)');
      for (const file of changes.added) {
        console.log(`\t${file}`);
      }
    }

    if (changes.renamed.length > 0) {
      console.log('\nRenamed files:');
      for (const rename of changes.renamed) {
        console.log(`\trenamed:    ${rename.from} -> ${rename.to}`);
      }
    }

    // 如果没有任何改动
    if (!hasStagedChanges && !hasUnstagedChanges && !hasUntrackedFiles && changes.renamed.length === 0) {
      console.log('\nnothing to commit, working tree clean');
    }

    // 显示统计信息（如果有改动）
    if (hasStagedChanges || hasUnstagedChanges) {
      console.log(`\n📊 统计: +${changes.stats.insertions} -${changes.stats.deletions}`);
    }

    // 显示未推送提交详情（如果有）
    if (unpushedCount > 0) {
      console.log(`\n🔄 未推送提交详情 (显示前5个):`);
      const unpushedCommits = await getUnpushedCommitDetails(modulePath, module.branch, 5);
      for (const commit of unpushedCommits) {
        console.log(`  ${commit.hash} - ${commit.message} - ${commit.author} - ${commit.relativeDate}`);
      }
      if (unpushedCount > 5) {
        console.log(`  ... 还有 ${unpushedCount - 5} 个提交`);
      }
    }

    console.log(`\n📍 模块: ${module.name} (${module.path})`);
    console.log(`📍 远程: ${module.remote}\n`);
    console.log('─'.repeat(60) + '\n');
  }
}
