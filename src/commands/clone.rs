use crate::config::{Config, Module};
use crate::utils::{get_git_root, update_gitignore_for_module};
use anyhow::{Context, Result};
use std::path::Path;

/// 克隆模块仓库并注册到配置文件
pub fn execute(url: String, dir: Option<String>, branch: Option<String>) -> Result<()> {
    let root = get_git_root()?;

    // 1. 推导默认目录名（从 URL）
    let module_path = dir.unwrap_or_else(|| derive_dir_from_url(&url));

    // 2. 检查目录是否已存在
    if Path::new(&module_path).exists() {
        anyhow::bail!("目录已存在: {}", module_path);
    }

    // 3. 推导模块名称
    let module_name = derive_module_name(&module_path);

    // 4. 获取分支（默认 main）
    let branch = branch.unwrap_or_else(|| {
        // TODO: 从远程仓库获取默认分支
        // 当前简化实现：使用 main
        "main".to_string()
    });

    println!("🔄 克隆模块仓库...");
    println!("   URL: {}", url);
    println!("   目录: {}", module_path);
    println!("   分支: {}", branch);

    // 5. 执行 git clone
    let output = std::process::Command::new("git")
        .args(&["clone", "-b", &branch, &url, &module_path])
        .output()
        .context("执行 git clone 失败")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("克隆失败: {}", stderr);
    }

    println!("✅ 已克隆到 {}", module_path);

    // 6. 加载或创建配置文件
    let config_path = Path::new(&root).join(".gitmrepo");
    let mut config = if config_path.exists() {
        Config::load(&config_path)?
    } else {
        println!("⚠️  .gitmrepo 不存在，创建新配置文件");
        Config::new()
    };

    // 7. 注册模块到配置文件
    let module = Module {
        name: module_name.clone(),
        path: module_path.clone(),
        remote: url.clone(),
        branch: branch.clone(),
        auto_sync: None,
    };

    config.add_module(module);
    config.save(&config_path)?;

    println!("✅ 已注册到 .gitmrepo");

    // 8. 更新 .gitignore（忽略子模块的 .git 目录）
    update_gitignore_for_module(&root, &module_path)?;

    println!("✅ 已更新 .gitignore（忽略 {}.git/）", module_path);

    println!("\n💡 后续操作:");
    println!("   git mrepo status {}         查看模块状态", module_name);
    println!("   cd {} && git log            查看提交历史", module_path);

    Ok(())
}

/// 从 URL 推导默认目录名
///
/// 示例：
/// - https://github.com/org/auth-service.git → auth-service
/// - git@github.com:org/user-service.git → user-service
/// - https://github.com/org/config-lib → config-lib
fn derive_dir_from_url(url: &str) -> String {
    // 提取最后一部分
    let last_part = url
        .split('/')
        .last()
        .unwrap_or(url);

    // 移除 .git 后缀
    let dir = last_part.replace(".git", "");

    // 如果 URL 是 git@github.com:org/repo.git 格式
    if dir.contains(':') {
        dir.split(':')
            .last()
            .unwrap_or(&dir)
            .replace(".git", "")
    } else {
        dir
    }
}

/// 从路径推导模块名称
///
/// 示例：
/// - modules/auth → auth
/// - auth-service → auth-service
/// - libs/config → config
fn derive_module_name(path: &str) -> String {
    // 如果路径包含 /，取最后一部分
    if path.contains('/') {
        path.split('/')
            .last()
            .unwrap_or(path)
            .to_string()
    } else {
        path.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_dir_from_url() {
        // HTTPS URL
        let url = "https://github.com/org/auth-service.git";
        let dir = derive_dir_from_url(url);
        assert_eq!(dir, "auth-service");

        // HTTPS URL without .git
        let url = "https://github.com/org/user-service";
        let dir = derive_dir_from_url(url);
        assert_eq!(dir, "user-service");

        // SSH URL
        let url = "git@github.com:org/config-lib.git";
        let dir = derive_dir_from_url(url);
        assert_eq!(dir, "config-lib");

        // 复杂路径
        let url = "https://github.com/org/project-modules/auth.git";
        let dir = derive_dir_from_url(url);
        assert_eq!(dir, "auth");
    }

    #[test]
    fn test_derive_module_name() {
        // 带路径
        let path = "modules/auth";
        let name = derive_module_name(path);
        assert_eq!(name, "auth");

        // 不带路径
        let path = "auth-service";
        let name = derive_module_name(path);
        assert_eq!(name, "auth-service");

        // 多层路径
        let path = "libs/shared/config";
        let name = derive_module_name(path);
        assert_eq!(name, "config");
    }
}