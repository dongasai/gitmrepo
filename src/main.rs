use clap::Parser;
use git_mrepo::cli::Commands;
use git_mrepo::commands::{
    add_execute, attach_execute, clone_execute, fetch_execute, init_execute, pull_execute,
    push_execute, status_execute, sync_execute, sync2_execute,
};

#[derive(Parser)]
#[command(name = "git-mrepo")]
#[command(author = "dongasai")]
#[command(version = "0.1.0")]
#[command(about = "Git 模块化仓库管理工具", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init => {
            if let Err(e) = init_execute() {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Clone { url, dir, branch } => {
            if let Err(e) = clone_execute(url, dir, branch) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Add { dir } => {
            if let Err(e) = add_execute(dir) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Status { module } => {
            if let Err(e) = status_execute(module) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Sync { force } => {
            if let Err(e) = sync_execute(force) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Pull { module } => {
            if let Err(e) = pull_execute(module) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Push { module } => {
            if let Err(e) = push_execute(module) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Fetch { module } => {
            if let Err(e) = fetch_execute(module) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Attach { url, dir, branch } => {
            if let Err(e) = attach_execute(url, dir, branch) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Sync2 { module } => {
            if let Err(e) = sync2_execute(module) {
                eprintln!("❌ {}", e);
                std::process::exit(1);
            }
        }
        Commands::Branch { module } => {
            eprintln!("⚠️  branch 命令开发中...");
            if let Some(m) = module {
                eprintln!("目标: 查看或管理模块仓库分支: {}", m);
            } else {
                eprintln!("目标: 查看或管理所有模块仓库分支");
            }
            std::process::exit(1);
        }
        Commands::Commit { module } => {
            eprintln!("⚠️  commit 命令开发中...");
            if let Some(m) = module {
                eprintln!("目标: 在模块仓库 {} 中创建提交", m);
            } else {
                eprintln!("目标: 在所有模块仓库中创建提交");
            }
            std::process::exit(1);
        }
        Commands::Config { module } => {
            eprintln!("⚠️  config 命令开发中...");
            if let Some(m) = module {
                eprintln!("目标: 配置模块仓库 {} 的参数", m);
            } else {
                eprintln!("目标: 配置所有模块仓库的参数");
            }
            std::process::exit(1);
        }
        Commands::Clean { module } => {
            eprintln!("⚠️  clean 命令开发中...");
            if let Some(m) = module {
                eprintln!("目标: 清理模块仓库 {} 的未跟踪文件", m);
            } else {
                eprintln!("目标: 清理所有模块仓库的未跟踪文件");
            }
            std::process::exit(1);
        }
    }
}