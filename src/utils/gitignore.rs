use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

/// 更新主仓库的 .gitignore，忽略子模块的 .git 目录
///
/// ⚠️ **注意**: 此函数会修改用户仓库的 .gitignore 文件
///
/// # 参数
/// - `root`: 主仓库根目录
/// - `module_path`: 子模块相对路径（如 "modules/auth"）
///
/// # 示例
/// ```rust,ignore
/// update_gitignore_for_module("/path/to/main-repo", "modules/auth")?;
/// // .gitignore 会添加：modules/auth/.git/
/// ```
pub fn update_gitignore_for_module(root: &str, module_path: &str) -> Result<()> {
    let gitignore_path = Path::new(root).join(".gitignore");
    let git_ignore_entry_with_slash = format!("{}.git/", module_path);
    let git_ignore_entry_without_slash = format!("{}.git", module_path);

    // 如果 .gitignore 不存在，创建新的
    if !gitignore_path.exists() {
        let content = format!(
            "# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n{}\n",
            git_ignore_entry_with_slash
        );
        fs::write(&gitignore_path, content).context("创建 .gitignore 失败")?;
        return Ok(());
    }

    // 读取现有 .gitignore
    let content = fs::read_to_string(&gitignore_path).context("读取 .gitignore 失败")?;

    // 检查是否已包含该子模块的 .git 目录（检查带/和不带/两种形式）
    if content.contains(&git_ignore_entry_with_slash) || content.contains(&git_ignore_entry_without_slash) {
        // 已经忽略，无需重复添加
        return Ok(());
    }

    // 检查是否已有 git-mrepo 子模块注释区域
    if content.contains("# git-mrepo 子模块 .git 目录") {
        // 在现有区域添加新条目（处理文件末尾换行符）
        let new_content = if content.ends_with('\n') {
            format!("{}{}", content, git_ignore_entry_with_slash)
        } else {
            format!("{}\n{}", content, git_ignore_entry_with_slash)
        };
        fs::write(&gitignore_path, new_content).context("更新 .gitignore 失败")?;
    } else {
        // 创建新区域（处理文件末尾换行符）
        let new_content = if content.ends_with('\n') {
            format!(
                "{}\n# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n{}\n",
                content, git_ignore_entry_with_slash
            )
        } else {
            format!(
                "{}\n\n# git-mrepo 子模块 .git 目录（主仓库忽略子仓库的 Git 管理）\n{}\n",
                content, git_ignore_entry_with_slash
            )
        };
        fs::write(&gitignore_path, new_content).context("更新 .gitignore 失败")?;
    }

    Ok(())
}

/// 批量更新主仓库的 .gitignore，忽略多个子模块的 .git 目录
///
/// # 参数
/// - `root`: 主仓库根目录
/// - `module_paths`: 子模块相对路径列表
///
/// # 示例
/// ```rust,ignore
/// update_gitignore_for_modules("/path/to/main-repo", &["modules/auth", "modules/user"])?;
/// ```
pub fn update_gitignore_for_modules(root: &str, module_paths: &[String]) -> Result<()> {
    for module_path in module_paths {
        update_gitignore_for_module(root, module_path)?;
    }
    Ok(())
}

/// 获取 Git 仓库根目录
pub fn get_git_root() -> Result<String> {
    let output = std::process::Command::new("git")
        .args(&["rev-parse", "--show-toplevel"])
        .output()
        .context("执行 git 命令失败")?;

    if !output.status.success() {
        anyhow::bail!("当前目录不是 Git 仓库");
    }

    let root = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    Ok(root)
}