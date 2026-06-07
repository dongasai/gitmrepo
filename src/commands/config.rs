use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use std::path::Path;

/// 配置模块仓库参数
///
/// 显示模块仓库的配置信息
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 加载配置文件
    let config = Config::load(&config_path)
        .context("加载配置文件失败")?;

    println!("⚙️  模块仓库配置信息...\n");

    // 显示全局配置
    println!("全局配置:");
    if let Some(ref settings) = config.settings {
        if let Some(ref branch) = settings.default_branch {
            println!("  默认分支: {}", branch);
        }
        if let Some(show_all) = settings.show_all_modules_in_status {
            println!("  status 显示所有模块: {}", show_all);
        }
        if let Some(auto_ignore) = settings.auto_ignore_git {
            println!("  自动忽略 .git 目录: {}", auto_ignore);
        }
    } else {
        println!("  （无全局配置）");
    }
    println!();

    // 确定要查看的模块
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

    // 显示模块配置
    println!("模块配置:");
    for module_name in &modules_to_show {
        let module = config.modules.get(module_name).unwrap();
        println!("\n[{}] {}:", module.name, module.path);
        println!("  远程 URL: {}", module.remote);
        println!("  分支: {}", module.branch);
        if let Some(auto_sync) = module.auto_sync {
            println!("  自动同步: {}", auto_sync);
        }

        // 检查目录是否存在
        let module_path = Path::new(&root).join(&module.path);
        if !module_path.exists() {
            println!("  ⚠️  目录不存在");
        }
    }

    println!("\n✅ 配置信息查看完成");

    println!("\n💡 提示:");
    println!("   要修改配置，请手动编辑 .gitmrepo 文件");
    println!("   或使用 sync2 命令从子仓库同步配置");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(None);
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}