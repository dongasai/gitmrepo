# git mrepo status

查看模块仓库的 Git 状态。

## 用途

显示所有或指定模块仓库的 Git 状态信息，包括分支、未提交改动、未推送提交等。

## 使用方法

```bash
git mrepo status [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 显示所有模块 |

**智能识别**：
- 支持模块名称：`auth-service`
- 支持路径：`modules/auth` 或 `./modules/auth`

## 使用示例

### 查看所有模块状态

```bash
git mrepo status

# 输出：
[auth-service] modules/auth:
  分支: develop
  未提交改动:
    modified: src/auth.rs
    deleted: README.md
  未推送提交: 3

[user-service] modules/user:
  分支: main
  状态: clean ✓

[config-lib] modules/config:
  分支: main
  未跟踪文件: 2 files
```

### 查看指定模块状态

```bash
# 使用名称
git mrepo status auth-service

# 使用路径
git mrepo status modules/auth

# 输出：
[auth-service] modules/auth:
  分支: develop
  未提交改动:
    modified: src/auth.rs
    deleted: README.md
  未推送提交: 3
```

## 状态信息说明

### 分支信息

```bash
分支: develop
```
当前模块仓库所在的分支名称。

### 未提交改动

```bash
未提交改动:
  modified: src/auth.rs      ← 已修改
  deleted: README.md         ← 已删除
  new file: config.yml       ← 新文件（未跟踪）
```

### 未推送提交

```bash
未推送提交: 3
```
本地有 3 个提交尚未推送到远程。

### Clean状态

```bash
状态: clean ✓
```
没有未提交改动，工作目录干净。

## 执行流程

```rust
pub fn status(module: Option<String>) -> Result<()> {
    let config = Config::load(".gitmrepo")?;

    // 确定要查看的模块列表
    let modules = if let Some(name) = module {
        vec![config.find_module(&name)?]
    } else {
        config.modules.clone()
    };

    for module in modules {
        println!("[{}] {}:", module.name, module.path);

        // 1. 查看分支
        let branch_output = Command::new("git")
            .current_dir(&module.path)
            .args(&["branch", "--show-current"])
            .output()?;

        println!("  分支: {}", String::from_utf8_lossy(&branch_output.stdout));

        // 2. 查看状态
        let status_output = Command::new("git")
            .current_dir(&module.path)
            .args(&["status", "--short"])
            .output()?;

        if status_output.stdout.is_empty() {
            println!("  状态: clean ✓");
        } else {
            println!("  未提交改动:");
            println!("{}", String::from_utf8_lossy(&status_output.stdout));
        }

        // 3. 查看未推送提交（使用 git2）
        let repo = git2::Repository::open(&module.path)?;
        let unpushed = count_unpushed_commits(&repo)?;

        if unpushed > 0 {
            println!("  未推送提交: {}", unpushed);
        }
    }

    Ok(())
}

fn count_unpushed_commits(repo: &git2::Repository) -> Result<usize> {
    let head = repo.head()?;
    let local_oid = head.target()?;

    let remote = repo.find_remote("origin")?;
    let remote_branch = repo.find_branch(
        &format!("origin/{}", head.shorthand()?),
        BranchType::Remote
    )?;
    let remote_oid = remote_branch.get().target()?;

    let mut revwalk = repo.revwalk()?;
    revwalk.push(local_oid)?;
    revwalk.hide(remote_oid)?;

    Ok(revwalk.count())
}
```

## 配置影响

`.gitmrepo` 配置文件中的 `show_all_modules_in_status` 选项：

```yaml
settings:
  show_all_modules_in_status: true   # 默认显示所有模块
  show_all_modules_in_status: false  # 需要指定模块名称
```

```bash
# show_all_modules_in_status: false 时
git mrepo status
# 输出：
❌ 未指定模块名称
用法: git mrepo status <module-name>
      git mrepo status --all  # 查看所有模块

git mrepo status --all  # 显式查看所有模块
```

## 输出格式选项（未来扩展）

```bash
# JSON 格式（便于脚本处理）
git mrepo status --format json

# 简洁格式
git mrepo status --short
```

## 注意事项

- 如果配置文件中没有模块，会提示"未注册模块"
- 模块目录不存在会报错
- 模块不是 Git 仓库会报错
- 状态信息来自实际的 Git 仓库，与配置文件独立

## 实用场景

### 快速检查所有模块

```bash
# 开发前检查所有模块状态
git mrepo status

# 确认哪些模块需要提交/推送
```

### 检查特定模块

```bash
# 检查 auth-service 模块
git mrepo status auth-service

# 确认改动后推送
git mrepo push auth-service
```

## 与原生 git status 的区别

| 命令 | 范围 | 信息 |
|------|------|------|
| `git status` | 主仓库 | 主仓库文件状态 |
| `git mrepo status` | 模块仓库 | 模块仓库状态 + 未推送统计 |

**设计理念**：分层管理，主仓库和模块仓库独立查看状态。