use crate::config::{Config, Module};
use crate::utils::{get_git_root, update_gitignore_for_module};
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 自动识别并注册已存在的 Git 仓库
pub fn execute(dir: String) -> Result<()> {
    let root = get_git_root()?;

    // 1. 检查目录是否存在
    if !Path::new(&dir).exists() {
        anyhow::bail!("目录不存在: {}", dir);
    }

    // 2. 检查是否为 Git 仓库
    let repo = Repository::open(&dir)
        .context("目录不是 Git 仓库")?;

    println!("🔍 自动识别 Git 仓库信息...");

    // 3. 自动识别 URL（从 origin 远程）
    let remote = repo.find_remote("origin")
        .context("找不到 origin 远程，请先添加远程仓库")?;
    let url = remote.url()
        .context("无法获取远程 URL")?;

    println!("   URL: {}", url);

    // 4. 自动识别当前分支（从 HEAD）
    let head = repo.head()
        .context("无法读取 HEAD")?;
    let branch = head.shorthand()
        .context("无法获取分支名称")?;

    println!("   分支: {}", branch);

    // 5. 推导模块名称
    let module_name = derive_module_name(&dir);

    println!("   名称: {}", module_name);

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
        path: dir.clone(),
        remote: url.to_string(),
        branch: branch.to_string(),
        auto_sync: None,
    };

    config.add_module(module);
    config.save(&config_path)?;

    println!("✅ 已注册到 .gitmrepo");

    // 8. 更新 .gitignore（忽略子模块的 .git 目录）
    update_gitignore_for_module(&root, &dir)?;

    println!("✅ 已更新 .gitignore（忽略 {}.git/）", dir);

    println!("\n💡 后续操作:");
    println!("   git mrepo status {}         查看模块状态", module_name);
    println!("   git mrepo pull {}           拉取远程更新", module_name);

    Ok(())
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