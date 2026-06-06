pub mod gitignore;

pub use gitignore::{
    update_gitignore_for_module,
    update_gitignore_for_modules,
    get_git_root,
};