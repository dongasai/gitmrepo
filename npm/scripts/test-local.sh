#!/usr/bin/env bash
# 本地测试 npm 包（只构建当前平台）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== 本地测试 npm 包 ==="
echo ""

# 1. 构建当前平台
echo "1. 构建当前平台..."
make npm-build

# 2. 全局安装测试
echo ""
echo "2. 全局安装..."
cd npm
npm link

# 3. 测试命令
echo ""
echo "3. 测试命令..."
git-mrepo --version

echo ""
echo "=== 测试完成 ==="
echo ""
echo "卸载: npm unlink -g @aspect/git-mrepo"
