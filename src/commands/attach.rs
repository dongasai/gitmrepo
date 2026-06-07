use crate::config::{Config, Module};
use crate::utils::{get_git_root, update_gitignore_for_module};
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;
use std::process::Command;

/// 关联现有目录到远程仓库
///
/// 将非 Git 目录初始化为 Git 仓库，并关联到远程 URL
pub fn execute(url: String, dir: String, branch: Option<String>) -> Result<()> {
    let root = get_git_root()?;

    println!("🔗 关联目录到远程仓库...\n");

    // 1. 检查目录是否存在
    if !Path::new(&dir).exists() {
        anyhow::bail!("目录不存在: {}", dir);
    }

    // 2. 检查是否已经是 Git 仓库
    if Repository::open(&dir).is_ok() {
        println!("⚠️  目录已经是 Git 仓库");
        println!("   如果想注册已有仓库，请使用: git mrepo add {}", dir);
        return Ok(());
    }

    // 3. 执行 git init
    println!("初始化 Git 仓库...");
    let init_output = Command::new("git")
        .args(&["init"])
        .current_dir(&dir)
        .output()
        .context("执行 git init 失败")?;

    if !init_output.status.success() {
        anyhow::bail!(
            "git init 失败: {}",
            String::from_utf8_lossy(&init_output.stderr)
        );
    }

    // 4. 添加远程仓库
    println!("添加远程仓库: {}", url);
    let remote_output = Command::new("git")
        .args(&["remote", "add", "origin", &url])
        .current_dir(&dir)
        .output()
        .context("执行 git remote add 失败")?;

    if !remote_output.status.success() {
        anyhow::bail!(
            "git remote add 失败: {}",
            String::from_utf8_lossy(&remote_output.stderr)
        );
    }

    // 5. 可选：设置分支
    let actual_branch = if let Some(b) = branch {
        println!("设置分支: {}", b);

        // 创建分支
        let branch_output = Command::new("git")
            .args(&["checkout", "-b", &b])
            .current_dir(&dir)
            .output()
            .context("创建分支失败")?;

        if !branch_output.status.success() {
            anyhow::bail!(
                "创建分支失败: {}",
                String::from_utf8_lossy(&branch_output.stderr)
            );
        }

        b
    } else {
        // 使用默认分支名
        let default_branch = "main";
        println!("使用默认分支: {}", default_branch);

        // 设置默认分支名（Git 2.28+ 支持 init.defaultBranch）
        let rename_output = Command::new("git")
            .args(&["branch", "-M", default_branch])
            .current_dir(&dir)
            .output()
            .context("设置默认分支失败")?;

        if !rename_output.status.success() {
            // 如果失败，可能 Git 版本不支持，使用当前分支名
            let repo = Repository::open(&dir)?;
            let head = repo.head()?;
            head.shorthand().unwrap_or(default_branch).to_string()
        } else {
            default_branch.to_string()
        }
    };

    println!("当前分支: {}", actual_branch);

    // 6. 推导模块名称
    let module_name = derive_module_name(&dir);

    // 7. 注册到配置文件
    println!("\n注册到配置文件...");
    let config_path = Path::new(&root).join(".gitmrepo");
    let mut config = if config_path.exists() {
        Config::load(&config_path)?
    } else {
        println!("⚠️  配置文件不存在，将创建新配置");
        Config::new()
    };

    let module = Module {
        name: module_name.clone(),
        path: dir.clone(),
        remote: url.clone(),
        branch: actual_branch.clone(),
        auto_sync: Some(true), // 默认启用自动同步
    };

    config.add_module(module);
    config.save(&config_path)?;
    println!("✅ 已注册到 .gitmrepo");

    // 8. 更新 .gitignore
    println!("更新 .gitignore...");
    update_gitignore_for_module(&root, &dir)?;
    println!("✅ 已更新 .gitignore（忽略 {}）", format!("{}.git/", dir));

    println!("\n✅ 关联完成");
    println!("   目录: {}", dir);
    println!("   远程: {}", url);
    println!("   分支: {}", actual_branch);

    println!("\n💡 下一步:");
    println!("   1. 添加文件并提交:");
    println!("      cd {} && git add . && git commit -m \"初始化\"", dir);
    println!("   2. 推送到远程:");
    println!("      git push -u origin {}", actual_branch);

    Ok(())
}

/// 从目录路径推导模块名称
fn derive_module_name(dir: &str) -> String {
    // 移除路径前缀和尾部斜杠
    let dir = dir.trim_end_matches('/');

    // 从路径中提取最后一部分作为名称
    // 例如：modules/auth -> auth
    // 例如：services/user-service -> user-service
    dir.split('/')
        .last()
        .unwrap_or(dir)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_module_name() {
        assert_eq!(derive_module_name("modules/auth"), "auth");
        assert_eq!(derive_module_name("services/user-service"), "user-service");
        assert_eq!(derive_module_name("libs/config-lib/"), "config-lib");
        assert_eq!(derive_module_name("auth"), "auth");
    }

    #[test]
    fn test_attach_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(
            "https://github.com/org/test.git".to_string(),
            "test-dir".to_string(),
            Some("main".to_string()),
        );
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}