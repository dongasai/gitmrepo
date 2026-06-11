import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config.js';
import { getGitRoot } from '../utils/index.js';

export async function initExecute(): Promise<void> {
  const root = getGitRoot();

  if (!fs.existsSync(path.join(root, '.git'))) {
    throw new Error('当前目录不是 Git 仓库');
  }

  const configPath = path.join(root, '.gitmrepo');
  if (fs.existsSync(configPath)) {
    console.log('⚠️  .gitmrepo 配置文件已存在');
    console.log('   如需重新初始化，请先删除现有配置文件');
    return;
  }

  const config = ConfigManager.create();
  new ConfigManager().save(configPath, config);

  console.log('✅ 已创建 .gitmrepo 配置文件');
  console.log('💡 提示：.gitmrepo 应提交到主仓库，让团队成员共享模块配置');
}
