use clap::Subcommand;

#[derive(Subcommand)]
pub enum Commands {
    /// 初始化配置文件 .gitmrepo
    Init,

    /// 克隆模块仓库（可选指定分支）
    Clone {
        /// 远程仓库 URL
        url: String,

        /// 目录路径（可选，默认从 URL 推导）
        dir: Option<String>,

        /// 指定分支（可选）
        #[arg(short, long)]
        branch: Option<String>,
    },

    /// 关联现有目录到远程仓库
    Attach {
        /// 远程仓库 URL
        url: String,

        /// 目录路径（必需）
        dir: String,

        /// 指定分支（可选）
        #[arg(short, long)]
        branch: Option<String>,
    },

    /// 自动识别并注册已存在的 Git 仓库
    Add {
        /// 目录路径
        dir: String,
    },

    /// 从配置文件同步所有模块仓库（clone + pull）
    Sync {
        /// 强制同步，忽略未提交改动检查
        #[arg(short, long)]
        force: bool,
    },

    /// 从子仓库同步信息到配置文件
    Sync2 {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 拉取模块仓库更新
    Pull {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 推送模块仓库变更
    Push {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 获取模块仓库远程信息
    Fetch {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 查看模块仓库状态
    Status {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 查看或管理模块仓库分支
    Branch {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 在模块仓库中创建提交
    Commit {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 配置模块仓库参数
    Config {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },

    /// 清理模块仓库未跟踪文件
    Clean {
        /// 模块名称或路径（可选）
        module: Option<String>,
    },
}