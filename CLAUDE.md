# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

git-mrepo 是一个 Rust CLI 工具，用于管理模块化 Git 仓库。核心机制：主仓库通过忽略子仓库的 `.git` 目录实现双重管理（同一文件被两个仓库管理）。

## 开发命令

### 使用 Makefile（推荐）

项目使用 Makefile 自动管理版本和构建：

```bash
# 查看所有可用命令
make help

# Debug 构建（递增 patch 版本 + 构建）
make debug

# Release 构建（递增 minor 版本 + 构建）
make release

# 完整发布流程（test + format + release）
make release-full

# 运行测试（不影响版本）
make test

# 清理构建产物
make clean

# 格式化代码
make format

# 仅版本管理（不影响构建）
make version-patch  # 递增 patch 版本
make version-minor  # 递增 minor 版本
make version-major  # 递增 major 版本
make show-version   # 显示当前版本
```

### 版本递增规则

- **patch** (0.1.0 → 0.1.1)：Bug 修复、小改进
- **minor** (0.1.0 → 0.2.0)：新功能、向后兼容的改动
- **major** (0.1.0 → 1.0.0)：重大更新、不兼容的改动

### 直接使用 Cargo

```bash
# 构建（不更新版本）
cargo build

# 运行（开发模式）
./target/debug/git-mrepo <command>

# 运行单元测试
cargo test

# 运行单个测试
cargo test test_derive_dir_from_url

# 构建 release 版本
cargo build --release
```

## 核心架构

### 双层实现架构

**核心 Git 操作**：使用 `std::process::Command` 执行系统 git 命令
- clone、pull、push、fetch 等核心操作
- 在子目录执行：`Command::new("git").current_dir(&module.path)`

**辅助功能**：使用 `git2` 库
- 状态检查（未提交改动）
- 统计提交数量（未推送、远程新提交）
- 自动识别（从 .git/config、.git/HEAD）

示例：
```rust
// 核心 Git 操作
Command::new("git")
    .args(&["clone", "-b", &branch, &url, &path])
    .output()?;

// 辅助功能（git2）
let repo = Repository::open(&path)?;
let statuses = repo.statuses(None)?;
```

### 配置文件 (.gitmrepo)

- YAML 格式，记录模块仓库配置（URL、路径、分支）
- **必须提交到主仓库**（团队成员共享）
- 类似 package.json（Node.js）或 requirements.txt（Python）

关键结构：
```yaml
modules:
  auth-service:
    path: modules/auth
    remote: https://github.com/org/auth-service.git
    branch: main
```

### 模块查找机制

所有命令支持两种方式查找模块：
- 模块名称：`auth-service`
- 模块路径：`modules/auth`

实现：`Config::find_module()` 方法

### .gitignore 自动更新

核心机制实现：
- 主仓库忽略子仓库的 `.git` 目录
- 自动添加：`modules/auth/.git/`
- 批量更新支持：`update_gitignore_for_modules()`
- 调用时机：clone、add、attach、sync2 命令

工具函数位置：[src/utils/gitignore.rs](src/utils/gitignore.rs)

## 命令实现模式

每个命令位于 `src/commands/<name>.rs`，遵循统一模式：

```rust
pub fn execute(...) -> Result<()> {
    let root = get_git_root()?;
    let config = Config::load(&config_path)?;

    // 确定操作的模块
    let modules = if let Some(name_or_path) = module {
        vec![config.find_module(&name_or_path)?.clone()]
    } else {
        config.modules.values().cloned().collect()
    };

    // 执行操作...
}
```

## 已实现命令（8个）

- **init** - 初始化配置文件
- **clone** - 克隆并注册模块（URL 推导、自动更新 .gitignore）
- **add** - 注册已有仓库（自动识别 URL 和分支）
- **status** - 查看状态（未提交改动、未推送提交）
- **sync** - 一键同步所有模块（clone + pull）
- **pull/push/fetch** - Git 基础操作

## 待实现命令

- sync2 - 从子仓库同步配置到 .gitmrepo
- attach - 关联现有目录到远程仓库
- branch/commit/config/clean - 辅助命令

## 重要设计决策

1. **.gitmrepo 不应该被忽略** - 项目级配置，团队共享
2. **智能识别** - 支持模块名称和路径两种查找方式
3. **批量操作** - 所有 Git 操作命令支持单个或所有模块
4. **中文提示** - 所有用户输出使用中文
5. **URL 推导** - clone 命令自动从 URL 推导默认目录名

## 测试策略

单元测试位于命令文件末尾（`#[cfg(test)] mod tests`）：
- URL 推导逻辑
- 模块名称推导
- 配置序列化/反序列化

运行测试：`cargo test`

## 演示项目

`demo/` 目录包含演示用项目，展示 git-mrepo 的实际使用场景：
- 模拟主仓库结构
- 测试脚本和示例配置
- 用于功能验证和用户演示

注意：demo 目录已在 `.gitignore` 中排除，不提交到仓库。

## 文档结构

详细文档位于 `docs/`：
- 命令文档：每个核心命令独立文档
- 架构文档：[gitignore-mechanism.md](docs/gitignore-mechanism.md) - 核心机制说明
- 进度文档：[completion-summary.md](docs/completion-summary.md) - 实现总结

## 关键文件路径

- 配置管理：`src/config.rs`
- 命令实现：`src/commands/*.rs`
- 工具函数：`src/utils/gitignore.rs`
- CLI 定义：`src/cli.rs`
- 配置文件示例：`.gitmrepo`
- 版本管理工具：`scripts/version-manager/`