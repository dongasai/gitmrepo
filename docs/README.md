# git-mrepo 命令文档索引

本目录包含 git-mrepo 所有子命令的详细文档。

## 核心机制文档

- **[.gitignore 自动更新机制](gitignore-mechanism.md)** - 核心原理：主仓库忽略子仓库的 .git 目录

## 核心命令

### 初始化与注册

- [init](init.md) - 初始化项目配置
- [clone](clone.md) - 克隆远程仓库并注册
- [attach](attach.md) - 关联现有目录到远程仓库
- [add](add.md) - 自动识别并注册已有 Git 仓库

### 状态查看

- [status](status.md) - 查看模块仓库状态

### Git 操作

- [pull / push / fetch](pull-push-fetch.md) - Git 基础操作命令（拉取、推送、获取）

### 同步操作

- [sync](sync.md) - 从配置文件同步所有模块仓库（clone + pull）
- [sync2](sync2.md) - 从子仓库同步信息到配置文件

## 待补充命令

以下命令文档将在后续补充：

- **branch** - 查看或管理模块仓库分支
- **commit** - 在模块仓库中创建提交
- **config** - 配置模块仓库参数
- **clean** - 清理模块仓库未跟踪文件
- **help** - 显示帮助信息
- **version** - 显示版本信息

## 命令分类

### 初始化命令

| 命令 | 适用场景 | 目录状态 |
|------|---------|---------|
| `init` | 首次使用 | Git 仓库根目录 |
| `clone` | 克隆新仓库 | 目录不存在或为空 |
| `attach` | 关联现有目录 | 有文件，无 .git |
| `add` | 注册已有仓库 | 有 .git |

### 状态命令

| 命令 | 范围 | 信息 |
|------|------|------|
| `status` | 模块仓库 | Git状态 + 未推送统计 |

### 同步命令

| 命令 | 方向 | 操作 |
|------|------|------|
| `sync` | 配置 → 子仓库 | clone + pull |
| `sync2` | 子仓库 → 配置 | 更新配置信息 |

### Git 操作命令

| 命令 | 作用 |
|------|------|
| `pull` | 拉取更新 |
| `push` | 推送变更 |
| `fetch` | 获取远程信息 |
| `branch` | 分支管理 |
| `commit` | 创建提交 |

### 维护命令

| 命令 | 作用 |
|------|------|
| `config` | 配置参数 |
| `clean` | 清理未跟踪文件 |

## 使用流程

### 新项目初始化

```bash
git clone <main-repo-url>
cd main-repo
git mrepo init
git mrepo sync
```

### 添加模块仓库

```bash
# 方式1：克隆新仓库
git mrepo clone <url> [dir] [-b <branch>]

# 方式2：关联现有目录
git mrepo attach <url> [-b <branch>] <dir>

# 方式3：注册已有仓库
git mrepo add <dir>
```

### 日常工作

```bash
# 查看状态
git mrepo status [module]

# 拉取更新
git mrepo pull [module]

# 推送变更
git mrepo push [module]
```

### 同步配置

```bash
# 同步所有模块
git mrepo sync

# 更新配置文件
git mrepo sync2 [module]
```

## 文档结构

每个命令文档包含以下内容：

1. **用途**：命令的核心功能和适用场景
2. **使用方法**：命令语法和参数说明
3. **参数表格**：详细的参数列表和默认值
4. **使用示例**：实际使用场景和输出示例
5. **执行流程**：命令的内部执行逻辑（流程图）
6. **实现原理**：关键代码实现（Rust）
7. **注意事项**：使用限制和最佳实践
8. **命令对比**：与相关命令的区别

## 阅读建议

- 新用户：从 [init](init.md) 和 [sync](sync.md) 开始
- 管理模块：阅读 [clone](clone.md)、[attach](attach.md)、[add](add.md)
- 日常工作：查看 [status](status.md)、[pull](未完成)、[push](未完成)
- 配置维护：了解 [sync](sync.md) 和 [sync2](sync2.md) 的双向同步机制