import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ModuleConfig } from '../config.js';

/**
 * 模块问题类型
 */
export type ModuleIssueType = 'missing_directory' | 'missing_git' | 'git_corrupted';

/**
 * 问题严重程度
 */
export type IssueSeverity = 'critical' | 'warning';

/**
 * 模块问题描述
 */
export interface ModuleIssue {
  module: ModuleConfig;
  type: ModuleIssueType;
  severity: IssueSeverity;
  description: string;
}

/**
 * 检测模块问题
 */
export function detectModuleIssues(root: string, modules: ModuleConfig[]): ModuleIssue[] {
  const issues: ModuleIssue[] = [];

  for (const module of modules) {
    const modulePath = path.join(root, module.path);

    // 检测：目录不存在
    if (!fs.existsSync(modulePath)) {
      issues.push({
        module,
        type: 'missing_directory',
        severity: 'critical',
        description: '模块目录不存在',
      });
      continue;
    }

    // 检测：缺少 .git 目录
    const gitPath = path.join(modulePath, '.git');
    if (!fs.existsSync(gitPath)) {
      issues.push({
        module,
        type: 'missing_git',
        severity: 'warning',
        description: '缺少 .git 目录（无法进行 Git 操作）',
      });
      continue;
    }

    // 检测：.git 目录损坏
    if (!isGitDirectoryHealthy(modulePath)) {
      issues.push({
        module,
        type: 'git_corrupted',
        severity: 'critical',
        description: '.git 目录损坏或配置错误',
      });
    }
  }

  return issues;
}

/**
 * 验证 .git 目录是否健康
 */
export function isGitDirectoryHealthy(modulePath: string): boolean {
  const gitPath = path.join(modulePath, '.git');

  // 检查基本结构
  const requiredFiles = ['HEAD', 'config'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(gitPath, file))) {
      return false;
    }
  }

  // 检查 HEAD 文件内容是否有效
  try {
    const headContent = fs.readFileSync(path.join(gitPath, 'HEAD'), 'utf-8');
    if (!headContent.startsWith('ref: refs/') && !headContent.match(/^[a-f0-9]{40}$/)) {
      return false;
    }
  } catch {
    return false;
  }

  // 尝试执行 git status 验证仓库状态
  try {
    execSync('git rev-parse --git-dir', {
      cwd: modulePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}