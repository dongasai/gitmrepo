import { Command } from 'commander';
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const version = packageJson.version;
import { initExecute } from './commands/init.js';
import { cloneExecute } from './commands/clone.js';
import { addExecute } from './commands/add.js';
import { attachExecute } from './commands/attach.js';
import { syncExecute } from './commands/sync.js';
import { sync2Execute } from './commands/sync2.js';
import { pullExecute } from './commands/pull.js';
import { pushExecute } from './commands/push.js';
import { fetchExecute } from './commands/fetch.js';
import { statusExecute } from './commands/status.js';
import { branchExecute } from './commands/branch.js';
import { commitExecute } from './commands/commit.js';
import { configExecute } from './commands/config.js';
import { cleanExecute } from './commands/clean.js';
import { diffExecute } from './commands/diff.js';
import { removeExecute } from './commands/remove.js';
import { fixExecute } from './commands/fix.js';

const program = new Command();

program
  .name('git-mrepo')
  .description('Git 模块化仓库管理工具')
  .version(version);

async function wrap(fn: () => Promise<void>) {
  try { await fn(); } catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
}

program.command('init').description('初始化配置文件 .gitmrepo')
  .action(() => wrap(initExecute));

program.command('clone').description('克隆模块仓库')
  .argument('<url>', '远程仓库 URL')
  .argument('[dir]', '目录路径')
  .option('-b, --branch <branch>', '指定分支')
  .action(async (url: string, dir: string | undefined, opts: { branch?: string }) => {
    try { await cloneExecute(url, dir, opts.branch); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('attach').description('关联现有目录到远程仓库')
  .argument('<url>', '远程仓库 URL')
  .argument('<dir>', '目录路径')
  .option('-b, --branch <branch>', '指定分支')
  .action(async (url: string, dir: string, opts: { branch?: string }) => {
    try { await attachExecute(url, dir, opts.branch); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('add').description('注册已存在的 Git 仓库')
  .argument('<dir>', '目录路径')
  .action(async (dir: string) => {
    try { await addExecute(dir); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('sync').description('同步所有模块仓库')
  .option('-f, --force', '强制同步')
  .action(async (opts: { force?: boolean }) => {
    try { await syncExecute(!!opts.force); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('remove').description('移除模块注册')
  .argument('[module]', '模块名称或路径')
  .option('-f, --force', '直接删除物理目录（跳过询问）')
  .option('--skip-check', '跳过 Git 状态检查（危险操作）')
  .action(async (module: string | undefined, opts?: { force?: boolean; skipCheck?: boolean }) => {
    try { await removeExecute(module, opts?.force, opts?.skipCheck); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('status').description('查看模块状态')
  .argument('[module]', '模块名称或路径')
  .option('-d, --detail', '显示详细信息')
  .action(async (module?: string, opts?: { detail?: boolean }) => {
    try { await statusExecute(module, opts?.detail); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

program.command('fix').description('交互式修复模块问题')
  .argument('[module]', '模块名称或路径')
  .option('--batch', '批量自动修复（仅修复警告级别问题）')
  .action(async (module?: string, opts?: { batch?: boolean }) => {
    try { await fixExecute(module, opts?.batch); }
    catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
  });

for (const [cmd, desc, fn] of [
  ['sync2', '从子仓库同步配置', sync2Execute],
  ['pull', '拉取模块更新', pullExecute],
  ['push', '推送模块变更', pushExecute],
  ['fetch', '获取远程信息', fetchExecute],
  ['diff', '查看模块改动', diffExecute],
  ['branch', '查看分支信息', branchExecute],
  ['commit', '创建提交', commitExecute],
  ['config', '查看配置', configExecute],
  ['clean', '清理未跟踪文件', cleanExecute],
] as const) {
  program.command(cmd).description(desc)
    .argument('[module]', '模块名称或路径')
    .action(async (module?: string) => {
      try { await fn(module); }
      catch (e: any) { console.error(`❌ ${e.message}`); process.exit(1); }
    });
}

program.parse();
