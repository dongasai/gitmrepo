#!/usr/bin/env node

/**
 * postinstall 脚本
 * 从 GitHub Release 下载对应平台的二进制文件
 */

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const pkg = require('../package.json');
const VERSION = pkg.version;
const REPO = pkg.repository?.url?.replace('https://github.com/', '').replace('.git', '') || 'your-org/git-mrepo';

// 平台映射
const BINARY_MAP = {
  'darwin-x64': 'git-mrepo-darwin-x64',
  'darwin-arm64': 'git-mrepo-darwin-arm64',
  'linux-x64': 'git-mrepo-linux-x64',
  'linux-arm64': 'git-mrepo-linux-arm64',
  'win32-x64': 'git-mrepo-win32-x64.exe',
};

function getBinaryName() {
  const key = `${process.platform}-${process.arch}`;
  return BINARY_MAP[key];
}

function getDownloadUrl(binaryName) {
  return `https://github.com/${REPO}/releases/download/v${VERSION}/${binaryName}`;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, { headers: { 'User-Agent': 'npm-git-mrepo' } }, (response) => {
      // 处理重定向
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error('下载超时'));
    });
  });
}

async function main() {
  const binaryName = getBinaryName();

  if (!binaryName) {
    console.warn(`[@aspect/git-mrepo] 不支持的平台: ${process.platform}-${process.arch}`);
    return;
  }

  const binDir = path.join(__dirname, '..', 'bin');
  const binaryPath = path.join(binDir, binaryName);

  // 如果已存在则跳过
  if (fs.existsSync(binaryPath)) {
    console.log(`[@aspect/git-mrepo] 二进制已存在，跳过下载`);
    return;
  }

  const url = getDownloadUrl(binaryName);
  console.log(`[@aspect/git-mrepo] 下载 ${binaryName}...`);
  console.log(`[@aspect/git-mrepo] URL: ${url}`);

  try {
    await download(url, binaryPath);

    // 设置可执行权限
    if (process.platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }

    console.log(`[@aspect/git-mrepo] 安装成功!`);
  } catch (error) {
    console.error(`[@aspect/git-mrepo] 下载失败: ${error.message}`);
    console.error('');
    console.error('请手动从 GitHub Release 下载:');
    console.error(`  ${url}`);
    console.error('');
    console.error(`下载后放置到: ${binaryPath}`);
  }
}

main();
