# git模块化仓库(母子仓库)

> 解决模块化开发中,`模块仓库`和`项目仓库`的关联问题

1. 主仓库和子仓库没有直接git关系,独立性很强,通过本工具进行关联
2. 同一个文件被主仓库和子仓库管理
3. 本质是**项目仓库**通过忽略**模块仓库**的`.git`的方式来实现`项目仓库`和`模块仓库`独立管理

## 规划

1. npm命令,gitmrepo
2. 可用子命令
```
gitmrepo -h    # Help Overview
gitmrepo init # 初始化配置

gitmrepo clone/add <remote-url> [<subdir>]
gitmrepo pull <subdir>
gitmrepo push <subdir>

gitmrepo fetch <subdir>
gitmrepo branch <subdir>
gitmrepo commit <subdir>
gitmrepo config <subdir>

gitmrepo status [<subdir>]
gitmrepo clean <subdir>

gitmrepo help [<command> | --all]
gitmrepo version

```
3. `.gitmrepo`配置文件格式
```yaml

```