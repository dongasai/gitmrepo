# git mrepo sync2

从子仓库同步信息到配置文件。

## 用途

更新 `.gitmrepo` 配置文件中的模块信息，使其与实际的子仓库状态保持同步。

**核心场景**：
- 子仓库切换了分支，需要更新配置文件中的分支记录
- 子仓库添加了新的远程，需要更新配置文件中的 URL
- 配置文件信息过时，需要重新同步

## 使用方法

```bash
git mrepo sync2 [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 同步所有模块 |

## 使用示例

### 同步所有模块

```bash
git mrepo sync2

# 输出：
🔄 从子仓库同步配置信息...

[auth-service] modules/auth:
  当前分支: develop (配置: main) → 已更新
  远程 URL: https://github.com/org/auth-service.git (一致)

[user-service] modules/user:
  当前分支: main (一致)
  远程 URL: https://github.com/org/new-user-service.git (配置: https://github.com/org/user-service.git) → 已更新

[config-lib] modules/config:
  当前分支: main (一致)
  远程 URL: https://github.com/org/config.git (一致)

✅ 同步完成
   更新: 2
   一致: 1
```

### 同步指定模块

```bash
git mrepo sync2 auth-service

# 输出：
🔄 从 auth-service 同步配置信息...

[auth-service] modules/auth:
  当前分支: develop (配置: main) → 已更新
  远程 URL: https://github.com/org/auth-service.git (一致)

✅ 同步完成
```

## 执行流程

```
┌─────────────┐
│ .gitmrepo   │ ← 配置文件（可能有过时信息）
│ modules:    │
│   auth:     │
│     branch: main  ← 过时
│     remote: url1  ← 过时
└─────┬───────┘
      │
      │ 遍历所有模块
      ↓
┌─────────────┐
│ modules/auth│ ← 实际子仓库
│ ├── .git/   │
└─────┬───────┘
      │
      │ 读取当前状态
      ↓
┌─────────────┐
│ 实际分支: develop  │ ← 从 .git/HEAD
│ 实际 URL: url2     │ ← 从 .git/config
└─────┬───────┘
      │
      │ 对比并更新配置
      ↓
┌─────────────┐
│ .gitmrepo   │ ← 更新后的配置
│   auth:     │
│     branch: develop ✓
│     remote: url2 ✓
└─────────────┘
```

## 实现原理

```rust
pub fn sync2(module: Option<String>) -> Result<()> {
    let config = Config::load(".gitmrepo")?;

    println!("🔄 从子仓库同步配置信息...");

    let modules = if let Some(name) = module {
        vec![config.find_module(&name)?]
    } else {
        config.modules.clone()
    };

    let mut updated_count = 0;
    let mut unchanged_count = 0;

    for module_config in &modules {
        println!("\n[{}] {}:", module_config.name, module_config.path);

        // 1. 打开子仓库
        let repo = git2::Repository::open(&module_config.path)?;

        // 2. 获取实际分支
        let actual_branch = repo.head()?
            .shorthand()
            .unwrap_or("unknown");

        // 3. 获取实际远程 URL
        let actual_url = repo.find_remote("origin")?
            .url()
            .unwrap_or("unknown");

        // 4. 对比并更新
        let mut needs_update = false;

        // 检查分支
        if actual_branch != module_config.branch {
            println!("  当前分支: {} (配置: {}) → 已更新",
                     actual_branch, module_config.branch);
            module_config.branch = actual_branch;
            needs_update = true;
        } else {
            println!("  当前分支: {} (一致)", actual_branch);
        }

        // 检查 URL
        if actual_url != module_config.remote {
            println!("  远程 URL: {} (配置: {}) → 已更新",
                     actual_url, module_config.remote);
            module_config.remote = actual_url;
            needs_update = true;
        } else {
            println!("  远程 URL: {} (一致)", actual_url);
        }

        if needs_update {
            updated_count += 1;
        } else {
            unchanged_count += 1;
        }
    }

    // 5. 保存配置文件
    config.save(".gitmrepo")?;

    println!("\n✅ 同步完成");
    println!("   更新: {}", updated_count);
    println!("   一致: {}", unchanged_count);

    Ok(())
}
```

## 同步内容

### 分支信息

```bash
# 从 .git/HEAD 读取
ref: refs/heads/develop

# 更新配置
modules:
  auth-service:
    branch: develop  ← 更新为当前实际分支
```

### 远程 URL

```bash
# 从 .git/config 读取
[remote "origin"]
    url = https://github.com/org/new-url.git

# 更新配置
modules:
  auth-service:
    remote: https://github.com/org/new-url.git  ← 更新为当前实际 URL
```

## 实用场景

### 子仓库切换分支后

```bash
# 在子仓库中切换分支
cd modules/auth
git checkout develop
cd ..

# 配置文件仍然记录 main 分支，需要同步
git mrepo sync2 auth-service

# 配置文件已更新：
#   auth-service.branch: develop
```

### 子仓库更换远程后

```bash
# 在子仓库中更换远程
cd modules/auth
git remote set-url origin https://github.com/org/new-auth.git
cd ..

# 配置文件仍然记录旧 URL，需要同步
git mrepo sync2 auth-service

# 配置文件已更新：
#   auth-service.remote: https://github.com/org/new-auth.git
```

### 配置文件损坏或手动修改后

```bash
# 配置文件可能手动编辑错误，需要重新同步
git mrepo sync2

# 从实际子仓库重新获取正确的信息
```

## 注意事项

- 只更新分支和 URL，不影响其他配置（如 auto_sync）
- 如果子仓库不是 Git 仓库，会报错
- 如果子仓库没有 origin 远程，会报错
- 会直接修改配置文件，建议先备份

## 与其他命令对比

| 命令 | 方向 | 作用 |
|------|------|------|
| `sync` | 配置 → 子仓库 | 根据配置 clone/pull 子仓库 |
| `sync2` | 子仓库 → 配置 | 根据子仓库更新配置 ✅ |

## 双向同步机制

```
┌─────────────┐
│ .gitmrepo   │ ← 配置文件（中心记录）
└─────┬───────┘
      │
      │ sync (配置 → 子仓库)
      ↓
┌─────────────┐
│ 子仓库       │ ← 实际 Git 仓库
│ (clone/pull)│
└─────┬───────┘
      │
      │ sync2 (子仓库 → 配置)
      ↓
┌─────────────┐
│ .gitmrepo   │ ← 更新后的配置
└─────────────┘
```

## 推荐工作流

```bash
# 子仓库切换分支
cd modules/auth
git checkout develop
cd ..
git mrepo sync2 auth-service  ← 更新配置文件

# 配置文件现在记录正确的分支，后续 sync 会同步到正确分支
git mrepo sync
```

## 错误处理

### 子仓库不是 Git 仓库

```bash
$ git mrepo sync2 auth-service
❌ modules/auth 不是 Git 仓库
```

### 没有 origin 远程

```bash
$ git mrepo sync2 auth-service
❌ modules/auth 没有 origin 远程
   请先添加远程：git remote add origin <url>
```