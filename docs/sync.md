# git mrepo sync

从配置文件同步所有模块仓库。

## 用途

根据 `.gitmrepo` 配置文件，自动同步（clone 或 pull）所有注册的模块仓库。

**核心场景**：
- 新成员克隆项目后，一键同步所有模块仓库
- 拉取最新项目代码后，同步更新所有模块

## 使用方法

```bash
git mrepo sync [--force]
```

## 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `--force` | 可选 | 强制同步，忽略未提交改动检查 |

## 使用示例

### 基础同步

```bash
# 新克隆项目后的首次同步
git clone https://github.com/org/main-project.git
cd main-project
git mrepo init  # 如果配置文件不存在
git mrepo sync

# 输出：
🔄 同步模块仓库...

[auth-service] modules/auth:
  目录不存在，执行 clone...
  ✅ 已克隆到 modules/auth (main 分支)

[user-service] modules/user:
  目录存在，执行 pull...
  ✅ 已更新 (3 commits pulled)

[config-lib] modules/config:
  ⚠️  有未提交改动，跳过更新
     请先提交或使用 --force 强制同步

✅ 同步完成
   成功: 2
   跳过: 1
```

### 强制同步

```bash
# 忽略未提交改动，强制更新
git mrepo sync --force

# 输出：
🔄 强制同步模块仓库...

[auth-service] modules/auth:
  ✅ 已更新

[user-service] modules/user:
  ⚠️  有未提交改动，强制更新可能丢失本地改动
  ✅ 已更新（未提交改动已暂存）

✅ 同步完成
```

## 执行流程

```
┌─────────────┐
│ .gitmrepo   │ ← 配置文件
│ modules:    │
│   - auth    │
│   - user    │
│   - config  │
└─────┬───────┘
      │
      │ 遍历所有模块
      ↓
┌─────────────┐
│ 模块目录检查 │
│ 存在？       │
└─────┬───────┘
      │
   存在│      不存在
      │         │
  pull↓        clone↓
      │         │
      ↓         ↓
┌─────────────┐
│ 同步完成     │
│ 统计结果     │
└─────────────┘
```

## 实现原理

```rust
pub fn sync(force: bool) -> Result<()> {
    let config = Config::load(".gitmrepo")?;

    if config.modules.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        return Ok(());
    }

    println!("🔄 同步模块仓库...");

    let mut success = 0;
    let mut skipped = 0;

    for module in &config.modules {
        println!("\n[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            // 目录不存在 → clone
            println!("  目录不存在，执行 clone...");
            clone_module(&module)?;
            success += 1;
        } else {
            // 目录存在 → pull
            if !force {
                // 检查未提交改动
                let repo = git2::Repository::open(&module.path)?;
                if has_uncommitted_changes(&repo)? {
                    println!("  ⚠️  有未提交改动，跳过更新");
                    println!("     请先提交或使用 --force 强制同步");
                    skipped += 1;
                    continue;
                }
            }

            println!("  目录存在，执行 pull...");
            pull_module(&module)?;
            success += 1;
        }
    }

    println!("\n✅ 同步完成");
    println!("   成功: {}", success);
    println!("   跳过: {}", skipped);

    Ok(())
}

fn clone_module(module: &Module) -> Result<()> {
    Command::new("git")
        .args(&["clone", "-b", &module.branch, &module.remote, &module.path])
        .output()?;

    println!("  ✅ 已克隆到 {} ({})", module.path, module.branch);
    Ok(())
}

fn pull_module(module: &Module) -> Result<()> {
    let output = Command::new("git")
        .current_dir(&module.path)
        .args(&["pull", "origin", &module.branch])
        .output()?;

    if output.status.success() {
        println!("  ✅ 已更新");
    } else {
        println!("  ❌ {}", String::from_utf8_lossy(&output.stderr));
    }

    Ok(())
}
```

## 同步策略

### 目录不存在

```bash
# 自动执行 clone
git clone -b <branch> <remote> <path>
```

### 目录存在

```bash
# 检查未提交改动（除非 --force）
git status

# 执行 pull
git pull origin <branch>
```

## 配置影响

模块配置中的 `auto_sync` 选项：

```yaml
modules:
  auth-service:
    auto_sync: true   # 自动同步（在主仓库 pull/checkout 时）
    auto_sync: false  # 手动同步（默认）
```

**注意**：`git mrepo sync` 命令会同步所有模块，不受 `auto_sync` 限制。

## 实用场景

### 新成员加入项目

```bash
# 步骤 1：克隆主仓库
git clone https://github.com/org/main-project.git
cd main-project

# 步骤 2：一键同步所有模块
git mrepo sync

# 完成！所有模块仓库都已就绪
```

### 拉取主仓库更新后

```bash
# 主仓库更新
git pull origin main

# 同步模块仓库（配置文件可能有变化）
git mrepo sync
```

### 定期同步所有模块

```bash
# 每天开始工作时同步
git mrepo sync

# 确保所有模块都是最新版本
```

## 注意事项

- 会同步配置文件中**所有**注册的模块
- 默认会跳过有未提交改动的模块（除非 `--force`）
- `--force` 可能丢失本地改动，谨慎使用
- 新克隆项目后，建议先执行 `sync`

## 与其他命令对比

| 命令 | 范围 | 操作 |
|------|------|------|
| `git mrepo pull <module>` | 单个模块 | pull |
| `git mrepo sync` | 所有模块 | clone + pull ✅ |

## 推荐工作流

```bash
# 新项目初始化
git clone <main-repo-url>
cd main-repo
git mrepo sync  ← 一键同步所有模块

# 日常工作
git pull origin main
git mrepo sync  ← 同步模块更新

# 提交前检查
git mrepo status
git mrepo push <module>
```