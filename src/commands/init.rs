use crate::config::Config;
use crate::utils::get_git_root;
use anyhow::{Context, Result};
use std::path::Path;

/// 初始化配置文件 .gitmrepo
pub fn execute() -> Result<()> {
    let root = get_git_root()?;

    // 检查是否已经是 Git 仓库
    if !Path::new(&root).join(".git").exists() {
        anyhow::bail!("当前目录不是 Git 仓库");
    }

    // 检查配置文件是否已存在
    let config_path = Path::new(&root).join(".gitmrepo");
    if config_path.exists() {
        println!("⚠️  .gitmrepo 配置文件已存在");
        println!("   如需重新初始化，请先删除现有配置文件");
        return Ok(());
    }

    // 创建默认配置
    let config = Config::new();

    // 保存配置文件
    config
        .save(&config_path)
        .context("保存配置文件失败")?;

    println!("✅ 已创建 .gitmrepo 配置文件");
    println!("💡 提示：.gitmrepo 应提交到主仓库，让团队成员共享模块配置");

    Ok(())
}