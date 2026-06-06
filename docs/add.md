# git mrepo add

自动识别并注册已存在的 Git 仓库。

## 用途

将一个已经是 Git 仓库的目录注册到 `.gitmrepo` 配置文件，**自动识别**远程 URL 和当前分支。

**核心特性**：无需手动输入信息，从 `.git` 配置中自动提取。

## 使用方法

```bash
git mrepo add <dir>
```

## 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `<dir>` | 必需 | Git 仓库目录路径（必须有 .git） |

**注意**：URL 和分支参数会自动识别，无需手动输入。

## 使用示例

```bash
# 注册已有 Git 仓库
git mrepo add modules/auth

# 输出：
🔍 检测到模块仓库信息：
   远程 URL: https://github.com/org/auth-service.git
   当前分支: develop

✅ 已注册模块仓库
   名称: auth-service
   目录: modules/auth
   远程: https://github.com/org/auth-service.git
   分支: develop
```

## 执行流程

```
┌─────────────┐
│ modules/auth│
│ ├── .git/   │ ← 已有 Git 仓库
│ ├── src/    │
└─────┬───────┘
      │
      │ 打开 .git/config
      ↓
┌─────────────┐
│ Git配置      │
│ [remote.origin] │
│   url = https://github.com/org/auth-service.git
└─────┬───────┘
      │
      │ 打开 .git/HEAD
      ↓
┌─────────────┐
│ Git HEAD     │
│ ref: refs/heads/develop
└─────┬───────┘
      │
      │ 自动注册
      ↓
┌─────────────┐
│ .gitmrepo    │
│ modules:     │
│   auth-service: │
│     path: modules/auth
│     remote: https://github.com/...
│     branch: develop
└─────────────┘
```

## 自动识别逻辑

### 读取远程 URL

```bash
# 从 .git/config 中读取
[remote "origin"]
    url = https://github.com/org/auth-service.git
    fetch = +refs/heads/*:refs/remotes/origin/*

# 提取 URL
→ https://github.com/org/auth-service.git
```

### 读取当前分支

```bash
# 从 .git/HEAD 中读取
ref: refs/heads/develop

# 提取分支名
→ develop
```

## 实现原理

```rust
pub fn add(dir: String) -> Result<()> {
    // 1. 验证目录
    if !Path::new(&dir).exists() {
        return Err(anyhow!("目录不存在: {}", dir));
    }

    if !Path::new(&dir).join(".git").exists() {
        return Err(anyhow!("目录不是 Git 仓库（没有 .git）"));
    }

    // 2. 打开仓库
    let repo = git2::Repository::open(&dir)?;

    // 3. 自动获取远程 URL
    let remote = repo.find_remote("origin")
        .map_err(|_| anyhow!(
            "仓库没有 origin 远程\n请先添加远程：git remote add origin <url>"
        ))?;

    let url = remote.url()
        .ok_or_else(|| anyhow!("无法获取远程 URL"))?;

    // 4. 自动获取当前分支
    let branch = repo.head()
        .map_err(|_| anyhow!("无法获取当前分支（可能是空仓库）"))?
        .shorthand()
        .unwrap_or("main");

    // 5. 注册到配置文件
    let config = Config::load_or_create(".gitmrepo")?;
    let module_name = extract_name_from_url(url);

    config.add_module(Module {
        name: module_name.clone(),
        path: dir.clone(),
        remote: url.to_string(),
        branch: branch.to_string(),
        auto_sync: false,
    });

    // 6. 更新 .gitignore
    update_gitignore(&format!("{}/.git/", dir))?;

    println!("✅ 已注册模块仓库");
    println!("   名称: {}", module_name);
    println!("   目录: {}", dir);
    println!("   远程: {}", url);
    println!("   分支: {}", branch);

    Ok(())
}
```

## 错误处理

### 没有 origin 远程

```bash
$ git mrepo add modules/local-lib
❌ 仓库没有 origin 远程
   请先添加远程：git remote add origin <url>
```

### 不是 Git 仓库

```bash
$ git mrepo add modules/new-dir
❌ 目录不是 Git 仓库（没有 .git）
   请使用以下命令之一：
   - git mrepo clone <url> modules/new-dir  （克隆新仓库）
   - git mrepo attach <url> modules/new-dir （关联现有目录）
```

## 注意事项

- 必须有 `origin` 远程配置
- 如果有多个远程，默认使用 `origin`（未来可扩展支持选择其他远程）
- 自动识别的信息与 Git 配置完全一致，不会出错
- 注册后会自动更新 `.gitignore`

## 与其他命令对比

| 命令 | 适用场景 | 目录状态 |
|------|---------|---------|
| `clone` | 克隆新仓库 | 不存在或为空 |
| `attach` | 关联现有目录 | 有文件，无 .git |
| `add` | 注册已有仓库 | 有 .git ✅ |

## 推荐工作流

```bash
# 方式 1：已有 Git 仓库
cd modules/auth
git init
git remote add origin https://github.com/org/auth-service.git
cd ../..
git mrepo add modules/auth  ← 自动识别注册

# 方式 2：克隆后自动注册
git mrepo clone https://github.com/org/auth-service.git modules/auth
# （clone 已自动注册，无需再执行 add）

# 方式 3：普通目录转 Git仓库
git mrepo attach https://github.com/org/auth-service.git modules/auth
# （attach 已自动注册，无需再执行 add）
```