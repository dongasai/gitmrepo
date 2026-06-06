use crate::config::Config;
use crate::utils::{get_git_root, update_gitignore_for_modules, has_uncommitted_changes};
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 从配置文件同步所有模块仓库（clone + pull）
pub fn execute(force: bool) -> Result<()> {
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

    // 检查是否有模块
    if config.modules.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        println!("   请先执行: git mrepo clone 或 git mrepo add");
        return Ok(());
    }

    println!("🔄 同步模块仓库...");

    let mut success_count = 0;
    let mut skipped_count = 0;
    let mut new_modules_paths: Vec<String> = Vec::new();

    for module in config.modules.values() {
        println!("\n[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            // 目录不存在 → clone
            println!("  目录不存在，执行 clone...");

            if let Err(e) = clone_module(&module) {
                println!("  ❌ 克隆失败: {}", e);
                skipped_count += 1;
            } else {
                println!("  ✅ 已克隆到 {} ({})", module.path, module.branch);
                new_modules_paths.push(module.path.clone());
                success_count += 1;
            }
        } else {
            // 目录存在 → pull
            if !force {
                // 检查未提交改动
                if let Ok(repo) = Repository::open(&module.path) {
                    if has_uncommitted_changes(&repo)? {
                        println!("  ⚠️  有未提交改动，跳过更新");
                        println!("     请先提交或使用 --force 强制同步");
                        skipped_count += 1;
                        continue;
                    }
                }
            }

            println!("  目录存在，执行 pull...");

            if let Err(e) = pull_module(&module) {
                println!("  ❌ 拉取失败: {}", e);
                skipped_count += 1;
            } else {
                println!("  ✅ 已更新");
                success_count += 1;
            }
        }
    }

    // 批量更新 .gitignore（只更新新克隆的模块）
    if !new_modules_paths.is_empty() {
        update_gitignore_for_modules(&root, &new_modules_paths)?;
        println!("\n✅ 已更新 .gitignore（忽略新模块的 .git 目录）");
    }

    println!("\n✅ 同步完成");
    println!("   成功: {}", success_count);
    println!("   跳过: {}", skipped_count);

    Ok(())
}

/// 克隆模块仓库
fn clone_module(module: &crate::config::Module) -> Result<()> {
    let output = std::process::Command::new("git")
        .args(&["clone", "-b", &module.branch, &module.remote, &module.path])
        .output()
        .context("执行 git clone 失败")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("{}", stderr);
    }

    Ok(())
}

/// 拉取模块仓库更新
fn pull_module(module: &crate::config::Module) -> Result<()> {
    let output = std::process::Command::new("git")
        .current_dir(&module.path)
        .args(&["pull", "origin", &module.branch])
        .output()
        .context("执行 git pull 失败")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("{}", stderr);
    }

    Ok(())
}