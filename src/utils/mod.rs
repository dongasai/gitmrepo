pub mod gitignore;
pub mod git;

pub use gitignore::{
    update_gitignore_for_module,
    update_gitignore_for_modules,
    get_git_root,
};

pub use git::{
    has_uncommitted_changes,
    count_unpushed_commits,
};