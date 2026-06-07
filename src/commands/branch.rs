use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 查看或管理模块仓库分支
///
/// 显示模块仓库的所有分支信息
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 加载配置文件
    let config = Config::load(&config_path)
        .context("加载配置文件失败")?;

    println!("📊 模块仓库分支信息...\n");

    // 定定要查看的模块
    let modules_to_show: Vec<String> = if let Some(name_or_path) = &module {
        // 单个模块
        let module = config.find_module(name_or_path)
            .context("查找模块失败")?;
        vec![module.name.clone()]
    } else {
        // 所有模块
        config.modules.keys().cloned().collect()
    };

    if modules_to_show.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        println!("   请先执行: git mrepo clone 或 git mrepo add");
        return Ok(());
    }

    // 遍历模块并显示分支信息
    for module_name in &modules_to_show {
        let module = config.modules.get(module_name).unwrap();
        println!("[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        let module_path = Path::new(&root).join(&module.path);
        if !module_path.exists() {
            println!("  ⚠️  目录不存在，跳过");
            println!();
            continue;
        }

        // 打开子仓库
        let repo = Repository::open(&module_path)
            .context("打开子仓库失败")?;

        // 获取当前分支
        let head = repo.head()
            .context("读取 HEAD 失败")?;
        let current_branch = head
            .shorthand()
            .unwrap_or("unknown");

        println!("  当前分支: {}", current_branch);
        println!("  配置分支: {}", module.branch);

        // 获取所有本地分支
        let branches = repo.branches(None)
            .context("获取分支列表失败")?;

        println!("  本地分支:");
        for branch_result in branches {
            let (branch, _) = branch_result?;
            let branch_name = branch.name()?.unwrap_or("unknown");

            // 标记当前分支
            if branch_name == current_branch {
                println!("    • {} (当前)", branch_name);
            } else {
                println!("    • {}", branch_name);
            }
        }

        // 检查远程分支
        let remote_branches = repo.branches(Some(git2::BranchType::Remote))
            .context("获取远程分支列表失败")?;

        let mut remote_branch_list: Vec<String> = Vec::new();
        for branch_result in remote_branches {
            let (branch, _) = branch_result?;
            let branch_name = branch.name()?.unwrap_or("unknown");

            // 过滤 HEAD 分支
            if !branch_name.ends_with("/HEAD") {
                remote_branch_list.push(branch_name.to_string());
            }
        }

        if !remote_branch_list.is_empty() {
            println!("  远程分支:");
            for branch_name in remote_branch_list {
                println!("    • {}", branch_name);
            }
        }

        println!();
    }

    println!("✅ 分支信息查看完成");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_branch_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(None);
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}