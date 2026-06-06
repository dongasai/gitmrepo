use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 获取模块仓库远程信息
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

    println!("🔄 获取模块仓库远程信息...");

    for module in modules {
        println!("\n[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        if !Path::new(&module.path).exists() {
            println!("  ⚠️  目录不存在");
            continue;
        }

        // 执行 git fetch
        let output = std::process::Command::new("git")
            .current_dir(&module.path)
            .args(&["fetch", "origin"])
            .output()
            .context("执行 git fetch 失败")?;

        if output.status.success() {
            println!("  ✅ 已获取远程信息");

            // 检查远程新提交数量
            let repo = Repository::open(&module.path)
                .context("无法打开 Git 仓库")?;

            let new_commits_count = count_remote_new_commits(&repo, &module.branch)?;

            if new_commits_count > 0 {
                println!("  远程新提交: {}", new_commits_count);
            } else {
                println!("  远程新提交: 0 (已经是最新)");
            }
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("  ❌ {}", stderr);
        }
    }

    Ok(())
}

/// 统计远程新提交数量
fn count_remote_new_commits(repo: &Repository, branch: &str) -> Result<usize> {
    // 获取本地分支
    let local_branch = repo.find_branch(branch, git2::BranchType::Local)
        .context("无法找到本地分支")?;

    let local_oid = local_branch.get().target()
        .context("无法获取本地分支 OID")?;

    // 获取远程分支
    let remote_branch_name = format!("origin/{}", branch);
    let remote_branch = repo.find_branch(&remote_branch_name, git2::BranchType::Remote)
        .context("无法找到远程分支")?;

    let remote_oid = remote_branch.get().target()
        .context("无法获取远程分支 OID")?;

    // 计算远程领先本地的提交数量
    let mut revwalk = repo.revwalk()
        .context("无法创建 revwalk")?;

    revwalk.push(remote_oid)
        .context("无法推送远程 OID")?;
    revwalk.hide(local_oid)
        .context("无法隐藏本地 OID")?;

    let count = revwalk.count();

    Ok(count)
}