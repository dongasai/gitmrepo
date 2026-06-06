use anyhow::{Result, Context};
use clap::{Parser, Subcommand};
use semver::Version;
use std::process::Command;
use std::path::Path;

#[derive(Parser)]
#[command(name = "version-manager")]
#[command(about = "Git-mrepo 版本管理工具", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 递增 patch 版本 (0.1.0 -> 0.1.1)
    Patch {
        /// 自动提交版本更新
        #[arg(short, long)]
        commit: bool,
    },
    /// 递增 minor 版本 (0.1.0 -> 0.2.0)
    Minor {
        /// 自动提交版本更新
        #[arg(short, long)]
        commit: bool,
    },
    /// 递增 major 版本 (0.1.0 -> 1.0.0)
    Major {
        /// 自动提交版本更新
        #[arg(short, long)]
        commit: bool,
    },
    /// 显示当前版本
    Show,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let cargo_toml_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("Cargo.toml");

    match cli.command {
        Commands::Patch { commit } => bump_version(&cargo_toml_path, VersionBump::Patch, commit)?,
        Commands::Minor { commit } => bump_version(&cargo_toml_path, VersionBump::Minor, commit)?,
        Commands::Major { commit } => bump_version(&cargo_toml_path, VersionBump::Major, commit)?,
        Commands::Show => show_version(&cargo_toml_path)?,
    }

    Ok(())
}

#[derive(Debug, Clone, Copy)]
enum VersionBump {
    Patch,
    Minor,
    Major,
}

fn read_version(cargo_toml_path: &Path) -> Result<Version> {
    let content = std::fs::read_to_string(cargo_toml_path)
        .with_context(|| format!("无法读取 {:?}", cargo_toml_path))?;

    let doc = content.parse::<toml_edit::Document>()
        .with_context(|| "解析 Cargo.toml 失败")?;

    let version_str = doc["package"]["version"]
        .as_str()
        .with_context(|| "无法找到 package.version 字段")?;

    Version::parse(version_str)
        .with_context(|| format!("解析版本号失败: {}", version_str))
}

fn bump_version(cargo_toml_path: &Path, bump: VersionBump, commit: bool) -> Result<()> {
    // 读取当前版本
    let current_version = read_version(cargo_toml_path)?;
    println!("当前版本: {}", current_version);

    // 计算新版本
    let new_version = match bump {
        VersionBump::Patch => {
            Version::new(
                current_version.major,
                current_version.minor,
                current_version.patch + 1,
            )
        }
        VersionBump::Minor => {
            Version::new(
                current_version.major,
                current_version.minor + 1,
                0,
            )
        }
        VersionBump::Major => {
            Version::new(
                current_version.major + 1,
                0,
                0,
            )
        }
    };

    // 更新 Cargo.toml
    let content = std::fs::read_to_string(cargo_toml_path)?;
    let mut doc = content.parse::<toml_edit::Document>()?;
    doc["package"]["version"] = toml_edit::value(new_version.to_string());
    std::fs::write(cargo_toml_path, doc.to_string())?;

    println!("新版本: {}", new_version);

    // 可选：提交到 git
    if commit {
        let cargo_toml_str = cargo_toml_path.to_str().unwrap();
        let cargo_lock_path = cargo_toml_path.parent().unwrap().join("Cargo.lock");
        let cargo_lock_str = cargo_lock_path.to_str().unwrap();

        Command::new("git")
            .args(&["add", cargo_toml_str, cargo_lock_str])
            .current_dir(cargo_toml_path.parent().unwrap())
            .output()
            .with_context(|| "git add 失败")?;

        let commit_message = format!("chore: 版本更新至 {}", new_version);
        Command::new("git")
            .args(&["commit", "-m", &commit_message])
            .current_dir(cargo_toml_path.parent().unwrap())
            .output()
            .with_context(|| "git commit 失败")?;

        println!("已提交版本更新到 git");
    }

    Ok(())
}

fn show_version(cargo_toml_path: &Path) -> Result<()> {
    let version = read_version(cargo_toml_path)?;
    println!("当前版本: {}", version);
    Ok(())
}