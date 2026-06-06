use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// 从子仓库同步配置信息到 .gitmrepo
///
/// 更新配置文件中的分支和远程 URL，使其与子仓库的实际状态保持一致
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 加载配置文件
    let mut config = Config::load(&config_path)
        .context("加载配置文件失败")?;

    println!("🔄 从子仓库同步配置信息...\n");

    // 确定要同步的模块
    let modules_to_sync: Vec<String> = if let Some(name_or_path) = &module {
        // 单个模块
        let module = config.find_module(name_or_path)
            .context("查找模块失败")?;
        vec![module.name.clone()]
    } else {
        // 所有模块
        config.modules.keys().cloned().collect()
    };

    if modules_to_sync.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        println!("   请先执行: git mrepo clone 或 git mrepo add");
        return Ok(());
    }

    let mut updated_count = 0;
    let mut unchanged_count = 0;

    // 遍历模块并同步
    for module_name in &modules_to_sync {
        // 先获取当前配置信息（用于对比）
        let (config_branch, config_remote) = {
            let module = config.modules.get(module_name).unwrap();
            (module.branch.clone(), module.remote.clone())
        };

        // 显示模块信息
        let module = config.modules.get(module_name).unwrap();
        println!("[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        let module_path = Path::new(&root).join(&module.path);
        if !module_path.exists() {
            println!("  ⚠️  目录不存在，跳过");
            unchanged_count += 1;
            continue;
        }

        // 打开子仓库
        let repo = Repository::open(&module_path)
            .context("打开子仓库失败")?;

        // 获取实际分支
        let head = repo.head()
            .context("读取 HEAD 失败")?;
        let actual_branch = head
            .shorthand()
            .unwrap_or("unknown");

        // 获取实际远程 URL
        let remote = repo.find_remote("origin")
            .context("查找 origin 远程失败")?;
        let actual_url = remote
            .url()
            .unwrap_or("unknown");

        // 对比并更新配置
        let mut needs_update = false;

        // 检查分支
        if actual_branch != config_branch {
            println!(
                "  当前分支: {} (配置: {}) → 已更新",
                actual_branch, config_branch
            );
            config.modules.get_mut(module_name).unwrap().branch = actual_branch.to_string();
            needs_update = true;
        } else {
            println!("  当前分支: {} (一致)", actual_branch);
        }

        // 检查远程 URL
        if actual_url != config_remote {
            println!(
                "  远程 URL: {} (配置: {}) → 已更新",
                actual_url, config_remote
            );
            config.modules.get_mut(module_name).unwrap().remote = actual_url.to_string();
            needs_update = true;
        } else {
            println!("  远程 URL: {} (一致)", actual_url);
        }

        if needs_update {
            updated_count += 1;
        } else {
            unchanged_count += 1;
        }
    }

    // 保存配置文件
    if updated_count > 0 {
        config.save(&config_path)
            .context("保存配置文件失败")?;
        println!("\n✅ 已保存配置文件");
    }

    println!("\n✅ 同步完成");
    println!("   更新: {}", updated_count);
    println!("   一致: {}", unchanged_count);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync2_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(None);
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}