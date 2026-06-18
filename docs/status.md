# git mrepo status

查看模块仓库的 Git 状态。

## 用途

- **无参数**：简要概览所有模块仓库的状态（分支、远程、未提交改动、未推送提交）
- **指定模块**：直接显示该模块的原生 `git status` 完整输出

## 使用方法

```bash
git mrepo status [module]
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `[module]` | 可选 | 模块名称或路径 | 显示所有模块概览 |

**智能识别**：
- 支持模块名称：`auth-service`
- 支持路径：`modules/auth` 或 `./modules/auth`

## 两种输出模式

### 模式一：全部模块概览（不指定模块）

简要展示每个模块的关键状态信息。

```bash
git mrepo status

# 输出：
📊 模块仓库状态:

[auth-service] modules/auth:
  分支: main
  远程: https://github.com/org/auth-service.git
  ⚠️  有未提交改动
  ⚠️  未推送提交: 2

[user-service] modules/user:
  分支: main
  远程: https://github.com/org/user-service.git
  ✅ 工作目录干净
  ✅ 已推送所有提交

[config-lib] modules/config:
  分支: main
  远程: https://github.com/org/config-lib.git
  ⚠️  目录不存在，需要克隆
```

概览中每项说明：

| 字段 | 说明 |
|------|------|
| `分支` | 配置文件中记录的分支名称 |
| `远程` | 远程仓库 URL |
| `有未提交改动` / `工作目录干净` | 检查是否存在未提交的改动 |
| `未推送提交: N` / `已推送所有提交` | 本地是否有未推送到远程的提交 |
| `目录不存在，需要克隆` | 模块目录尚未克隆 |

### 模式二：单模块完整状态（指定模块）

直接执行原生 `git status`，输出完整详细信息。

```bash
# 使用模块名称
git mrepo status auth-service

# 使用路径
git mrepo status modules/auth

# 输出（原生 git status）：
📊 模块仓库状态 [auth-service]:

On branch main
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to push your commits)

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/auth.rs

no changes added to commit (use "git add" and/or "git commit -a")
```

## 执行流程

```
1. 检查 .gitmrepo 配置文件是否存在
   └─ 不存在 → 提示执行 git mrepo init
2. 加载配置，确定模块列表
   ├─ 有参数 → 按名称或路径查找单个模块
   │   └─ 找不到 → 报错 "模块不存在"
   └─ 无参数 → 使用全部已注册模块
       └─ 无模块 → 提示执行 git mrepo clone 或 git mrepo add
3. 根据模式输出：
   ├─ 单模块 → 直接运行 git status（原生输出）
   └─ 全部   → 遍历每个模块，汇总关键字段
```

## 使用示例

### 开发前快速检查所有模块

```bash
git mrepo status
# 确认哪些模块有改动、哪些需要推送
```

### 查看某模块的详细改动文件

```bash
git mrepo status auth-service
# 原生 git status 输出，列出具体改动的文件
```

### 确认改动后推送

```bash
git mrepo status auth-service   # 查看改动
git mrepo push auth-service     # 确认后推送
```

## 注意事项

- 配置文件不存在时，提示先执行 `git mrepo init`
- 没有注册任何模块时，提示先执行 `git mrepo clone` 或 `git mrepo add`
- 模块目录不存在时显示提示，不会报错中断
- 模块目录存在但不是 Git 仓库（缺少 `.git`）时显示提示（仅单模块模式）
- 全部概览中的分支来自配置文件，单模块模式显示的是实际 Git 分支

## 与原生 git status 的区别

| 命令 | 范围 | 说明 |
|------|------|------|
| `git status` | 主仓库 | 查看主仓库文件状态 |
| `git mrepo status` | 全部模块 | 简要概览各模块状态 |
| `git mrepo status <module>` | 指定模块 | 等同于在该模块目录执行 `git status` |

**设计理念**：分层管理，概览模式快速定位问题，单模块模式提供完整信息。
