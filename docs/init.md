# git mrepo init

初始化 git-mrepo 项目配置。

## 用途

创建 `.gitmrepo` 配置文件，初始化模块仓库管理系统。

## 使用方法

```bash
git mrepo init
```

## 参数

无参数。

## 执行流程

1. 检查当前目录是否是 Git 仓库（必须有 `.git`）
2. 创建 `.gitmrepo` 配置文件（如果已存在则提示）
3. 初始化基础配置结构
4. 提示用户后续操作

## 输出示例

```bash
$ git mrepo init
✅ 已创建 .gitmrepo 配置文件
💡 提示：.gitmrepo 应提交到主仓库，让团队成员共享模块配置
```

## 配置文件结构

```yaml
version: '1.0'
modules: {}
settings:
  default_branch: main
  show_all_modules_in_status: true
  auto_ignore_git: true
```

## 注意事项

### .gitmrepo 应该提交

**重要**：.gitmrepo 是项目级别的配置文件，应该提交到主仓库：

- ✅ 记录项目的模块仓库配置（URL、路径、分支）
- ✅ 团队成员共享同样的模块配置
- ✅ 新成员克隆项目后，通过 `git mrepo sync` 一键同步所有模块

类比：
- `.gitmrepo` ≈ `package.json`（Node.js）- 项目依赖配置
- `.gitmrepo` ≈ `requirements.txt`（Python）- 项目依赖清单

**不要忽略 .gitmrepo！**

- 必须在 Git 仓库根目录执行
- 会自动更新 `.gitignore` 文件
- 如果已有配置文件，会提示是否覆盖

## 实现原理

```rust
pub fn init() -> Result<()> {
    // 1. 验证 Git 仓库
    if !Path::new(".git").exists() {
        return Err(anyhow!("当前目录不是 Git 仓库"));
    }

    // 2. 创建配置文件
    if Path::new(".gitmrepo").exists() {
        println!("⚠️  配置文件已存在，是否覆盖？[y/N]");
        // 用户确认逻辑...
    }

    let config = Config::default();
    config.save(".gitmrepo")?;

    // 3. 更新 .gitignore
    update_gitignore("modules/*/.git/")?;

    println!("✅ 初始化完成");
    Ok(())
}
```