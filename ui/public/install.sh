#!/bin/bash

get_arch() {
    case $(uname -m) in
        x86_64)         echo "amd64" ;;
        aarch64|arm64)  echo "arm64" ;;
        *)              echo "amd64" ;;
    esac
}

ARCH=$(get_arch)
INSTALL_DIR="/etc/gost"

show_menu() {
  echo "==============================================="
  echo "              节点管理"
  echo "==============================================="
  echo "请选择操作："
  echo "1. 安装"
  echo "2. 更新"
  echo "3. 卸载"
  echo "4. 退出"
  echo "==============================================="
}

delete_self() {
  echo ""
  echo "🗑️ 操作已完成，正在清理脚本文件..."
  SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
  sleep 1
  rm -f "$SCRIPT_PATH" && echo "✅ 脚本文件已删除" || echo "❌ 删除脚本文件失败"
}

check_and_install_tcpkill() {
  command -v tcpkill &>/dev/null && return 0
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case $ID in
      ubuntu|debian) apt-get update -qq && apt-get install -y -qq dsniff 2>/dev/null || true ;;
      centos|rhel|fedora) (dnf install -y dsniff 2>/dev/null || yum install -y dsniff 2>/dev/null) || true ;;
      alpine) apk add --no-cache dsniff 2>/dev/null || true ;;
    esac
  fi
}

PANEL_BASE=""
SERVER_ADDR=""
SECRET=""

while getopts "p:a:s:" opt; do
  case $opt in
    p) PANEL_BASE="$OPTARG" ;;
    a) SERVER_ADDR="$OPTARG" ;;
    s) SECRET="$OPTARG" ;;
    *) echo "❌ 无效参数"; exit 1 ;;
  esac
done

if [ -z "$PANEL_BASE" ] && [ -n "$SERVER_ADDR" ]; then
    PANEL_BASE="http://${SERVER_ADDR%:*}:80"
fi

if [ -z "$PANEL_BASE" ]; then
    read -p "面板前端URL地址 (如 http://1.2.3.4:80): " PANEL_BASE
fi

DOWNLOAD_URL="${PANEL_BASE}/gost-${ARCH}"

get_params() {
  if [ -z "$SERVER_ADDR" ]; then
    read -p "面板后端地址 (如 1.2.3.4:50000): " SERVER_ADDR
  fi
  if [ -z "$SECRET" ]; then
    read -p "节点密钥: " SECRET
  fi
  if [ -z "$SERVER_ADDR" ] || [ -z "$SECRET" ]; then
    echo "❌ 参数不完整，操作取消。"
    exit 1
  fi
}

install_gost() {
  echo "🚀 开始安装 GOST 节点 Agent..."
  get_params
  check_and_install_tcpkill

  mkdir -p "$INSTALL_DIR"

  if systemctl list-units --full -all 2>/dev/null | grep -Fq "gost.service"; then
    echo "🔍 检测到已存在的gost服务"
    systemctl stop gost 2>/dev/null && echo "🛑 停止服务"
    systemctl disable gost 2>/dev/null && echo "🚫 禁用自启"
  fi

  [ -f "$INSTALL_DIR/gost" ] && rm -f "$INSTALL_DIR/gost"

  echo "⬇️ 下载 gost 中... ($DOWNLOAD_URL)"
  curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/gost"
  if [[ ! -f "$INSTALL_DIR/gost" || ! -s "$INSTALL_DIR/gost" ]]; then
    echo "❌ 下载失败，请检查网络或面板地址 ($DOWNLOAD_URL)。"
    exit 1
  fi
  chmod +x "$INSTALL_DIR/gost"
  echo "✅ 下载完成"
  echo "🔎 gost 版本：$($INSTALL_DIR/gost -V 2>/dev/null || echo '未知')"

  cat > "$INSTALL_DIR/config.json" <<CFG
{
  "addr": "$SERVER_ADDR",
  "secret": "$SECRET"
}
CFG

  if [[ ! -f "$INSTALL_DIR/gost.json" ]]; then
    echo '{}' > "$INSTALL_DIR/gost.json"
  fi

  chmod 600 "$INSTALL_DIR"/*.json

  cat > /etc/systemd/system/gost.service <<SRV
[Unit]
Description=Gost Proxy Service
After=network.target

[Service]
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/gost
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SRV

  systemctl daemon-reload
  systemctl enable gost
  systemctl start gost
  sleep 2

  if systemctl is-active --quiet gost; then
    echo "✅ 安装完成，系统状态监控已经激活，节点服务已启动并设置为开机启动。"
    echo "📁 配置目录: $INSTALL_DIR"
  else
    echo "❌ gost服务启动失败，请执行以下命令查看日志："
    echo "journalctl -u gost -f"
  fi
}

update_gost() {
  echo "🔄 开始更新 GOST..."
  [ -d "$INSTALL_DIR" ] || { echo "❌ GOST 未安装，请先选择安装。"; return 1; }

  echo "⬇️ 下载新版本... ($DOWNLOAD_URL)"
  curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/gost.new"
  [[ ! -f "$INSTALL_DIR/gost.new" || ! -s "$INSTALL_DIR/gost.new" ]] && { echo "❌ 下载失败。"; return 1; }

  systemctl stop gost 2>/dev/null || true
  mv "$INSTALL_DIR/gost.new" "$INSTALL_DIR/gost"
  chmod +x "$INSTALL_DIR/gost"
  echo "🔎 新版本：$($INSTALL_DIR/gost -V 2>/dev/null || echo '未知')"
  systemctl start gost
  echo "✅ 更新完成，服务已重新启动。"
}

uninstall_gost() {
  echo "🗑️ 开始卸载 GOST..."
  read -p "确认卸载 GOST 吗？此操作将删除所有相关文件 (y/N): " confirm
  [[ "$confirm" != "y" && "$confirm" != "Y" ]] && { echo "❌ 取消卸载"; return 0; }

  systemctl stop gost 2>/dev/null || true
  systemctl disable gost 2>/dev/null || true
  rm -f /etc/systemd/system/gost.service
  rm -rf "$INSTALL_DIR"
  systemctl daemon-reload
  echo "✅ 卸载完成"
}

main() {
  if [[ -n "$SERVER_ADDR" && -n "$SECRET" ]]; then
    install_gost
    delete_self
    exit 0
  fi

  while true; do
    show_menu
    read -p "请输入选项 (1-4): " choice
    case $choice in
      1) install_gost; delete_self; exit 0 ;;
      2) update_gost; delete_self; exit 0 ;;
      3) uninstall_gost; delete_self; exit 0 ;;
      4) echo "👋 退出脚本"; delete_self; exit 0 ;;
      *) echo "❌ 无效选项" ;;
    esac
  done
}

main
