# git-mrepo (Git 模块化仓库管理工具)

> 解决模块化开发中,`模块仓库`和`项目仓库`的关联问题

## 核心特性

1. 主仓库和子仓库没有直接git关系,独立性很强,通过本工具进行关联
2. 同一个文件被主仓库和子仓库管理
3. 本质是**项目仓库**通过忽略**模块仓库**的`.git`的方式来实现`项目仓库`和`模块仓库`独立管理

## 技术选型

- **实现语言**: Rust
- **命令形式**: Git 子命令 (`git-mrepo`)
- **调用方式**: `git mrepo <command>` (符合 Git 用户习惯)

### 优势

- ✅ 编译型语言，性能卓越，适合频繁 Git 操作
- ✅ 单文件分发，无需安装 Node.js/Python 等运行时环境
- ✅ 真正通用，适合所有 Git 用户
- ✅ 内存安全，错误处理完善，适合文件系统操作

## 命令规划

### 使用方式

```bash
git mrepo <command> [options] [arguments]
```

### 可用子命令

```bash
git mrepo init                          # 初始化配置文件 .gitmrepo
git mrepo clone <url> [dir] [-b <branch>] # 克隆模块仓库（可选指定分支）
git mrepo attach <url> [-b <branch>] <dir> # 关联现有目录到远程仓库
git mrepo add <dir>                     # 自动识别并注册已存在的 Git 仓库
git mrepo sync                          # 从配置文件同步所有模块仓库（clone + pull）
git mrepo sync2 [module]                # 从子仓库同步信息到配置文件
git mrepo pull [module]                 # 拉取模块仓库更新
git mrepo push [module]                 # 推送模块仓库变更
git mrepo fetch [module]                # 获取模块仓库远程信息
git mrepo branch [module]               # 查看或管理模块仓库分支
git mrepo commit [module]               # 在模块仓库中创建提交
git mrepo config [module]               # 配置模块仓库参数
git mrepo status [module]               # 查看模块仓库状态（默认显示所有）
git mrepo clean [module]                # 清理模块仓库未跟踪文件
git mrepo help [command]                # 显示帮助信息
git mrepo version                       # 显示版本信息
```

**参数说明**：
- `<url>`：远程仓库 URL（必需）
- `[dir]`：目录路径（clone 命令可选，默认从 URL 推导；attach 命令必需）
- `-b / --branch`：指定分支（可选，默认使用远程仓库的默认分支）
- `[module]`：模块名称（如 `auth-service`）或路径（如 `modules/auth`）

**命令对比**：
- `clone`：克隆新仓库（目录不存在或为空），可选指定分支和目录
- `attach`：关联现有目录（将普通目录转为 Git 仓库），必需指定目录
- `add`：注册已有的 Git 仓库（目录已有 .git），**自动识别** URL 和分支

**add 命令说明**：
```bash
git mrepo add modules/auth
# 自动识别并注册子仓库：
#   ✅ 从 .git/config 中读取远程 URL（origin）
#   ✅ 从 .git/HEAD 中读取当前分支
#   ✅ 自动更新 .gitignore（忽略 modules/auth/.git/）
#   ⚠️  如果没有 origin 远程，会报错提示
```

**使用示例**：
```bash
# clone 示例
git mrepo clone https://github.com/org/auth-service.git              # 默认目录、默认分支
git mrepo clone https://github.com/org/auth-service.git modules/auth # 指定目录
git mrepo clone https://github.com/org/auth-service.git -b develop   # 指定分支
git mrepo clone https://github.com/org/auth-service.git modules/auth -b develop  # 完整参数

# attach 示例
git mrepo attach https://github.com/org/auth-service.git modules/auth              # 默认分支
git mrepo attach https://github.com/org/auth-service.git modules/auth -b develop   # 指定分支

# 其他命令示例
git mrepo pull auth-service     # 使用名称
git mrepo pull modules/auth     # 使用路径
git mrepo status                # 显示所有模块状态
```
### 配置文件格式 (.gitmrepo)

```yaml
# 主仓库配置
version: "1.0"

# 模块仓库列表
modules:
  # 模块名称
  auth-service:
    # 模块仓库路径（相对于主仓库根目录）
    path: "modules/auth"
    # 模块仓库远程地址
    remote: "https://github.com/org/auth-service.git"
    # 当前跟踪的分支
    branch: "main"
    # 是否自动同步（可选）
    auto_sync: true

  user-service:
    path: "modules/user"
    remote: "https://github.com/org/user-service.git"
    branch: "develop"

# 全局配置（可选）
settings:
  # 默认分支
  default_branch: "main"
  # git mrepo status 是否默认显示所有模块状态
  # true: git mrepo status 自动显示所有模块
  # false: 需要指定模块名称，如 git mrepo status auth-service
  show_all_modules_in_status: true
  # 是否自动忽略模块仓库的 .git 目录
  auto_ignore_git: true
```

## 工作原理

1. **初始化**: `git mrepo init` 创建 `.gitmrepo` 配置文件
2. **关联**: 通过配置文件记录模块仓库的路径、远程地址等信息
3. **双重管理**:
   - 主仓库：通过 `.gitignore` 忽略模块仓库的 `.git` 目录
   - 模块仓库：在模块目录内独立管理自己的 Git 状态
4. **同步操作**: `pull/push/fetch` 等命令操作模块仓库的 Git 状态
5. **状态查看**: `status` 同时显示主仓库和模块仓库的状态

## 安装与构建

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-org/git-mrepo.git
cd git-mrepo

# 构建
cargo build --release

# 安装到系统（将二进制文件放入 PATH）
cargo install --path .
```

### 预编译二进制

从 Release 页面下载对应平台的预编译二进制文件，放入 PATH 目录即可。

## 技术实现

### 核心策略

**双层实现架构**：
- **核心 Git 操作**：调用系统 `git` 命令（pull、push、clone、commit、branch）
- **辅助功能**：使用 `git2` 库（状态检查、配置读取、快速验证）

### 实现原理

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

### 优势

- ✅ **实现简单**：核心操作 5 行代码，无需处理 Git 边界情况
- ✅ **功能完整**：支持所有 Git 特性（用户熟悉的 git 命令）
- ✅ **错误直观**：直接显示 git 的输出信息
- ✅ **性能平衡**：核心操作用 git 命令，状态检查用 git2 快速验证

### 技术栈

```toml
[dependencies]
clap = { version = "4", features = ["derive"] }  # CLI 命令解析
serde = { version = "1", features = ["derive"] } # 序列化
serde_yaml = "0.9"                                # YAML 配置文件
git2 = { version = "0.18", features = ["vendored"] } # Git 辅助功能
anyhow = "1"                                      # 错误处理
thiserror = "1"                                   # 自定义错误类型
```

## 开发计划

- [ ] 项目结构搭建（Cargo 配置、基础模块）
- [ ] CLI 命令解析（clap）
- [ ] 配置文件解析（serde_yaml）
- [ ] 核心命令实现（init、clone、pull、push）
- [ ] 状态检查功能（git2）
- [ ] Git Hooks 自动安装
- [ ] 测试与文档
- [ ] CI/CD 与发布流程