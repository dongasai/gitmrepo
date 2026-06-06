use crate::config::Config;
use crate::utils::{get_git_root, count_unpushed_commits};
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 推送模块仓库变更
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 检查配置文件是否存在
    if !config_path.exists() {
        println!("⚠️  .gitmrepo 配置文件不存在");
        println!("   请先执行: git mrepo init");
        return Ok(());
    }

    // 加载配置
    let config = Config::load(&config_path)?;

    // 确定要操作的模块
    let modules = if let Some(name_or_path) = module {
        vec![config.find_module(&name_or_path)?.clone()]
    } else {
        if config.modules.is_empty() {
            println!("⚠️  未注册任何模块仓库");
            return Ok(());
        }
        config.modules.values().cloned().collect()
    };

    println!("🔄 推送模块仓库变更...");

    for module in modules {
        println!("\n[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            println!("  ⚠️  目录不存在");
            continue;
        }

        // 检查未推送提交
        let repo = Repository::open(&module.path)
            .context("无法打开 Git 仓库")?;

        let unpushed_count = count_unpushed_commits(&repo, &module.branch)?;

        if unpushed_count == 0 {
            println!("  ✅ 没有需要推送的提交");
            continue;
        }

        println!("  未推送提交: {}", unpushed_count);

        // 执行 git push
        let output = std::process::Command::new("git")
            .current_dir(&module.path)
            .args(&["push", "origin", &module.branch])
            .output()
            .context("执行 git push 失败")?;

        if output.status.success() {
            println!("  ✅ 已推送 {} 个提交", unpushed_count);
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("  ❌ {}", stderr);
        }
    }

    Ok(())
}