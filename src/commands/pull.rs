use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use std::path::Path;

/// 拉取模块仓库更新
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

    println!("🔄 拉取模块仓库更新...");

    for module in modules {
        println!("\n[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            println!("  ⚠️  目录不存在，需要克隆");
            println!("     请执行: git mrepo clone {} -b {}", module.remote, module.branch);
            continue;
        }

        // 执行 git pull
        let output = std::process::Command::new("git")
            .current_dir(&module.path)
            .args(&["pull", "origin", &module.branch])
            .output()
            .context("执行 git pull 失败")?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("Already up to date") || stdout.contains("Already up-to-date") {
                println!("  ✅ 已经是最新的");
            } else {
                println!("  ✅ 已更新");
            }
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("  ❌ {}", stderr);
        }
    }

    Ok(())
}