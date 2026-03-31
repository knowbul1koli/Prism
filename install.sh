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
warn() { echo -e "${YELLOW}[!]${NC} $*"; }

[[ $EUID -ne 0 ]] && error "请使用 root 权限运行"

INSTALL_DIR="/root/prism"
RELEASE_URL="https://github.com/knowbul1koli/Prism/releases/latest/download"

echo -e "${CYAN}"
cat << 'BANNER'
╔═══════════════════════════════════════╗
║     🌟 Prism Panel 一键部署工具       ║
╚═══════════════════════════════════════╝
BANNER
echo -e "${NC}"

info "检测系统环境..."
. /etc/os-release
info "系统: $PRETTY_NAME"
info "架构: $(uname -m)"

info "下载 Prism 安装包..."
mkdir -p /tmp/prism-install
cd /tmp/prism-install
curl -fsSL "${RELEASE_URL}/prism.tar.gz" -o prism.tar.gz || error "下载失败"
success "下载完成"

info "解压安装包..."
tar xzf prism.tar.gz
success "解压完成"

info "安装到 ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
cp -r prism/* "${INSTALL_DIR}/"
cd "${INSTALL_DIR}"
chmod +x install_prism.sh
success "文件部署完成"

info "开始安装服务..."
bash install_prism.sh

cd /
rm -rf /tmp/prism-install
success "安装完成！"
