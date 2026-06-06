use clap::Parser;
use git_mrepo::cli::Commands;
use git_mrepo::commands::init_execute;

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
                println!("❌ {}", e);
            }
        }
        Commands::Clone { url, dir, branch } => {
            println!("克隆模块仓库: {}", url);
            if let Some(d) = dir {
                println!("目标目录: {}", d);
            }
            if let Some(b) = branch {
                println!("分支: {}", b);
            }
            // TODO: 实现 clone 命令
        }
        Commands::Attach { url, dir, branch } => {
            println!("关联目录到远程仓库: {} -> {}", dir, url);
            if let Some(b) = branch {
                println!("分支: {}", b);
            }
            // TODO: 实现 attach 命令
        }
        Commands::Add { dir } => {
            println!("注册已有仓库: {}", dir);
            // TODO: 实现 add 命令
        }
        Commands::Sync { force } => {
            println!("同步所有模块仓库");
            if force {
                println!("强制模式");
            }
            // TODO: 实现 sync 命令
        }
        Commands::Sync2 { module } => {
            if let Some(m) = module {
                println!("从 {} 同步配置信息", m);
            } else {
                println!("从所有子仓库同步配置信息");
            }
            // TODO: 实现 sync2 命令
        }
        Commands::Pull { module } => {
            if let Some(m) = module {
                println!("拉取模块: {}", m);
            } else {
                println!("拉取所有模块");
            }
            // TODO: 实现 pull 命令
        }
        Commands::Push { module } => {
            if let Some(m) = module {
                println!("推送模块: {}", m);
            } else {
                println!("推送所有模块");
            }
            // TODO: 实现 push 命令
        }
        Commands::Fetch { module } => {
            if let Some(m) = module {
                println!("获取模块远程信息: {}", m);
            } else {
                println!("获取所有模块远程信息");
            }
            // TODO: 实现 fetch 命令
        }
        Commands::Status { module } => {
            if let Some(m) = module {
                println!("查看模块状态: {}", m);
            } else {
                println!("查看所有模块状态");
            }
            // TODO: 实现 status 命令
        }
        _ => {
            println!("其他命令待实现");
        }
    }
}