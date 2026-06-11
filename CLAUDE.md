# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

git-mrepo 是一个 TypeScript CLI 工具，用于管理模块化 Git 仓库。核心机制：主仓库通过忽略子仓库的 `.git` 目录实现双重管理（同一文件被两个仓库管理）。

## 开发命令

```bash
# 安装依赖
npm install

# 构建
npm run build

# 本地开发（链接到全局）
npm link

# 运行
git mrepo <command>

# 发版
npm version patch  # 0.1.0 → 0.1.1
npm run build
npm publish
```

## 核心架构

### 技术栈

- **CLI 框架**: commander
- **配置读写**: js-yaml（YAML 格式）
- **Git 操作**: simple-git + child_process.execSync
- **构建**: tsup（单文件 ESM 输出，39KB）
- **运行时**: Node.js >= 18

### 项目结构

```
src/
├── cli.ts              # CLI 入口，commander 定义所有命令
├── config.ts           # ConfigManager 类，YAML 配置读写
├── commands/           # 14 个命令实现
│   ├── init.ts         # 初始化 .gitmrepo
│   ├── clone.ts        # 克隆模块仓库
│   ├── add.ts          # 注册已有 Git 仓库
│   ├── attach.ts       # 关联目录到远程
│   ├── sync.ts         # 批量同步（clone + pull）
│   ├── sync2.ts        # 从子仓库同步回配置
│   ├── pull/push/fetch.ts
│   ├── status.ts       # 查看模块状态
│   ├── branch.ts       # 查看分支
│   ├── commit.ts       # 提交检查
│   ├── config.ts       # 查看配置
│   └── clean.ts        # 清理未跟踪文件
└── utils/
    ├── gitignore.ts    # .gitignore 自动更新
    └── git.ts          # Git 辅助（未提交检查、未推送统计）
```

### 配置文件 (.gitmrepo)

YAML 格式，记录模块仓库配置：

```yaml
version: '1.0'
modules:
  auth-service:
    name: auth-service
    path: modules/auth
    remote: https://github.com/org/auth-service.git
    branch: main
settings:
  default_branch: main
  show_all_modules_in_status: true
  auto_ignore_git: true
```

### 模块查找

所有命令支持按名称（`auth-service`）或路径（`modules/auth`）查找模块。实现：`ConfigManager.findModule()`

### .gitignore 自动更新

clone、add、attach、sync 命令自动在 .gitignore 中添加 `<modulePath>.git/`，使主仓库忽略子仓库的 .git 目录。

## 已实现命令（14个）

| 命令 | 参数 | 说明 |
|------|------|------|
| init | 无 | 初始化 .gitmrepo 配置文件 |
| clone | `<url> [dir] [-b branch]` | 克隆并注册模块 |
| add | `<dir>` | 自动识别并注册已有 Git 仓库 |
| attach | `<url> <dir> [-b branch]` | 关联非 Git 目录到远程 |
| sync | `[-f]` | 同步所有模块（不存在→clone，存在→pull） |
| sync2 | `[module]` | 从子仓库实际状态同步回配置 |
| pull | `[module]` | 拉取更新 |
| push | `[module]` | 推送变更 |
| fetch | `[module]` | 获取远程信息 |
| status | `[module]` | 查看未提交改动和未推送提交 |
| branch | `[module]` | 查看本地/远程分支 |
| commit | `[module]` | 检查暂存状态，提示手动提交 |
| config | `[module]` | 查看配置信息 |
| clean | `[module]` | 检查未跟踪文件，提供清理命令 |

## 重要设计决策

1. **.gitmrepo 应该提交** — 项目级配置，团队共享
2. **支持名称和路径查找** — `ConfigManager.findModule()` 双模式
3. **批量操作** — 所有命令支持单模块或全部模块
4. **中文提示** — 所有输出使用中文
5. **URL 推导** — clone 自动从 URL 推导目录名
6. **单文件构建** — tsup 输出 39KB 单 ESM 文件
