# git mrepo clone

克隆远程仓库并注册为模块仓库。

## 用途

克隆远程 Git 仓库到指定目录，自动注册到 `.gitmrepo` 配置文件，并更新 `.gitignore`。

## 使用方法

```bash
git mrepo clone <url> [dir] [-b <branch>]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `<url>` | 必需 | 远程仓库 URL | - |
| `[dir]` | 可选 | 目标目录路径 | 从 URL 推导（如 auth-service.git → auth-service） |
| `-b / --branch` | 可选 | 克隆的分支 | 远程仓库的默认分支（main/master） |

## 使用示例

### 基础用法

```bash
# 默认目录、默认分支
git mrepo clone https://github.com/org/auth-service.git
# → 克隆到 auth-service 目录（main 分支）

# 指定目录
git mrepo clone https://github.com/org/auth-service.git modules/auth
# → 克隆到 modules/auth 目录（main 分支）

# 指定分支
git mrepo clone https://github.com/org/auth-service.git -b develop
# → 克隆到 auth-service 目录（develop 分支）

# 完整参数
git mrepo clone https://github.com/org/auth-service.git modules/auth -b develop
# → 克隆到 modules/auth 目录（develop 分支）
```

## 执行流程

1. 解析参数（URL、目录、分支）
2. 执行 `git clone` 命令
3. 获取实际克隆的分支信息
4. 注册模块到 `.gitmrepo` 配置文件
5. 更新 `.gitignore`（忽略子仓库的 `.git`）

## 输出示例

```bash
$ git mrepo clone https://github.com/org/auth-service.git modules/auth -b develop
📥 克隆 https://github.com/org/auth-service.git 到 modules/auth ...
✅ 模块仓库已克隆并注册
   名称: auth-service
   目录: modules/auth
   远程: https://github.com/org/auth-service.git
   分支: develop
```

## 配置文件更新

```yaml
modules:
  auth-service:
    path: "modules/auth"
    remote: "https://github.com/org/auth-service.git"
    branch: "develop"
    auto_sync: false
```

## .gitignore 更新

```bash
# 自动添加
modules/auth/.git/
```

## 实现原理

```rust
pub fn clone(url: String, dir: Option<String>, branch: Option<String>) -> Result<()> {
    // 1. 确定目标目录
    let target_dir = dir.unwrap_or_else(|| extract_name_from_url(&url));

    // 2. 构建 git clone 命令
    let mut args = vec!["clone"];
    if let Some(b) = &branch {
        args.extend(["-b", b]);
    }
    args.extend([&url, &target_dir]);

    // 3. 执行克隆
    Command::new("git").args(&args).output()?;

    // 4. 获取实际分支
    let actual_branch = branch.unwrap_or_else(|| get_current_branch(&target_dir));

    // 5. 注册配置
    let config = Config::load_or_create(".gitmrepo")?;
    config.add_module(Module {
        name: extract_name_from_url(&url),
        path: target_dir.clone(),
        remote: url,
        branch: actual_branch,
        auto_sync: false,
    });

    // 6. 更新 .gitignore
    update_gitignore(&format!("{}/.git/", target_dir))?;

    Ok(())
}
```

## 注意事项

- 目录路径支持相对路径和绝对路径
- 如果目录已存在且非空，会报错
- 自动推导的目录名会去除 `.git` 后缀
- 克隆完成后立即注册，无需手动 `add`

## 与其他命令对比

- `clone`：克隆新仓库（目录不存在）
- `attach`：关联现有目录（目录已有文件但无 .git）
- `add`：注册已有 Git 仓库（目录已有 .git）