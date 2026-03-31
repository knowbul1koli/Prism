#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && error "请使用 root 权限运行"

INSTALL_DIR="/root/prism"
RELEASE_URL="${PRISM_RELEASE_URL:-https://github.com/knowbul1koli/Prism/releases/latest/download}"

echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🌟 Prism Panel 一键部署工具       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""

info "检测系统环境..."
. /etc/os-release
info "系统: $PRETTY_NAME ($(uname -m))"

info "下载安装包..."
mkdir -p /tmp/prism-install
cd /tmp/prism-install

if ! curl -fsSL "${RELEASE_URL}/prism.tar.gz" -o prism.tar.gz; then
    error "下载失败，请检查网络或 Release 是否已发布"
fi
success "下载完成"

info "解压安装包..."
tar xzf prism.tar.gz
cd prism

info "下载后端服务..."
if ! curl -fsSL "${RELEASE_URL}/backend.jar" -o backend.jar; then
    error "下载 backend.jar 失败"
fi
success "后端下载完成"

info "安装到 ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
cp -r * "${INSTALL_DIR}/"
cd "${INSTALL_DIR}"
chmod +x install_prism.sh

info "开始安装服务..."
bash install_prism.sh

cd /
rm -rf /tmp/prism-install
success "安装完成！"
