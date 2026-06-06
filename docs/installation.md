# git-mrepo 安装说明

## 本地安装步骤

### 1. 安装到系统

```bash
# 从源码安装
cargo install --path .

# 安装位置
~/.cargo/bin/git-mrepo
```

### 2. 添加到 PATH（推荐）

将 cargo bin 目录添加到 PATH，以便可以直接使用 `git-mrepo` 或 `git mrepo` 命令：

**临时添加（当前会话）**：
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

**永久添加（推荐）**：

编辑 `~/.bashrc` 或 `~/.zshrc`：
```bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 3. 验证安装

```bash
# 直接运行
git-mrepo --version

# 作为 git 子命令（需要 PATH）
git mrepo --version
```

## 使用方式

### 方式 1：直接命令（推荐）

```bash
git-mrepo init
git-mrepo clone https://github.com/org/auth-service.git
git-mrepo status
```

### 方式 2：git 子命令（需要 PATH）

```bash
git mrepo init
git mrepo clone https://github.com/org/auth-service.git
git mrepo status
```

## 当前状态

✅ **已安装到**: `/home/dongasai/.cargo/bin/git-mrepo`

⚠️ **注意**: 当前 `git-mrepo` 不在 PATH 中，需要使用完整路径或添加 PATH。

**临时解决方案**：
```bash
# 使用完整路径
~/.cargo/bin/git-mrepo init

# 或添加临时 PATH
export PATH="$HOME/.cargo/bin:$PATH"
git-mrepo init
```

## 卸载

```bash
cargo uninstall git-mrepo
```

## 更新

```bash
# 重新安装最新版本
cargo install --path . --force
```