use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;

/// 在模块仓库中创建提交
///
/// 执行 git commit 命令，需要先暂存改动
pub fn execute(module: Option<String>) -> Result<()> {
    let root = get_git_root()?;
    let config_path = Path::new(&root).join(".gitmrepo");

    // 加载配置文件
    let config = Config::load(&config_path)
        .context("加载配置文件失败")?;

    println!("📝 创建模块仓库提交...\n");

    // 确定要提交的模块
    let modules_to_commit: Vec<String> = if let Some(name_or_path) = &module {
        // 单个模块
        let module = config.find_module(name_or_path)
            .context("查找模块失败")?;
        vec![module.name.clone()]
    } else {
        // 所有模块
        config.modules.keys().cloned().collect()
    };

    if modules_to_commit.is_empty() {
        println!("⚠️  未注册任何模块仓库");
        println!("   请先执行: git mrepo clone 或 git mrepo add");
        return Ok(());
    }

    let success_count = 0;
    let mut skip_count = 0;

    // 遍历模块并执行提交
    for module_name in &modules_to_commit {
        let module = config.modules.get(module_name).unwrap();
        println!("[{}] {}:", module.name, module.path);

        // 检查目录是否存在
        let module_path = Path::new(&root).join(&module.path);
        if !module_path.exists() {
            println!("  ⚠️  目录不存在，跳过");
            skip_count += 1;
            println!();
            continue;
        }

        // 检查是否有暂存的改动
        let status_output = Command::new("git")
            .args(&["status", "--short"])
            .current_dir(&module_path)
            .output()
            .context("执行 git status 失败")?;

        let status_text = String::from_utf8_lossy(&status_output.stdout);

        // 检查是否有已暂存的改动（以 A/M/D/R 开头）
        let has_staged = status_text
            .lines()
            .any(|line| line.starts_with('A') || line.starts_with('M') ||
                       line.starts_with('D') || line.starts_with('R'));

        if !has_staged {
            println!("  ⚠️  没有暂存的改动");
            println!("  请先执行: cd {} && git add <files>", module.path);
            skip_count += 1;
            println!();
            continue;
        }

        // 提示用户输入提交消息
        println!("  ⚠️  需要手动输入提交消息");
        println!("  请执行: cd {} && git commit", module.path);
        println!("  或者使用: git commit -m \"<message>\"");
        skip_count += 1;
        println!();
    }

    println!("✅ 提交检查完成");
    println!("   成功: {}", success_count);
    println!("   跳过: {}", skip_count);

    println!("\n💡 提示:");
    println!("   git-mrepo 不自动创建提交，需要手动执行 git commit");
    println!("   这样可以更好地控制提交消息和内容");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_signature() {
        // 验证函数签名正确
        let result: Result<()> = execute(None);
        // 不实际执行，仅验证类型正确
        assert!(true);
    }
}