#!/usr/bin/env node

/**
 * git-mrepo npm wrapper
 * 调用对应平台的二进制文件
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

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
  const binaryName = BINARY_MAP[key];

  if (!binaryName) {
    console.error(`不支持的平台: ${process.platform}-${process.arch}`);
    console.error('支持的: darwin/linux/win32 (x64/arm64)');
    process.exit(1);
  }

  return binaryName;
}

function getBinaryPath() {
  const binaryName = getBinaryName();
  const binaryPath = path.join(__dirname, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.error(`找不到二进制文件: ${binaryName}`);
    console.error('');
    console.error('尝试重新安装:');
    console.error('  npm uninstall -g @aspect/git-mrepo');
    console.error('  npm install -g @aspect/git-mrepo');
    process.exit(1);
  }

  return binaryPath;
}

function main() {
  const binaryPath = getBinaryPath();
  const args = process.argv.slice(2);

  try {
    execFileSync(binaryPath, args, {
      stdio: 'inherit',
      windowsHide: true,
    });
  } catch (error) {
    if (error.status !== null) {
      process.exit(error.status);
    }
    throw error;
  }
}

main();
