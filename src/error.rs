use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitMrepoError {
    #[error("配置文件不存在")]
    ConfigNotFound,

    #[error("配置文件解析失败: {0}")]
    ConfigParseError(String),

    #[error("模块不存在: {0}")]
    ModuleNotFound(String),

    #[error("目录不是 Git 仓库: {0}")]
    NotGitRepo(String),

    #[error("模块仓库没有 origin 远程")]
    NoOriginRemote,

    #[error("有未提交改动，无法执行操作")]
    UncommittedChanges,

    #[error("Git 操作失败: {0}")]
    GitOperationFailed(String),

    #[error("路径不存在: {0}")]
    PathNotFound(String),

    #[error("目录已存在: {0}")]
    DirectoryExists(String),
}

pub type Result<T> = std::result::Result<T, GitMrepoError>;