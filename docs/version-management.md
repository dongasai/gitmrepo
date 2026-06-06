# 版本管理方案

## 概述

git-mrepo 项目使用自动化的版本管理系统，基于语义化版本（Semantic Versioning）规范。

## 版本管理工具

版本管理工具位于 `scripts/version-manager/`，提供以下功能：

- 自动解析和更新 `Cargo.toml` 中的版本号
- 支持 patch/minor/major 三种版本递增方式
- 可选自动提交版本更新到 git

## 使用方法

### 1. 使用 Makefile（推荐）

```bash
# Debug 构建（patch 版本递增）
make debug

# Release 构建（minor 版本递增）
make release

# 完整发布流程
make release-full

# 仅查看版本
make show-version

# 仅递增版本（不构建）
make version-patch
make version-minor
make version-major
```

### 2. 直接使用版本管理工具

```bash
# 进入版本管理工具目录
cd scripts/version-manager

# 运行工具
cargo run -- patch    # 递增 patch 版本
cargo run -- minor    # 递增 minor 版本
cargo run -- major    # 递增 major 版本
cargo run -- show     # 显示当前版本

# 带自动提交功能
cargo run -- patch --commit
```

## 版本递增规则

遵循语义化版本规范：

- **patch** (0.1.0 → 0.1.1)
  - Bug 修复
  - 小改进
  - 文档更新
  - 不影响 API 的改动

- **minor** (0.1.0 → 0.2.0)
  - 新功能
  - 向后兼容的功能增强
  - 重大的代码重构（保持兼容性）

- **major** (0.1.0 → 1.0.0)
  - 重大更新
  - 不兼容的 API 改动
  - 架构重大变更

## Makefile 命令详解

### debug
- 递增 patch 版本
- 执行 `cargo build`（debug 模式）
- 适用于日常开发和调试

### release
- 递增 minor 版本
- 执行 `cargo build --release`（release 模式）
- 适用于功能发布

### release-full
完整的发布流程，按顺序执行：
1. `make test` - 运行测试
2. `make format` - 格式化代码
3. `make release` - 递增版本并构建

### test
- 运行 `cargo test`
- **不影响版本号**
- 适用于代码验证

### clean
- 运行 `cargo clean`
- 清理构建产物

### format
- 运行 `cargo fmt`
- 格式化代码

## 实现细节

### 技术栈

- **toml_edit**: 解析和编辑 Cargo.toml
- **semver**: 版本号解析和验证
- **clap**: CLI 命令行参数解析

### 工作流程

1. 读取项目根目录的 `Cargo.toml`
2. 解析当前版本号
3. 根据命令递增版本号：
   - patch: 只增加 patch 数字
   - minor: 增加 minor 数字，patch 重置为 0
   - major: 增加 major 数字，minor 和 patch 重置为 0
4. 更新 `Cargo.toml` 文件
5. 可选：提交更改到 git

### 路径处理

版本管理工具自动定位项目根目录：
```rust
let cargo_toml_path = Path::new(env!("CARGO_MANIFEST_DIR"))
    .parent()  // scripts/
    .unwrap()
    .parent()  // project-root/
    .unwrap()
    .join("Cargo.toml");
```

## 最佳实践

1. **开发阶段**：使用 `make debug`
   - 每次构建自动递增 patch 版本
   - 便于追踪开发进度

2. **功能发布**：使用 `make release` 或 `make release-full`
   - 递增 minor 版本表示新功能
   - release-full 确保代码质量和测试通过

3. **重大版本**：手动使用 `make version-major`
   - 仅在 API 重大变更时使用
   - 需要谨慎评估影响范围

4. **测试验证**：使用 `make test`
   - 不影响版本号
   - 快速验证功能

## 故障排除

### 版本没有更新
- 检查 Cargo.toml 是否可写
- 确认没有 git 未提交的冲突

### make 命令失败
- 确认已安装 cargo 和 rust
- 检查当前目录是否为项目根目录

### 版本管理工具编译失败
- 运行 `cd scripts/version-manager && cargo build`
- 检查依赖是否正确安装