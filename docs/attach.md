# git mrepo attach

将现有普通目录关联到远程 Git 仓库。

## 用途

将一个已存在但非 Git 仓库的目录转换为 Git 仓库，关联到指定的远程仓库，并检查文件一致性。

**核心场景**：项目已有源代码目录，但需要将其变成 Git 仓库并关联到远程。

## 使用方法

```bash
git mrepo attach <url> [-b <branch>] <dir>
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `<url>` | 必需 | 远程仓库 URL | - |
| `<dir>` | 必需 | 目标目录路径（已存在） | - |
| `-b / --branch` | 可选 | 关联的分支 | 远程仓库的默认分支 |

## 使用示例

```bash
# 默认分支
git mrepo attach https://github.com/org/auth-service.git modules/auth

# 指定分支
git mrepo attach https://github.com/org/auth-service.git modules/auth -b develop
```

## 执行流程

```
┌─────────────┐
│ 远程仓库     │
│ (main分支)   │
└─────┬───────┘
      │ git clone (临时目录)
      ↓
┌─────────────┐
│ /tmp/auth   │
│ ├── .git/   │ ← Git对象库
│ ├── src/    │ ← Git版本的文件
└─────┬───────┘
      │ 复制 .git/ 目录
      ↓
┌─────────────┐
│ modules/auth│ ← 目标目录（已有文件）
│ ├── .git/   │ ← 新增：Git对象库
│ ├── src/    │ ← 已有：本地文件
└─────┬───────┘
      │ git status（检查一致性）
      ↓
┌─────────────┐
│ 文件一致？   │
│ ✓ clean     │ → 提示"文件一致"
│ ⚠ diff     │ → 显示差异
└─────────────┘
```

## 输出示例

### 文件一致

```bash
$ git mrepo attach https://github.com/org/auth-service.git modules/auth
🔗 关联目录 modules/auth 到远程仓库...
✅ 目录已关联
   远程: https://github.com/org/auth-service.git
   分支: main
   状态: 文件完全一致
```

### 文件有差异

```bash
$ git mrepo attach https://github.com/org/auth-service.git modules/auth -b develop
🔗 关联目录 modules/auth 到远程仓库...
⚠️  目录已关联，但有文件差异：
   远程: https://github.com/org/auth-service.git
   分支: develop
   状态: 有文件差异

   modified: src/auth.rs
   deleted: README.md
   new file: config.yml

💡 提示：请检查差异，确认后可以提交
```

## 实现原理

```rust
pub fn attach(url: String, branch: Option<String>, dir: String) -> Result<()> {
    // 1. 验证目录存在且非 Git 仓库
    if !Path::new(&dir).exists() {
        return Err(anyhow!("目录不存在: {}", dir));
    }
    if Path::new(&dir).join(".git").exists() {
        return Err(anyhow!("目录已是 Git 仓库，请使用 add 命令"));
    }

    // 2. 克隆到临时目录
    let temp_dir = tempfile::tempdir()?;
    let mut clone_args = vec!["clone", &url, temp_dir.path()];
    if let Some(b) = &branch {
        clone_args.extend(["-b", b]);
    }
    Command::new("git").args(&clone_args).output()?;

    // 3. 复制 .git 目录
    fs::copy(temp_dir.path().join(".git"), Path::new(&dir).join(".git"))?;

    // 4. 检查文件一致性
    let status_output = Command::new("git")
        .current_dir(&dir)
        .args(&["status", "--short"])
        .output()?;

    if status_output.stdout.is_empty() {
        println!("✅ 文件完全一致");
    } else {
        println!("⚠️  有文件差异:");
        println!("{}", String::from_utf8_lossy(&status_output.stdout));
    }

    // 5. 注册配置
    let actual_branch = branch.unwrap_or_else(|| get_current_branch(&dir));
    let config = Config::load_or_create(".gitmrepo")?;
    config.add_module(Module {
        name: extract_name_from_url(&url),
        path: dir.clone(),
        remote: url,
        branch: actual_branch,
        auto_sync: false,
    });

    // 6. 更新 .gitignore
    update_gitignore(&format!("{}/.git/", dir))?;

    Ok(())
}
```

## 文件一致性逻辑

**原理**：Git 对象库（`.git`）记录的是远程仓库的文件版本，工作目录是本地文件。

```bash
# Git 对象库版本（来自远程）
Git 记录: src/auth.rs = "版本 A"

# 本地文件版本（工作目录）
工作目录: src/auth.rs = "版本 A"

# git status 结果
对比: Git对象库 vs 工作目录
结果: 一致 → clean
```

```bash
# 如果本地文件不同
工作目录: src/auth.rs = "版本 B"

# git status 结果
对比: Git对象库 vs 工作目录
结果: modified: src/auth.rs
```

## 注意事项

- 目录必须存在且有内容（否则建议用 clone）
- 目录不能已经是 Git 仓库（否则用 add）
- 文件差异提示后，用户需要手动处理（提交或回退）
- 复制的 `.git` 包含完整的 Git 历史、分支、远程配置

## 与其他命令对比

- `clone`：克隆新仓库（目录不存在或为空）
- `attach`：关联现有目录（目录已有文件但无 .git）✅
- `add`：注册已有 Git 仓库（目录已有 .git）