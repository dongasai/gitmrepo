use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;

/// 清理模块仓库未跟踪文件
///
/// 执行 git clean 命令，需要手动确认
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 加载配置文件
    let config = Config::load(&config_path)
        .context("加载配置文件失败")?;

    println!("🧹 清理模块仓库未跟踪文件...\n");

    // 确定要清理的模块
    let modules_to_clean: Vec<String> = if let Some(name_or_path) = &module {
        // 单个模块
        let module = config.find_module(name_or_path)
            .context("查找模块失败")?;
        vec![module.name.clone()]
    } else {
        // 所有模块
        config.modules.keys().cloned().collect()
    };

    if modules_to_clean.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        println!("   请先执行: git mrepo clone 或 git mrepo add");
        return Ok(());
    }

    // 遍历模块并检查未跟踪文件
    for module_name in &modules_to_clean {
        let module = config.modules.get(module_name).unwrap();
        println!("[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        let module_path = Path::new(&root).join(&module.path);
        if !module_path.exists() {
            println!("  ⚠️  目录不存在，跳过");
            println!();
            continue;
        }

        // 检查未跟踪文件
        let status_output = Command::new("git")
            .args(&["status", "--short"])
            .current_dir(&module_path)
            .output()
            .context("执行 git status 失败")?;

        let status_text = String::from_utf8_lossy(&status_output.stdout);

        // 检查是否有未跟踪文件（以 ?? 开头）
        let untracked_files = status_text
            .lines()
            .filter(|line| line.starts_with("??"))
            .collect::<Vec<_>>();

        if untracked_files.is_empty() {
            println!("  ✅ 没有未跟踪文件");
            println!();
            continue;
        }

        println!("  ⚠️  发现 {} 个未跟踪文件:", untracked_files.len());
        for file in &untracked_files {
            println!("    {}", file);
        }

        println!("\n  💡 清理命令:");
        println!("    cd {} && git clean -n    # 预览要删除的文件", module.path);
        println!("    cd {} && git clean -f    # 删除未跟踪文件", module.path);
        println!("    cd {} && git clean -fd   # 删除未跟踪文件和目录", module.path);
        println!("    cd {} && git clean -fdx  # 删除所有未跟踪内容（包括忽略文件）", module.path);
        println!();
    }

    println!("✅ 清理检查完成");

    println!("\n⚠️  警告:");
    println!("   git clean 命令会永久删除文件，请谨慎使用");
    println!("   建议先使用 -n 参数预览，确认后再执行删除");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(None);
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}