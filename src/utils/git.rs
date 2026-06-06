use anyhow::Result;
use anyhow::Context;
use git2::Repository;

/// 检查仓库是否有未提交的改动
///
/// # 参数
/// - `repo`: Git 仓库对象
///
/// # 返回
/// - `Ok(true)`: 有未提交改动
/// - `Ok(false)`: 无未提交改动
///
/// # 示例
/// ```rust,ignore
/// let repo = Repository::open(&path)?;
/// let has_changes = has_uncommitted_changes(&repo)?;
/// ```
pub fn has_uncommitted_changes(repo: &Repository) -> Result<bool> {
    let statuses = repo.statuses(None)
        .context("无法获取 Git 状态")?;

    for entry in statuses.iter() {
        let status = entry.status();

        // 检查是否有未提交的改动（排除被忽略的文件）
        if !status.contains(git2::Status::IGNORED) {
            if status != git2::Status::CURRENT {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

/// 统计未推送的提交数量
///
/// # 参数
/// - `repo`: Git 仓库对象
/// - `branch`: 分支名称
///
/// # 返回
/// - 本地分支领先远程分支的提交数量
///
/// # 示例
/// ```rust,ignore
/// let repo = Repository::open(&path)?;
/// let count = count_unpushed_commits(&repo, "main")?;
/// ```
pub fn count_unpushed_commits(repo: &Repository, branch: &str) -> Result<usize> {
    // 获取本地分支
    let local_branch = repo.find_branch(branch, git2::BranchType::Local)
        .context(format!("无法找到本地分支: {}", branch))?;

    let local_oid = local_branch.get().target()
        .context("无法获取本地分支 OID")?;

    // 获取远程分支
    let remote_branch_name = format!("origin/{}", branch);
    let remote_branch = repo.find_branch(&remote_branch_name, git2::BranchType::Remote)
        .context(format!("无法找到远程分支: {}", remote_branch_name))?;

    let remote_oid = remote_branch.get().target()
        .context("无法获取远程分支 OID")?;

    // 计算本地领先远程的提交数量
    let mut revwalk = repo.revwalk()
        .context("无法创建 revwalk")?;

    revwalk.push(local_oid)
        .context("无法推送本地 OID")?;
    revwalk.hide(remote_oid)
        .context("无法隐藏远程 OID")?;

    let count = revwalk.count();

    Ok(count)
}