# .gitignore 自动更新机制

## 核心原理

git-mrepo 的核心机制：**主仓库通过忽略子仓库的 `.git` 目录实现双重管理**。

```
主仓库
├── modules/
│   ├── auth/
│   │   ├── .git/          ← 主仓库忽略这个目录
│   │   ├── src/           ← 主仓库跟踪这些文件
│   │   └── README.md      ← 主仓库跟踪这些文件
│   └── user/
│   │   ├── .git/          ← 主仓库忽略这个目录
│   │   └── src/           ← 主仓库跟踪这些文件
├── .gitignore             ← 自动更新，忽略子仓库的 .git
├── .gitmrepo              ← 项目配置（应该提交）
```

---

## 自动更新时机

以下命令会自动更新主仓库的 `.gitignore`：

### 1. `git mrepo clone <url> [dir]`

克隆新模块仓库后：

```bash
$ git mrepo clone https://github.com/org/auth-service.git modules/auth

# 自动更新 .gitignore：
modules/auth/.git/
```

### 2. `git mrepo attach <url> <dir>`

关联现有目录后：

```bash
$ git mrepo attach https://github.com/org/auth-service.git modules/auth

# 自动更新 .gitignore：
modules/auth/.git/
```

### 3. `git mrepo add <dir>`

注册已有 Git 仓库后：

```bash
$ git mrepo add modules/auth

# 自动更新 .gitignore：
modules/auth/.git/
```

### 4. `git mrepo sync2`

从子仓库同步配置时，如果有新的子仓库：

```bash
$ git mrepo sync2

# 如果发现新的子仓库，自动更新 .gitignore
modules/new-module/.git/
```

---

## .gitignore 格式

### 自动生成的 .gitignore

```gitignore
# Rust 编译产物
target/
**/*.rs.bk

# IDE 和编辑器
.idea/
.vscode/

# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）
modules/auth/.git/
modules/user/.git/
modules/config/.git/
```

### 分组特点

- ✅ **清晰分组**：git-mrepo 条目单独分组，带注释说明
- ✅ **避免重复**：不会重复添加已存在的条目
- ✅ **批量支持**：支持一次添加多个子模块

---

## 工具函数实现

### 单个模块更新

[src/utils/gitignore.rs](../src/utils/gitignore.rs):

```rust
/// 更新主仓库的 .gitignore，忽略子模块的 .git 目录
pub fn update_gitignore_for_module(root: &str, module_path: &str) -> Result<()> {
    let gitignore_path = Path::new(root).join(".gitignore");
    let git_ignore_entry = format!("{}.git/", module_path);

    // 如果 .gitignore 不存在，创建新的
    if !gitignore_path.exists() {
        let content = format!(
            "# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n{}\n",
            git_ignore_entry
        );
        fs::write(&gitignore_path, content)?;
        return Ok(());
    }

    // 读取现有 .gitignore
    let content = fs::read_to_string(&gitignore_path)?;

    // 检查是否已包含
    if content.contains(&git_ignore_entry) {
        return Ok(()); // 已经忽略
    }

    // 添加新条目
    let new_content = format!("{}\n{}", content, git_ignore_entry);
    fs::write(&gitignore_path, new_content)?;

    Ok(())
}
```

### 批量模块更新

```rust
/// 批量更新主仓库的 .gitignore
pub fn update_gitignore_for_modules(root: &str, module_paths: &[String]) -> Result<()> {
    for module_path in module_paths {
        update_gitignore_for_module(root, module_path)?;
    }
    Ok(())
}
```

---

## 使用示例

### clone 命令实现（待完成）

```rust
pub fn execute(url: String, dir: Option<String>, branch: Option<String>) -> Result<()> {
    let root = get_git_root()?;

    // 1. 推导默认目录
    let module_path = dir.unwrap_or_else(|| derive_dir_from_url(&url));

    // 2. 执行 git clone
    let branch = branch.unwrap_or("main");
    Command::new("git")
        .args(&["clone", "-b", &branch, &url, &module_path])
        .output()?;

    // 3. 注册到 .gitmrepo
    let config = Config::load(".gitmrepo")?;
    config.add_module(Module {
        name: derive_module_name(&module_path),
        path: module_path.clone(),
        remote: url,
        branch: branch,
        auto_sync: None,
    });
    config.save(".gitmrepo")?;

    // 4. 更新 .gitignore
    update_gitignore_for_module(&root, &module_path)?;

    println!("✅ 已克隆模块仓库到 {}", module_path);
    println!("✅ 已更新 .gitignore（忽略 {}.git/）", module_path);

    Ok(())
}
```

### add 命令实现（待完成）

```rust
pub fn execute(dir: String) -> Result<()> {
    let root = get_git_root()?;

    // 1. 检查是否为 Git 仓库
    let repo = git2::Repository::open(&dir)?;

    // 2. 自动识别 URL 和分支
    let remote = repo.find_remote("origin")?;
    let url = remote.url().unwrap_or("unknown");
    let head = repo.head()?;
    let branch = head.shorthand().unwrap_or("unknown");

    // 3. 注册到 .gitmrepo
    let config = Config::load(".gitmrepo")?;
    config.add_module(Module {
        name: derive_module_name(&dir),
        path: dir.clone(),
        remote: url.to_string(),
        branch: branch.to_string(),
        auto_sync: None,
    });
    config.save(".gitmrepo")?;

    // 4. 更新 .gitignore
    update_gitignore_for_module(&root, &dir)?;

    println!("✅ 已注册模块仓库 {}", dir);
    println!("✅ 已更新 .gitignore（忽略 {}.git/）", dir);

    Ok(())
}
```

---

## 注意事项

### 1. 不要手动编辑

git-mrepo 条目由工具自动管理，不建议手动编辑：

- ✅ 自动添加：clone/add/attach/sync2 命令自动添加
- ✅ 自动去重：不会重复添加已存在的条目
- ✅ 清晰分组：git-mrepo 条目单独分组

### 2. .gitmrepo 不应该忽略

**重要**：`.gitmrepo` 配置文件应该提交到主仓库：

```gitignore
# ❌ 错误：不要忽略 .gitmrepo
.gitmrepo

# ✅ 正确：忽略子仓库的 .git 目录
modules/auth/.git/
modules/user/.git/
```

### 3. 路径格式

git-mrepo 使用相对路径：

```gitignore
# 正确格式（相对路径）
modules/auth/.git/

# 错误格式（绝对路径）
/data/project/modules/auth/.git/
```

---

## 工作流程

### 新项目初始化

```bash
# 1. 初始化配置
git mrepo init

# 2. 克隆模块仓库
git mrepo clone https://github.com/org/auth-service.git
# .gitignore 自动添加：auth-service/.git/

# 3. 提交配置
git add .gitmrepo .gitignore
git commit -m "初始化 git-mrepo 配置"
git push
```

### 新成员加入

```bash
# 1. 克隆主仓库
git clone https://github.com/org/main-project.git
cd main-project

# 2. 配置文件已存在（团队成员共享）
cat .gitmrepo  # 包含所有模块配置

# 3. .gitignore 已存在（包含所有子模块 .git 忽略）
cat .gitignore

# 4. 一键同步所有模块
git mrepo sync
```

---

## 核心价值

### 双重管理机制

```
┌─────────────┐
│ 主仓库       │ ← 通过 .gitignore 忽略子仓库的 .git
│ (main)      │   但跟踪子仓库的文件
└─────┬───────┘
      │
      │ modules/auth/.git/ (被忽略)
      ↓
┌─────────────┐
│ 子仓库       │ ← 在子目录独立管理 Git 状态
│ (auth)      │   有自己的 .git 目录
└─────────────┘
```

**效果**：
- ✅ 主仓库：跟踪所有文件（包括子仓库文件）
- ✅ 子仓库：独立管理 Git 历史、分支、提交
- ✅ 双重管理：同一文件被两个仓库管理

---

## 总结

**git-mrepo 的核心机制**：
1. 主仓库忽略子仓库的 `.git` 目录
2. 主仓库跟踪子仓库的文件
3. 子仓库独立管理 Git 状态
4. 自动更新 `.gitignore`，无需手动维护

**自动化时机**：clone、add、attach、sync2 命令都会自动更新 `.gitignore`。