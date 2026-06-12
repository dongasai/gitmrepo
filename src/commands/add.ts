import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, updateGitignoreForModule } from '../utils/index.js';
import simpleGit from 'simple-git';

function deriveModuleName(p: string): string {
  return p.includes('/') ? (p.split('/').pop() || p) : p;
}

export async function addExecute(dir: string): Promise<void> {
  const root = getGitRoot();

  if (!fs.existsSync(dir)) {
    throw new Error(`目录不存在: ${dir}`);
  }

  // 检查目录自身是否是 Git 仓库（避免被父级仓库误判）
  if (!fs.existsSync(path.join(dir, '.git'))) {
    throw new Error(`目录不是 Git 仓库: ${dir}\n请先在该目录执行 git init，或使用 attach 命令`);
  }

  console.log('🔍 自动识别 Git 仓库信息...');

  const git = simpleGit(dir);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find(r => r.name === 'origin');
  if (!origin) throw new Error('找不到 origin 远程，请先添加远程仓库');
  const url = origin.refs?.fetch;
  if (!url) throw new Error('无法获取远程 URL');

  const status = await git.status();
  const branch = status.current;
  if (!branch) throw new Error('无法获取分支名称');

  const moduleName = deriveModuleName(dir);

  console.log(`   URL: ${url}`);
  console.log(`   分支: ${branch}`);
  console.log(`   名称: ${moduleName}`);

  const configPath = path.join(root, '.gitmrepo');
  const cm = new ConfigManager();
  const config = fs.existsSync(configPath) ? ConfigManager.load(configPath) : (() => {
    console.log('⚠️  .gitmrepo 不存在，创建新配置文件');
    return ConfigManager.create();
  })();

  const module: Module = { name: moduleName, path: dir, remote: url, branch };
  cm.addModule(config, module);
  cm.save(configPath, config);

  console.log('✅ 已注册到 .gitmrepo');
  updateGitignoreForModule(root, dir);
  console.log(`✅ 已更新 .gitignore（忽略 ${dir}.git/）`);

  console.log('\n💡 后续操作:');
  console.log(`   git mrepo status ${moduleName}         查看模块状态`);
  console.log(`   git mrepo pull ${moduleName}           拉取远程更新`);
}
