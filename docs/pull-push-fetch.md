# git mrepo pull / push / fetch

Git 基础操作命令，在模块仓库中执行标准的 Git 操作。

## 概述

这三个命令都是简单的 Git 操作包装器，在指定的模块仓库目录中执行对应的 Git 命令。

- **pull** - 拉取并合并远程更新
- **push** - 推送本地提交到远程
- **fetch** - 获取远程信息（不合并）

---

# git mrepo pull

## 用途

在指定模块仓库中执行 `git pull`，拉取远程更新并合并到当前分支。

## 使用方法

```bash
git mrepo pull [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 拉取所有模块 |

**智能识别**：支持模块名称（`auth-service`）或路径（`modules/auth`）。

## 使用示例

### 拉取所有模块

```bash
git mrepo pull

# 输出：
🔄 拉取所有模块仓库...

[auth-service] modules/auth:
  分支: main
  ✅ 已更新 (2 commits pulled)

[user-service] modules/user:
  分支: develop
  ✅ 已更新 (5 commits pulled)

[config-lib] modules/config:
  分支: main
  ✅ 已经是最新的
```

### 拉取指定模块

```bash
# 使用名称
git mrepo pull auth-service

# 使用路径
git mrepo pull modules/auth

# 输出：
[auth-service] modules/auth:
  分支: main
  ✅ 已更新 (2 commits pulled)
```

## 实现原理

```typescript
export async function pullExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 确定模块列表
  const modules: Module[] = moduleArg
    ? [cm.findModule(config, moduleArg)!]
    : Object.values(config.modules);

  console.log('🔄 拉取模块仓库更新...');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);
    console.log(`  分支: ${module.branch}`);

    const fullPath = path.join(root, module.path);

    try {
      const output = execSync(`git pull origin "${module.branch}"`, {
        cwd: fullPath,
        encoding: 'utf-8',
      });

      if (output.includes('Already up to date') || output.includes('Already up-to-date')) {
        console.log('  ✅ 已经是最新的');
      } else {
        // 统计拉取的提交数量
        const pulledCommits = countPulledCommits(fullPath, module.branch);
        console.log(`  ✅ 已更新 (${pulledCommits} commits pulled)`);
      }
    } catch (error) {
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}
```

---

# git mrepo push

## 用途

在指定模块仓库中执行 `git push`，推送本地提交到远程仓库。

## 使用方法

```bash
git mrepo push [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 推送所有模块 |

## 使用示例

### 推送所有模块

```bash
git mrepo push

# 输出：
🔄 推送所有模块仓库...

[auth-service] modules/auth:
  分支: main
  未推送提交: 3
  ✅ 已推送 (3 commits)

[user-service] modules/user:
  分支: develop
  未推送提交: 1
  ✅ 已推送 (1 commit)

[config-lib] modules/config:
  分支: main
  ✅ 没有需要推送的提交
```

### 推送指定模块

```bash
git mrepo push auth-service

# 输出：
[auth-service] modules/auth:
  分支: main
  未推送提交: 3
  ✅ 已推送 (3 commits)
```

## 实现原理

```typescript
export async function pushExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 确定模块列表
  const modules: Module[] = moduleArg
    ? [cm.findModule(config, moduleArg)!]
    : Object.values(config.modules);

  console.log('🔄 推送模块仓库变更...');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);
    console.log(`  分支: ${module.branch}`);

    const fullPath = path.join(root, module.path);

    // 检查是否有未推送提交
    const unpushedCount = countUnpushedCommits(fullPath, module.branch);

    if (unpushedCount === 0) {
      console.log('  ✅ 没有需要推送的提交');
      continue;
    }

    console.log(`  未推送提交: ${unpushedCount}`);

    try {
      execSync(`git push origin "${module.branch}"`, {
        cwd: fullPath,
        encoding: 'utf-8',
      });
      console.log(`  ✅ 已推送 (${unpushedCount} commits)`);
    } catch (error) {
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}
```

---

# git mrepo fetch

## 用途

在指定模块仓库中执行 `git fetch`，获取远程仓库的最新信息，但不合并到本地分支。

**适用场景**：
- 查看远程是否有新提交
- 检查远程分支变化
- 更新远程跟踪信息

## 使用方法

```bash
git mrepo fetch [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 获取所有模块 |

## 使用示例

### 获取所有模块远程信息

```bash
git mrepo fetch

# 输出：
🔄 获取所有模块远程信息...

[auth-service] modules/auth:
  ✅ 已获取远程信息
  远程新提交: 2

[user-service] modules/user:
  ✅ 已获取远程信息
  远程新提交: 0 (已经是最新)

[config-lib] modules/config:
  ✅ 已获取远程信息
  远程新提交: 5
```

### 获取指定模块远程信息

```bash
git mrepo fetch auth-service

# 输出：
[auth-service] modules/auth:
  ✅ 已获取远程信息
  远程新提交: 2
```

## 实现原理

```typescript
export async function fetchExecute(moduleArg?: string): Promise<void> {
  const root = getGitRoot();
  const configPath = path.join(root, '.gitmrepo');

  const config = ConfigManager.load(configPath);
  const cm = new ConfigManager();

  // 确定模块列表
  const modules: Module[] = moduleArg
    ? [cm.findModule(config, moduleArg)!]
    : Object.values(config.modules);

  console.log('🔄 获取模块仓库远程信息...');

  for (const module of modules) {
    console.log(`[${module.name}] ${module.path}:`);

    const fullPath = path.join(root, module.path);

    try {
      execSync('git fetch origin', { cwd: fullPath });
      console.log('  ✅ 已获取远程信息');

      // 检查远程新提交数量
      const newCommits = countRemoteNewCommits(fullPath, module.branch);

      if (newCommits > 0) {
        console.log(`  远程新提交: ${newCommits}`);
      } else {
        console.log('  远程新提交: 0 (已经是最新)');
      }
    } catch (error) {
      const stderr = (error as any).stderr?.toString() || '未知错误';
      console.log(`  ❌ ${stderr}`);
    }
  }
}

/**
 * 统计远程新提交数量
 */
export function countRemoteNewCommits(repoPath: string, branch: string): number {
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    return 0;
  }
  try {
    return parseInt(
      execSync(`git rev-list --count ${branch}..origin/${branch}`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim(),
      10
    ) || 0;
  } catch {
    return 0;
  }
}
```

---

## 命令对比

| 命令 | Git 操作 | 作用 | 影响本地 |
|------|---------|------|---------|
| `pull` | git pull | 拉取并合并 | ✅ 会改变本地文件 |
| `push` | git push | 推送提交 | ✅ 会推送本地提交 |
| `fetch` | git fetch | 获取信息 | ❌ 不改变本地文件 |

---

## 三者关系

```
┌─────────────┐
│ 远程仓库     │
│ origin/main │
└─────┬───────┘
      │
      │ fetch（获取信息，不合并）
      ↓
┌─────────────┐
│ 本地跟踪     │
│ origin/main │ ← 更新远程跟踪分支
└─────┬───────┘
      │
      │ pull（fetch + merge）
      ↓
┌─────────────┐
│ 本地分支     │
│ main         │ ← 合并到本地分支
└─────┬───────┘
      │
      │ push（推送提交）
      ↑
      │
┌─────────────┐
│ 远程仓库     │
│ origin/main │ ← 推送本地提交
└─────────────┘
```

---

## 使用建议

### 检查更新流程

```bash
# 1. 先 fetch 查看是否有更新
git mrepo fetch auth-service

# 输出显示：远程新提交: 5

# 2. 确认需要更新后，再 pull
git mrepo pull auth-service
```

### 安全推送流程

```bash
# 1. 先 fetch 查看远程状态
git mrepo fetch auth-service

# 2. 检查本地未推送提交
git mrepo status auth-service
# 输出：未推送提交: 3

# 3. 推送提交
git mrepo push auth-service
```

### 避免直接 pull

```bash
# ❌ 不推荐：直接 pull（可能引入意外更新）
git mrepo pull auth-service

# ✅ 推荐：先 fetch 检查，再 pull
git mrepo fetch auth-service  # 查看
git mrepo pull auth-service   # 确认后再拉取
```

---

## 实用场景

### pull 场景

```bash
# 每天开始工作时，拉取最新代码
git mrepo pull

# 拉取特定模块更新
git mrepo pull auth-service
```

### push 场景

```bash
# 完成功能开发后推送
git mrepo status auth-service  # 检查未推送提交
git mrepo push auth-service    # 推送

# 推送所有模块
git mrepo push
```

### fetch 场景

```bash
# 检查远程是否有冲突或更新
git mrepo fetch

# 查看后决定是否 pull
git mrepo pull
```

---

## 注意事项

### pull 注意

- 会自动合并远程更新到本地分支
- 如果有冲突需要手动解决
- 默认拉取配置文件中记录的分支

### push 注意

- 只推送当前分支的提交
- 需要先 commit 才有可推送的内容
- 如果远程有新提交，可能需要先 pull

### fetch 注意

- 只更新远程跟踪信息，不影响本地文件
- 可以安全执行，不会造成冲突
- 通常用于检查远程状态

---

## 错误处理

### pull 失败（有未提交改动）

```bash
$ git mrepo pull auth-service
❌ 有未提交改动，无法 pull
   请先提交或暂存改动：
     git commit -m "message"
     git stash
```

### push 失败（远程有新提交）

```bash
$ git mrepo push auth-service
❌ 远程有新提交，推送被拒绝
   请先 pull 更新：
     git mrepo pull auth-service
```

### fetch 失败（网络问题）

```bash
$ git mrepo fetch auth-service
❌ 无法连接到远程仓库
   请检查网络连接或远程 URL
```

---

## 批量操作建议

```bash
# 推荐：逐个操作，避免批量失败
git mrepo pull auth-service
git mrepo push user-service

# 批量操作可能遇到多个错误
git mrepo pull  # 某些模块可能失败
git mrepo push  # 某些模块可能失败
```

---

## 与原生 Git 命令对比

| 命令 | 原生 Git | git-mrepo |
|------|---------|-----------|
| pull | `cd modules/auth && git pull origin main` | `git mrepo pull auth-service` |
| push | `cd modules/auth && git push origin main` | `git mrepo push auth-service` |
| fetch | `cd modules/auth && git fetch origin` | `git mrepo fetch auth-service` |

**优势**：无需 cd 进出目录，支持批量操作所有模块。