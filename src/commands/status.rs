use crate::config::Config;
use crate::utils::{get_git_root, has_uncommitted_changes, count_unpushed_commits};
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 查看模块仓库状态
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

    // 确定要检查的模块
    let modules = if let Some(name_or_path) = module {
        vec![config.find_module(&name_or_path)?.clone()]
    } else {
        // 显示所有模块
        if config.modules.is_empty() {
            println!("⚠️  未注册任何模块仓库");
            println!("   请先执行: git mrepo clone 或 git mrepo add");
            return Ok(());
        }
        config.modules.values().cloned().collect()
    };

    println!("📊 模块仓库状态:");

    for module in modules {
        println!("\n[{}] {}:", module.name, module.path);
        println!("  分支: {}", module.branch);
        println!("  远程: {}", module.remote);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            println!("  ⚠️  目录不存在，需要克隆");
            continue;
        }

        // 打开 Git 仓库
        let repo = Repository::open(&module.path)
            .context("无法打开 Git 仓库")?;

        // 检查 Git 状态（未提交改动）
        let has_changes = has_uncommitted_changes(&repo)?;
        if has_changes {
            println!("  ⚠️  有未提交改动");
        } else {
            println!("  ✅ 工作目录干净");
        }

        // 检查未推送提交
        let unpushed_count = count_unpushed_commits(&repo, &module.branch)?;
        if unpushed_count > 0 {
            println!("  ⚠️  未推送提交: {}", unpushed_count);
        } else {
            println!("  ✅ 已推送所有提交");
        }
    }

    Ok(())
}