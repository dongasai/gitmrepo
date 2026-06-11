# git-mrepo (Git 模块化仓库管理工具)

> 解决模块化开发中,`模块仓库`和`项目仓库`的关联问题

## 核心特性

1. 主仓库和子仓库没有直接git关系,独立性很强,通过本工具进行关联
2. 同一个文件被主仓库和子仓库管理
3. 本质是**项目仓库**通过忽略**模块仓库**的`.git`的方式来实现`项目仓库`和`模块仓库`独立管理

## 技术选型

- **实现语言**: TypeScript (ESM)
- **运行环境**: Node.js >= 18
- **命令形式**: Git 子命令 (`git-mrepo`)
- **调用方式**: `git mrepo <command>` (符合 Git 用户习惯)
- **分发方式**: npm 全局安装

### 优势

- ✅ TypeScript 类型安全，维护简单
- ✅ npm 一键安装，无需编译
- ✅ 单文件构建（dist/cli.js ~40KB），启动快
- ✅ 依赖少（commander + js-yaml + simple-git）

## 命令规划

### 使用方式

```bash
git mrepo <command> [options] [arguments]
```

### 可用子命令

```bash
git mrepo init                          # 初始化配置文件 .gitmrepo
git mrepo clone <url> [dir] [-b <branch>] # 克隆模块仓库（可选指定分支）
git mrepo attach <url> [-b <branch>] <dir> # 关联现有目录到远程仓库
git mrepo add <dir>                     # 自动识别并注册已存在的 Git 仓库
git mrepo sync                          # 从配置文件同步所有模块仓库（clone + pull）
git mrepo sync2 [module]                # 从子仓库同步信息到配置文件
git mrepo pull [module]                 # 拉取模块仓库更新
git mrepo push [module]                 # 推送模块仓库变更
git mrepo fetch [module]                # 获取模块仓库远程信息
git mrepo branch [module]               # 查看或管理模块仓库分支
git mrepo commit [module]               # 在模块仓库中创建提交
git mrepo config [module]               # 配置模块仓库参数
git mrepo status [module]               # 查看模块仓库状态（默认显示所有）
git mrepo clean [module]                # 清理模块仓库未跟踪文件
git mrepo help [command]                # 显示帮助信息
git mrepo version                       # 显示版本信息
```

**参数说明**：
- `<url>`：远程仓库 URL（必需）
- `[dir]`：目录路径（clone 命令可选，默认从 URL 推导；attach 命令必需）
- `-b / --branch`：指定分支（可选，默认使用远程仓库的默认分支）
- `[module]`：模块名称（如 `auth-service`）或路径（如 `modules/auth`）

**命令对比**：
- `clone`：克隆新仓库（目录不存在或为空），可选指定分支和目录
- `attach`：关联现有目录（将普通目录转为 Git 仓库），必需指定目录
- `add`：注册已有的 Git 仓库（目录已有 .git），**自动识别** URL 和分支

**add 命令说明**：
```bash
git mrepo add modules/auth
# 自动识别并注册子仓库：
#   ✅ 从 .git/config 中读取远程 URL（origin）
#   ✅ 从 .git/HEAD 中读取当前分支
#   ✅ 自动更新 .gitignore（忽略 modules/auth/.git/）
#   ⚠️  如果没有 origin 远程，会报错提示
```

**使用示例**：
```bash
# clone 示例
git mrepo clone https://github.com/org/auth-service.git              # 默认目录、默认分支
git mrepo clone https://github.com/org/auth-service.git modules/auth # 指定目录
git mrepo clone https://github.com/org/auth-service.git -b develop   # 指定分支
git mrepo clone https://github.com/org/auth-service.git modules/auth -b develop  # 完整参数

# attach 示例
git mrepo attach https://github.com/org/auth-service.git modules/auth              # 默认分支
git mrepo attach https://github.com/org/auth-service.git modules/auth -b develop   # 指定分支

# 其他命令示例
git mrepo pull auth-service     # 使用名称
git mrepo pull modules/auth     # 使用路径
git mrepo status                # 显示所有模块状态
```
### 配置文件格式 (.gitmrepo)

```yaml
# 主仓库配置
version: "1.0"

# 模块仓库列表
modules:
  # 模块名称
  auth-service:
    # 模块仓库路径（相对于主仓库根目录）
    path: "modules/auth"
    # 模块仓库远程地址
    remote: "https://github.com/org/auth-service.git"
    # 当前跟踪的分支
    branch: "main"
    # 是否自动同步（可选）
    auto_sync: true

  user-service:
    path: "modules/user"
    remote: "https://github.com/org/user-service.git"
    branch: "develop"

# 全局配置（可选）
settings:
  # 默认分支
  default_branch: "main"
  # git mrepo status 是否默认显示所有模块状态
  # true: git mrepo status 自动显示所有模块
  # false: 需要指定模块名称，如 git mrepo status auth-service
  show_all_modules_in_status: true
  # 是否自动忽略模块仓库的 .git 目录
  auto_ignore_git: true
```

## 工作原理

1. **初始化**: `git mrepo init` 创建 `.gitmrepo` 配置文件
2. **关联**: 通过配置文件记录模块仓库的路径、远程地址等信息
3. **双重管理**:
   - 主仓库：通过 `.gitignore` 忽略模块仓库的 `.git` 目录
   - 模块仓库：在模块目录内独立管理自己的 Git 状态
4. **同步操作**: `pull/push/fetch` 等命令操作模块仓库的 Git 状态
5. **状态查看**: `status` 同时显示主仓库和模块仓库的状态

## 安装

```bash
npm install -g git-mrepo
```

### 从源码构建

```bash
git clone https://github.com/your-org/git-mrepo.git
cd git-mrepo
npm install
npm run build
npm link  # 本地开发
```

## 技术实现

### 核心策略

**双层实现架构**：
- **核心 Git 操作**：调用系统 `git` 命令（pull、push、clone、commit、branch）
- **辅助功能**：使用 `simple-git` 库（状态检查、分支列表）

### 实现原理

```typescript
// 核心 Git 操作：调用 git 命令
export function pullModule(modulePath: string, branch: string): void {
  execSync(`git pull origin ${branch}`, { cwd: modulePath, stdio: 'inherit' });
}

// 辅助功能：使用 simple-git 库
export async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  return !status.isClean();
}
```

### 技术栈

```json
{
  "commander": "^12.1.0",     // CLI 命令解析
  "js-yaml": "^4.1.0",        // YAML 配置文件
  "simple-git": "^3.25.0",    // Git 辅助操作
  "tsup": "^8.1.0"            // 构建工具（单文件 ESM）
}
```

## 开发状态

- [x] 项目结构搭建（TypeScript + tsup）
- [x] CLI 命令解析（commander）
- [x] 配置文件解析（js-yaml）
- [x] 全部 14 个命令实现
- [x] npm 发布