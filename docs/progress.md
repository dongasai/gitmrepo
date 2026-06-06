# git-mrepo 项目进度

## 当前状态

**阶段**: 基础框架搭建完成 ✅

**日期**: 2026-06-07

---

## 已完成工作

### 1. 项目初始化 ✅

#### Cargo.toml 配置

- ✅ 项目元数据（名称、版本、描述）
- ✅ 核心依赖：
  - `clap 4` - CLI 命令解析（derive 特性）
  - `serde 1` - 序列化（derive 特性）
  - `serde_yaml 0.9` - YAML 配置文件
  - `git2 0.18` - Git 辅助功能（vendored-libgit2 特性）
  - `anyhow 1` - 错误处理
  - `thiserror 1` - 自定义错误类型
  - `path-absolutize 3` - 路径处理
- ✅ 开发依赖：`tempfile 3`（测试用）
- ✅ 二进制目标配置

#### 目录结构

```
git-mrepo/
├── Cargo.toml                ✅
├── README.md                 ✅（已完善）
├── docs/                     ✅（已完善）
│   ├── README.md
│   ├── init.md
│   ├── clone.md
│   ├── attach.md
│   ├── add.md
│   ├── status.md
│   ├── sync.md
│   ├── sync2.md
│   └── pull-push-fetch.md
├── src/
│   ├── main.rs               ✅ CLI 入口
│   ├── lib.rs                ✅ 库入口
│   ├── cli.rs                ✅ 命令定义（14 个子命令）
│   ├── config.rs             ✅ 配置文件管理
│   ├── error.rs              ✅ 错误类型定义
│   ├── commands/
│   │   ├── mod.rs            ✅
│   │   └── init.rs           ✅ **已实现**
│   └ utils/
│   │   └ mod.rs              ✅（待补充工具函数）
├── .gitmrepo                 ✅ 已生成（测试）
└── .gitignore                ✅ 已更新
```

### 2. CLI 框架 ✅

#### 命令定义（14 个子命令）

已定义的命令（[src/cli.rs](../src/cli.rs)）：

1. ✅ `init` - 初始化配置文件
2. ✅ `clone` - 克隆模块仓库（带 `-b/--branch` 参数）
3. ✅ `attach` - 关联现有目录
4. ✅ `add` - 注册已有仓库
5. ✅ `sync` - 同步所有模块（带 `--force` 参数）
6. ✅ `sync2` - 从子仓库同步配置
7. ✅ `pull` - 拉取更新
8. ✅ `push` - 推送变更
9. ✅ `fetch` - 获取远程信息
10. ✅ `status` - 查看状态
11. ✅ `branch` - 分支管理
12. ✅ `commit` - 创建提交
13. ✅ `config` - 配置参数
14. ✅ `clean` - 清理未跟踪文件

#### CLI 特性

- ✅ 中文描述（每个命令都有清晰的注释）
- ✅ 参数类型：必需参数、可选参数、命名参数（`-b/--branch`）
- ✅ 自动生成 `help` 和 `version` 命令
- ✅ 命令路由框架（[src/main.rs](../src/main.rs)）

### 3. 配置文件管理 ✅

#### Config 结构（[src/config.rs](../src/config.rs)）

- ✅ `Module` 结构体：
  - `name` - 模块名称
  - `path` - 相对路径
  - `remote` - 远程 URL
  - `branch` - 当前分支
  - `auto_sync` - 自动同步（可选）
- ✅ `Settings` 结构体：
  - `default_branch` - 默认分支
  - `show_all_modules_in_status` - 状态显示配置
  - `auto_ignore_git` - 自动忽略配置
- ✅ `Config` 结构体：
  - `version` - 配置版本
  - `modules` - 模块列表（HashMap）
  - `settings` - 全局设置

#### 配置功能

- ✅ `Config::new()` - 创建默认配置
- ✅ `Config::load()` - 从文件加载
- ✅ `Config::save()` - 保存到文件
- ✅ `Config::find_module()` - 查找模块（支持名称或路径）
- ✅ `Config::add_module()` - 添加模块
- ✅ `Config::update_module()` - 更新模块
- ✅ 使用 `serde_yaml` 序列化

### 4. init 命令实现 ✅

#### 功能实现（[src/commands/init.rs](../src/commands/init.rs)）

- ✅ 检查当前是否为 Git 仓库
- ✅ 获取 Git 根目录（`git rev-parse --show-toplevel`）
- ✅ 检查配置文件是否已存在
- ✅ 创建默认 `.gitmrepo` 配置文件
- ✅ 更新 `.gitignore`（忽略 `.gitmrepo`）
- ✅ 错误处理（使用 `anyhow`）

#### 测试结果

```bash
$ ./target/debug/git-mrepo init
✅ 已创建 .gitmrepo 配置文件
✅ 已更新 .gitignore（忽略 .gitmrepo）

$ cat .gitmrepo
version: '1.0'
modules: {}
settings:
  default_branch: main
  show_all_modules_in_status: true
  auto_ignore_git: true

$ cat .gitignore
# git-mrepo 配置文件
.gitmrepo
```

### 5. 错误处理 ✅

#### GitMrepoError 类型（[src/error.rs](../src/error.rs)）

定义的错误类型：
- ✅ `ConfigNotFound` - 配置文件不存在
- ✅ `ConfigParseError` - 配置解析失败
- ✅ `ModuleNotFound` - 模块不存在
- ✅ `NotGitRepo` - 不是 Git 仓库
- ✅ `NoOriginRemote` - 没有 origin 远程
- ✅ `UncommittedChanges` - 有未提交改动
- ✅ `GitOperationFailed` - Git 操作失败
- ✅ `PathNotFound` - 路径不存在
- ✅ `DirectoryExists` - 目录已存在

**注意**：当前 init 命令使用 `anyhow::Result`，后续其他命令将根据需要选择错误类型。

### 6. 文档体系 ✅

#### 已完成文档

- ✅ [README.md](../README.md) - 项目总览、命令列表、技术选型
- ✅ [docs/README.md](../docs/README.md) - 文档索引、使用流程
- ✅ [docs/init.md](../docs/init.md) - init 命令文档
- ✅ [docs/clone.md](../docs/clone.md) - clone 命令文档
- ✅ [docs/attach.md](../docs/attach.md) - attach 命令文档
- ✅ [docs/add.md](../docs/add.md) - add 命令文档
- ✅ [docs/status.md](../docs/status.md) - status 命令文档
- ✅ [docs/sync.md](../docs/sync.md) - sync 命令文档
- ✅ [docs/sync2.md](../docs/sync2.md) - sync2 命令文档
- ✅ [docs/pull-push-fetch.md](../docs/pull-push-fetch.md) - pull/push/fetch 综合文档

---

## 待实现命令（13 个）

### 高优先级

1. **clone** - 克隆模块仓库（核心功能）
   - 参数处理：`url`、可选 `dir`、可选 `-b/--branch`
   - URL 推导默认目录名
   - 注册到 `.gitmrepo`
   - 更新 `.gitignore`（忽略子仓库 .git）

2. **add** - 注册已有仓库（核心功能）
   - 从 `.git/config` 自动识别 URL 和分支
   - 使用 `git2` 库读取配置
   - 更新 `.gitignore`

3. **status** - 查看模块状态（核心功能）
   - 显示所有模块或指定模块
   - Git 状态检查（git2）
   - 未推送提交统计

4. **sync** - 同步所有模块（核心功能）
   - 目录不存在 → clone
   - 目录存在 → pull
   - 未提交改动检查（git2）
   - `--force` 参数处理

### 中优先级

5. **pull** - 拉取模块更新
6. **push** - 推送模块变更
7. **fetch** - 获取远程信息
8. **sync2** - 从子仓库同步配置
9. **attach** - 关联现有目录

### 低优先级

10. **branch** - 分支管理
11. **commit** - 创建提交
12. **config** - 配置参数
13. **clean** - 清理未跟踪文件

---

## 技术实现策略

### 双层架构

根据 [README.md](../README.md) 技术实现部分：

```rust
// 核心 Git 操作：调用 git 命令
pub fn mrepo_pull(module_name: &str) -> Result<()> {
    let module = config.find_module(module_name)?;

    Command::new("git")
        .current_dir(&module.path)  // 在子目录执行
        .args(&["pull", "origin", &module.branch])
        .output()?;
}

// 辅助功能：使用 git2 库
pub fn check_uncommitted_changes(module_path: &str) -> Result<bool> {
    let repo = git2::Repository::open(module_path)?;
    let statuses = repo.statuses(None)?;

    for entry in statuses.iter() {
        if entry.status().contains(git2::Status::WT_MODIFIED) {
            return Ok(true);
        }
    }

    Ok(false)
}
```

**策略**：
- ✅ 核心 Git 操作（clone、pull、push）用 `std::process::Command`
- ✅ 辅助功能（状态检查、配置读取）用 `git2`
- ✅ init 命令已按此策略实现

---

## 下一步计划

### 优先级 1：实现 clone 命令

#### 需要实现的功能

1. URL 推导默认目录名
   ```rust
   // https://github.com/org/auth-service.git → auth-service
   fn derive_dir_from_url(url: &str) -> String {
       url.split('/')
           .last()
           .unwrap_or("")
           .replace(".git", "")
   }
   ```

2. 执行 git clone（带分支参数）
   ```rust
   Command::new("git")
       .args(&["clone", "-b", &branch, &url, &dir])
       .output()?;
   ```

3. 注册到 `.gitmrepo`
   ```rust
   let module = Module {
       name: derive_dir_from_url(&url),
       path: dir,
       remote: url,
       branch: branch,
       auto_sync: None,
   };
   config.add_module(module);
   config.save(".gitmrepo")?;
   ```

4. 更新 `.gitignore`
   ```rust
   // 忽略 modules/auth/.git/
   fs::write(".gitignore", "modules/auth/.git/\n")?;
   ```

### 优先级 2：实现 add 命令

#### 需要实现的功能

1. 检查目录是否为 Git 仓库
   ```rust
   let repo = git2::Repository::open(dir)?;
   ```

2. 自动识别 URL 和分支
   ```rust
   // 从 .git/config 读取 origin URL
   let remote = repo.find_remote("origin")?;
   let url = remote.url().unwrap_or("unknown");

   // 从 .git/HEAD 读取当前分支
   let head = repo.head()?;
   let branch = head.shorthand().unwrap_or("unknown");
   ```

3. 注册到 `.gitmrepo` 并更新 `.gitignore`

### 优先级 3：实现 status 命令

#### 需要实现的功能

1. 读取配置文件，遍历模块
2. 检查每个模块的 Git 状态
   ```rust
   let repo = git2::Repository::open(&module.path)?;
   let statuses = repo.statuses(None)?;
   ```
3. 统计未推送提交
4. 显示结果（所有模块或指定模块）

---

## 测试策略

### 单元测试（待实现）

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_save_load() {
        let config = Config::new();
        config.save(Path::new("test.yaml"))?;

        let loaded = Config::load(Path::new("test.yaml"))?;
        assert_eq!(config.version, loaded.version);
    }

    #[test]
    fn test_derive_dir_from_url() {
        let url = "https://github.com/org/auth-service.git";
        let dir = derive_dir_from_url(url);
        assert_eq!(dir, "auth-service");
    }
}
```

### 集成测试（待实现）

创建测试目录结构：
```bash
tests/
├── integration_test.rs
└── fixtures/
    ├── main-repo/
    ├── auth-module/
    └── user-module/
```

---

## 编译与运行

### 当前可用命令

```bash
# 构建
cargo build

# 运行
./target/debug/git-mrepo init      # ✅ 已实现
./target/debug/git-mrepo --help    # ✅ 显示帮助
./target/debug/git-mrepo --version # ✅ 显示版本

# 其他命令（待实现）
./target/debug/git-mrepo clone <url> [dir] [-b <branch>]
./target/debug/git-mrepo add <dir>
./target/debug/git-mrepo status [module]
# ...
```

---

## 项目特点

### ✅ 已实现的特性

1. **模块化架构**：
   - CLI 定义独立（[src/cli.rs](../src/cli.rs)）
   - 配置管理独立（[src/config.rs](../src/config.rs)）
   - 命令实现分离（[src/commands/](../src/commands/)）

2. **完善的文档**：
   - 每个核心命令都有独立文档
   - 包含流程图、实现代码、使用示例

3. **错误处理**：
   - 自定义错误类型（[src/error.rs](../src/error.rs)）
   - 使用 `anyhow` 进行灵活错误处理

4. **配置管理**：
   - YAML 格式配置文件
   - 支持模块查找（名称或路径）
   - 完善的序列化/反序列化

5. **CLI 用户体验**：
   - 中文命令描述
   - 自动生成 help/version
   - 符合 Git 习惯的参数命名

---

## 总结

**当前进度**: 基础框架完成，init 命令已实现并测试通过。

**下一步**: 实现核心命令（clone、add、status、sync），逐步完善功能。

**预计时间**: 每个核心命令约 1-2 小时实现 + 测试。