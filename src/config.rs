use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// 模块仓库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Module {
    /// 模块名称
    pub name: String,

    /// 模块仓库路径（相对于主仓库根目录）
    pub path: String,

    /// 模块仓库远程地址
    pub remote: String,

    /// 当前跟踪的分支
    pub branch: String,

    /// 是否自动同步（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_sync: Option<bool>,
}

/// 全局配置
#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    /// 默认分支
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_branch: Option<String>,

    /// git mrepo status 是否默认显示所有模块状态
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_all_modules_in_status: Option<bool>,

    /// 是否自动忽略模块仓库的 .git 目录
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_ignore_git: Option<bool>,
}

/// .gitmrepo 配置文件
#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    /// 配置文件版本
    pub version: String,

    /// 模块仓库列表（使用 HashMap 存储，键为模块名称）
    pub modules: HashMap<String, Module>,

    /// 全局配置（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<Settings>,
}

impl Config {
    /// 创建新配置
    pub fn new() -> Self {
        Config {
            version: "1.0".to_string(),
            modules: HashMap::new(),
            settings: Some(Settings {
                default_branch: Some("main".to_string()),
                show_all_modules_in_status: Some(true),
                auto_ignore_git: Some(true),
            }),
        }
    }

    /// 从文件加载配置
    pub fn load(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_yaml::from_str(&content)?;
        Ok(config)
    }

    /// 保存配置到文件
    pub fn save(&self, path: &Path) -> Result<()> {
        let content = serde_yaml::to_string(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// 查找模块（支持名称或路径）
    pub fn find_module(&self, name_or_path: &str) -> Result<&Module> {
        // 先尝试按名称查找
        if let Some(module) = self.modules.get(name_or_path) {
            return Ok(module);
        }

        // 再尝试按路径查找
        for module in self.modules.values() {
            if module.path == name_or_path {
                return Ok(module);
            }
        }

        anyhow::bail!("未找到模块: {}", name_or_path)
    }

    /// 添加模块
    pub fn add_module(&mut self, module: Module) {
        self.modules.insert(module.name.clone(), module);
    }

    /// 更新模块
    pub fn update_module(&mut self, name: &str, module: Module) -> Result<()> {
        if !self.modules.contains_key(name) {
            anyhow::bail!("未找到模块: {}", name);
        }
        self.modules.insert(name.to_string(), module);
        Ok(())
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::new()
    }
}