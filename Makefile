# Git-mrepo Makefile
# 版本管理与构建自动化

# 项目根目录
PROJECT_ROOT := $(shell pwd)
VERSION_MANAGER := $(PROJECT_ROOT)/scripts/version-manager
NPM_DIR := $(PROJECT_ROOT)/npm

# Cargo 命令
CARGO := cargo
CARGO_BUILD := $(CARGO) build
CARGO_BUILD_RELEASE := $(CARGO) build --release
CARGO_TEST := $(CARGO) test
CARGO_CLEAN := $(CARGO) clean
CARGO_FMT := $(CARGO) fmt

# 版本管理器
VERSION_TOOL := cd $(VERSION_MANAGER) && $(CARGO) run --quiet --

.PHONY: debug release test clean format release-full version-patch version-minor version-major show-version npm-publish

# 默认目标
.DEFAULT_GOAL := help

# 帮助信息
help:
	@echo "Git-mrepo 构建命令:"
	@echo "  make debug         - 递增 patch 版本并构建 debug 版本"
	@echo "  make release       - 递增 minor 版本并构建 release 版本"
	@echo "  make test          - 运行测试（不影响版本）"
	@echo "  make clean         - 清理构建产物"
	@echo "  make format         - 格式化代码"
	@echo "  make release-full  - 完整发布流程（test + format + release）"
	@echo ""
	@echo "版本管理命令:"
	@echo "  make version-patch - 仅递增 patch 版本"
	@echo "  make version-minor - 仅递增 minor 版本"
	@echo "  make version-major - 仅递增 major 版本"
	@echo "  make show-version  - 显示当前版本"
	@echo ""
	@echo "npm 发布命令:"
	@echo "  make npm-publish   - 发布到 npm（二进制从 GitHub Release 下载）"

# Debug 构建（递增 patch 版本）
debug: version-patch
	$(CARGO_BUILD)

# Release 构建（递增 minor 版本）
release: version-minor
	$(CARGO_BUILD_RELEASE)

# 完整发布流程
release-full: test format release
	@echo "✓ 完整发布流程完成"

# 运行测试
test:
	$(CARGO_TEST)

# 清理构建产物
clean:
	$(CARGO_CLEAN)

# 格式化代码
format:
	$(CARGO_FMT)

# 版本管理命令
version-patch:
	$(VERSION_TOOL) patch

version-minor:
	$(VERSION_TOOL) minor

version-major:
	$(VERSION_TOOL) major

show-version:
	$(VERSION_TOOL) show

# npm 发布（同步版本号 + 发布）
npm-publish:
	@echo "同步版本号..."
	@VERSION=$$(grep '^version' Cargo.toml | sed 's/.*"\(.*\)".*/\1/'); \
	cd $(NPM_DIR) && npm version $$VERSION --no-git-tag-version
	@echo "发布到 npm..."
	cd $(NPM_DIR) && npm publish --access public
	@echo "✓ 发布完成"