import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { ConfigManager, type Module } from '../config.js';
import { getGitRoot, updateGitignoreForModule } from '../utils/index.js';

export function deriveDirFromUrl(url: string): string {
  const lastPart = url.split('/').pop() || url;
  const dir = lastPart.replace('.git', '');
  if (dir.includes(':')) {
    return (dir.split(':').pop() || dir).replace('.git', '');
  }
  return dir;
}

export function deriveModuleName(p: string): string {
  return p.includes('/') ? (p.split('/').pop() || p) : p;
}

export async function cloneExecute(url: string, dir?: string, branch?: string): Promise<void> {
  const root = getGitRoot();
  const modulePath = dir || deriveDirFromUrl(url);

  if (fs.existsSync(modulePath)) {
    throw new Error(`目录已存在: ${modulePath}`);
  }

  const moduleName = deriveModuleName(modulePath);
  const actualBranch = branch || 'main';

  console.log('🔄 克隆模块仓库...');
  console.log(`   URL: ${url}`);
  console.log(`   目录: ${modulePath}`);
  console.log(`   分支: ${actualBranch}`);

  try {
    execSync(`git clone -b "${actualBranch}" "${url}" "${modulePath}"`, { encoding: 'utf-8' });
  } catch (e: any) {
    throw new Error(`克隆失败: ${e.stderr?.toString() || e.message}`);
  }

  console.log(`✅ 已克隆到 ${modulePath}`);

  const configPath = path.join(root, '.gitmrepo');
  const cm = new ConfigManager();
  const config = fs.existsSync(configPath) ? ConfigManager.load(configPath) : (() => {
    console.log('⚠️  .gitmrepo 不存在，创建新配置文件');
    return ConfigManager.create();
  })();

  const module: Module = { name: moduleName, path: modulePath, remote: url, branch: actualBranch };
  cm.addModule(config, module);
  cm.save(configPath, config);

  console.log('✅ 已注册到 .gitmrepo');
  updateGitignoreForModule(root, modulePath);
  console.log(`✅ 已更新 .gitignore（忽略 ${modulePath}/.git/）`);

  console.log('\n💡 后续操作:');
  console.log(`   git mrepo status ${moduleName}         查看模块状态`);
  console.log(`   cd ${modulePath} && git log            查看提交历史`);
}
