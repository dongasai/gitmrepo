# Tea CLI 试用总结报告

## 试用时间
2026-06-07

## 试用服务器
- **服务器地址**: https://tea.2sxo.com/
- **用户名**: dongasai
- **Tea CLI 版本**: 0.14.1

## 一、登录配置

### 配置步骤
1. 生成完整权限的访问令牌（包含 write:organization 和 write:repository）
2. 使用 `tea login add` 命令配置登录

```bash
tea login add --name 2sxo --url https://tea.2sxo.com/ --token <your_token>
```

### 配置状态
```
┌──────┬──────────────────────┬──────────────┬──────────┬─────────┐
│ NAME │         URL          │   SSH HOST   │   USER   │ DEFAULT │
├──────┼──────────────────────┼──────────────┼──────────┼─────────┤
│ 2sxo │ https://tea.2sxo.com │ tea.2sxo.com │ dongasai │ true   │
└──────┴──────────────────────┴──────────────┴──────────┴─────────┘
```

## 二、组织与仓库管理

### 组织列表
成功查询到 6 个组织：
- d_love
- demo_public
- github
- gitmrepo
- guomu
- ziyouwangluo

### 创建测试仓库
在 gitmrepo 组织下成功创建 4 个测试仓库：

| 仓库名称 | 用途 | SSH 地址 |
|---------|------|----------|
| gitmrepo-test-main | 测试主仓库 | ssh://git@192.168.4.101:32128/gitmrepo/gitmrepo-test-main.git |
| gitmrepo-test-submodule | 测试子模块仓库 | ssh://git@192.168.4.101:32128/gitmrepo/gitmrepo-test-submodule.git |
| gitmrepo-test-clone | 测试克隆仓库 | ssh://git@192.168.4.101:32128/gitmrepo/gitmrepo-test-clone.git |
| gitmrepo-test-sync | 测试同步仓库 | ssh://git@192.168.4.101:32128/gitmrepo/gitmrepo-test-sync.git |

**创建命令示例**:
```bash
tea repos create --owner gitmrepo --name gitmrepo-test-main \
  --description "gitmrepo项目测试主仓库" --private false
``

### 仓库列表
成功列出 dongasai 用户的所有仓库（21个）：

**关键仓库**:
- dongasai/claudecode - Claude Code 项目
- dongasai/demo - Demo 测试仓库
- github/* - GitHub 镜像仓库
- guomu/* - 工作项目仓库

## 三、Issue 管理

### 创建 Issue
成功创建测试 Issues：

```bash
tea issues create --repo gitmrepo/gitmrepo-test-main \
  --title "测试 Issue 1" \
  --description "这是一个测试 Issue，用于验证 gitmrepo 项目功能"
```

**创建结果**:
- Issue #1: 测试 Issue 1
- Issue #2: 测试 Issue 2

### 查询 Issue
```bash
tea issues list --repo gitmrepo/gitmrepo-test-main
```

输出格式：
```
┌───────┬──────────────┬───────┬──────────┬───────────┬────────┬──────────┬────────────────────┐
│ INDEX │    TITLE     │ STATE │  AUTHOR  │ MILESTONE │ LABELS │  OWNER   │        REPO        │
├───────┼──────────────┼───────┼──────────┼───────────┼────────┼──────────┼────────────────────┤
│ 2     │ 测试 Issue 2 │ open  │ dongasai │           │        │ gitmrepo │ gitmrepo-test-main │
│ 1     │ 测试 Issue 1 │ open  │ dongasai │           │        │ gitmrepo │ gitmrepo-test-main │
└───────┴──────────────┴───────┴──────────┴───────────┴────────┴──────────┴────────────────────┘
```

## 四、分支管理

### 查询分支
成功查询远程仓库分支：

```bash
tea branches list --repo gitmrepo/gitmrepo-test-main
```

输出：
```
┌───────────┬───────────┬────────────────────┬───────────────────┐
│   NAME    │ PROTECTED │ USER - CAN - MERGE │ USER - CAN - PUSH │
├───────────┼───────────┼────────────────────┼───────────────────┤
│ demo-test │ false     │ true               │ true              │
└───────────┴───────────┴────────────────────┴───────────────────┘
```

## 五、本地仓库操作

### 测试环境
在 `/data/dongasai/gitmrepo/demo` 目录下进行本地仓库测试：

1. 初始化 Git 仓库
2. 创建测试文件（README.md, main.rs, lib.rs）
3. 推送到远程分支 `demo-test`

### 本地仓库检测问题
**发现的问题**: Tea CLI 的本地仓库自动检测功能存在限制

- `tea issues list` - 可以工作（未检测到 remote）
- `tea pulls list` - 报错：需要指定 --repo
- `tea branches list` - 报错：需要指定 --repo
- `tea pulls create` - 报错：需要本地仓库或指定 --repo

**解决方案**: 使用显式的 `--repo` 参数指定仓库

## 六、常用命令总结

### 用户信息
```bash
tea whoami              # 查看当前用户信息
tea logins list         # 查看所有登录配置
``

### 仓库操作
```bash
tea repos list                      # 列出所有仓库
tea repos list --owner <org>        # 列出指定组织的仓库
tea repos create --owner <org> --name <name>  # 创建仓库
tea repos info <owner/repo>         # 查看仓库详情
```

### Issue 操作
```bash
tea issues list --repo <owner/repo>              # 列出 Issues
tea issues create --repo <owner/repo> \
  --title "标题" --description "描述"            # 创建 Issue
tea issues close --repo <owner/repo> <index>     # 关闭 Issue
tea comment --repo <owner/repo> <index> \
  --content "评论内容"                            # 添加评论
```

### Pull Request 操作
```bash
tea pulls list --repo <owner/repo>               # 列出 PRs
tea pulls create --repo <owner/repo> \
  --base master --head <branch> \
  --title "标题" --description "描述"            # 创建 PR
tea pulls checkout <index>                       # 检出 PR 分支
``

### 分支操作
```bash
tea branches list --repo <owner/repo>            # 列出分支
```

### 其他操作
```bash
tea milestones list --repo <owner/repo>          # 列出里程碑
tea releases list --repo <owner/repo>            # 列出发布版本
tea labels list --repo <owner/repo>              # 列出标签
tea notifications list                           # 查看通知
tea open                                         # 在浏览器中打开仓库
```

## 七、权限说明

### 必需权限
创建仓库和组织操作需要以下权限：

- **write:organization** - 创建组织仓库必需
- **write:repository** - 仓库操作必需
- **write:issue** - Issue/PR 操作必需

### 令牌生成建议
生成访问令牌时建议选择：
- 所有 read 权限
- 所有 write 权限（特别是 write:organization）

## 八、使用建议

### 最佳实践
1. **显式指定仓库**: 由于本地仓库检测不稳定，建议使用 `--repo` 参数
2. **多实例管理**: 可以配置多个 Gitea 实例并切换
3. **SSH 配置**: Tea CLI 自动使用配置的 SSH host
4. **配合 Git 使用**: Tea CLI 是 Git 的补充工具，不是替代

### 限制与注意事项
1. 本地仓库自动检测功能不稳定
2. 创建 PR 需要本地仓库或明确指定参数
3. 权限管理严格，需要完整的令牌权限
4. 某些命令需要在 Git 仓库目录下执行

### 适用场景
- Issue 和 PR 的快速管理
- 仓库和组织的批量操作
- CI/CD 集成中的自动化操作
- 多实例 Gitea 管理
- 查看仓库状态和信息

## 九、对比其他 CLI

### vs GitHub CLI (gh)
- **相似点**: 命令结构和功能类似
- **差异点**: Tea CLI 支持多实例管理，本地检测较弱
- **适用性**: Tea CLI 适合 Gitea 环境，gh 适合 GitHub

### vs Git 命令
- **定位**: Tea CLI 是 Git 的补充，专注 Gitea API 操作
- **互补性**: Git 处理本地操作，Tea CLI 处理远程管理

## 十、总结

### 成功测试的功能
✅ 用户信息查询
✅ 登录配置与管理
✅ 组织列表查询
✅ 仓库列表查询
✅ 仓库创建（需要完整权限）
✅ Issue 创建与查询
✅ 分支查询（显式指定 repo）
✅ 里程碑、发布版本、标签查询

### 存在问题的功能
⚠️ 本地仓库自动检测不稳定
⚠️ Pull Request 创建需要特定条件

### 总体评价
Tea CLI 是一个功能完善的 Gitea 客户端工具，适合：
- 日常 Issue/PR 管理
- 多实例 Gitea 管理
- 自动化脚本集成
- 快速查看仓库状态

建议在实际使用中配合 Git 命令，发挥各自优势。