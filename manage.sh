#!/bin/bash
# ============================================================
#  Prism Panel 管理脚本
#  基于 flux-panel (go-gost + Spring Boot + MySQL + Docker)
#  目录: /root/prism
# ============================================================
set -e
export LANG=en_US.UTF-8
export LC_ALL=C

PRISM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PRISM_DIR"

# ── 下载地址 ────────────────────────────────────────────────
VER="v1.0.0"
BASE_URL="https://github.com/knowbul1koli/Prism/releases/download/${VER}"
DOCKER_COMPOSEV4_URL="${BASE_URL}/docker-compose-v4.yml"
DOCKER_COMPOSEV6_URL="${BASE_URL}/docker-compose-v6.yml"
GOST_SQL_URL="${BASE_URL}/gost.sql"

# 国内加速
COUNTRY=$(curl -s --connect-timeout 5 https://ipinfo.io/country 2>/dev/null || echo "")
if [ "$COUNTRY" = "CN" ]; then
    DOCKER_COMPOSEV4_URL="https://ghfast.top/${DOCKER_COMPOSEV4_URL}"
    DOCKER_COMPOSEV6_URL="https://ghfast.top/${DOCKER_COMPOSEV6_URL}"
    GOST_SQL_URL="https://ghfast.top/${GOST_SQL_URL}"
fi

# ── 颜色输出 ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}ℹ️  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; }

# ── 工具函数 ────────────────────────────────────────────────
generate_random() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c16
}

check_docker() {
    if command -v docker-compose &>/dev/null; then
        DOCKER_CMD="docker-compose"
    elif docker compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker compose"
    else
        error "未检测到 docker 或 docker-compose，请先安装 Docker"
        exit 1
    fi
    info "Docker 命令: $DOCKER_CMD"
}

check_ipv6() {
    if ip -6 addr show 2>/dev/null | grep -v "scope link" | grep -q "inet6"; then
        return 0
    fi
    return 1
}

get_compose_url() {
    if check_ipv6; then
        echo "$DOCKER_COMPOSEV6_URL"
    else
        echo "$DOCKER_COMPOSEV4_URL"
    fi
}

configure_docker_ipv6() {
    info "配置 Docker IPv6 支持..."
    local cfg="/etc/docker/daemon.json"
    if [ -f "$cfg" ] && grep -q '"ipv6"' "$cfg"; then
        success "Docker 已配置 IPv6"
        return
    fi
    mkdir -p /etc/docker
    if [ -f "$cfg" ]; then
        cp "$cfg" "${cfg}.bak"
        if command -v jq &>/dev/null; then
            jq '. + {"ipv6": true, "fixed-cidr-v6": "fd00::/80"}' "$cfg" > /tmp/daemon.json \
                && mv /tmp/daemon.json "$cfg"
        else
            sed -i 's/^{$/{\n  "ipv6": true,\n  "fixed-cidr-v6": "fd00::\/80",/' "$cfg"
        fi
    else
        cat > "$cfg" <<'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/80"
}
EOF
    fi
    systemctl restart docker 2>/dev/null || service docker restart 2>/dev/null || true
    sleep 3
    success "Docker IPv6 配置完成"
}

load_env() {
    if [ -f "$PRISM_DIR/.env" ]; then
        # shellcheck disable=SC1091
        set -a; source "$PRISM_DIR/.env"; set +a
    fi
}

# ── 获取服务器 IP ────────────────────────────────────────────
get_server_ip() {
    curl -s --connect-timeout 5 https://ipinfo.io/ip 2>/dev/null \
        || hostname -I 2>/dev/null | awk '{print $1}' \
        || echo "YOUR_SERVER_IP"
}

# ════════════════════════════════════════════════════════════
#  安装
# ════════════════════════════════════════════════════════════
install_panel() {
    echo ""
    info "═══════ 开始安装 Prism Panel ═══════"
    check_docker

    # 随机生成密钥 (仅当 .env 不存在时)
    if [ -f "$PRISM_DIR/.env" ]; then
        warn ".env 已存在，将加载现有配置..."
        load_env
    fi

    DB_NAME=${DB_NAME:-$(generate_random)}
    DB_USER=${DB_USER:-$(generate_random)}
    DB_PASSWORD=${DB_PASSWORD:-$(generate_random)}
    JWT_SECRET=${JWT_SECRET:-$(generate_random)}
    FRONTEND_PORT=${FRONTEND_PORT:-6366}
    BACKEND_PORT=${BACKEND_PORT:-6365}

    # 端口配置
    if [ -t 0 ]; then
        read -p "  前端端口 (当前: $FRONTEND_PORT): " NEW_FRONTEND_PORT
        FRONTEND_PORT=${NEW_FRONTEND_PORT:-$FRONTEND_PORT}
        read -p "  后端端口 (当前: $BACKEND_PORT): " NEW_BACKEND_PORT
        BACKEND_PORT=${NEW_BACKEND_PORT:-$BACKEND_PORT}
    fi

    # 下载 docker-compose.yml
    info "下载 docker-compose.yml ..."
    local COMPOSE_URL
    COMPOSE_URL=$(get_compose_url)
    info "使用配置文件: $(basename "$COMPOSE_URL")"
    curl -fsSL -o "$PRISM_DIR/docker-compose.yml" "$COMPOSE_URL"

    # 下载 gost.sql
    if [ -f "$PRISM_DIR/gost.sql" ]; then
        warn "gost.sql 已存在，跳过下载"
    else
        info "下载数据库初始化文件 ..."
        curl -fsSL -o "$PRISM_DIR/gost.sql" "$GOST_SQL_URL"
    fi

    # IPv6 处理
    if check_ipv6; then
        info "检测到 IPv6，自动配置 Docker IPv6 支持..."
        configure_docker_ipv6
    fi

    # 写入 .env
    cat > "$PRISM_DIR/.env" <<EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_PORT=$BACKEND_PORT
EOF
    success ".env 配置文件已生成"

    # 启动服务
    info "启动 Docker 服务..."
    cd "$PRISM_DIR"
    $DOCKER_CMD up -d

    SERVER_IP=$(get_server_ip)
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}  🎉 Prism Panel 安装完成！${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "  🌐 访问地址  : ${CYAN}http://${SERVER_IP}:${FRONTEND_PORT}${NC}"
    echo -e "  🔌 后端地址  : ${CYAN}http://${SERVER_IP}:${BACKEND_PORT}${NC}"
    echo -e "  👤 管理员账号: ${YELLOW}admin_user${NC}"
    echo -e "  🔑 管理员密码: ${YELLOW}admin_user${NC}"
    echo -e "  📁 数据目录  : ${CYAN}${PRISM_DIR}${NC}"
    echo -e "${RED}  ⚠️  请登录后立即修改默认密码！${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
}

# ════════════════════════════════════════════════════════════
#  更新
# ════════════════════════════════════════════════════════════
update_panel() {
    echo ""
    info "═══════ 更新 Prism Panel ═══════"
    check_docker
    load_env

    info "下载最新 docker-compose.yml ..."
    local COMPOSE_URL
    COMPOSE_URL=$(get_compose_url)
    curl -fsSL -o "$PRISM_DIR/docker-compose.yml" "$COMPOSE_URL"

    if check_ipv6; then
        configure_docker_ipv6
    fi

    cd "$PRISM_DIR"
    info "停止旧服务..."
    $DOCKER_CMD down

    info "拉取最新镜像..."
    $DOCKER_CMD pull

    info "启动新服务..."
    $DOCKER_CMD up -d

    success "更新完成，服务已重启"
    status_panel
}

# ════════════════════════════════════════════════════════════
#  卸载
# ════════════════════════════════════════════════════════════
uninstall_panel() {
    echo ""
    warn "═══════ 卸载 Prism Panel ═══════"
    check_docker
    echo -e "${RED}此操作将删除所有容器、镜像和数据库数据！${NC}"
    read -p "确认卸载? (输入 yes 确认): " confirm
    if [ "$confirm" != "yes" ]; then
        info "取消卸载"
        return
    fi

    cd "$PRISM_DIR"
    if [ -f "docker-compose.yml" ]; then
        $DOCKER_CMD down --rmi all --volumes --remove-orphans 2>/dev/null || true
    fi

    rm -f "$PRISM_DIR/docker-compose.yml" \
          "$PRISM_DIR/gost.sql" \
          "$PRISM_DIR/.env"

    success "卸载完成"
}

# ════════════════════════════════════════════════════════════
#  状态
# ════════════════════════════════════════════════════════════
status_panel() {
    echo ""
    info "═══════ Prism Panel 服务状态 ═══════"
    check_docker
    load_env
    cd "$PRISM_DIR"
    $DOCKER_CMD ps 2>/dev/null || docker ps --filter "name=springboot\|name=gost\|name=vue" 2>/dev/null

    SERVER_IP=$(get_server_ip)
    FRONTEND_PORT=${FRONTEND_PORT:-6366}
    BACKEND_PORT=${BACKEND_PORT:-6365}
    echo ""
    echo -e "  🌐 访问地址: ${CYAN}http://${SERVER_IP}:${FRONTEND_PORT}${NC}"
    echo -e "  🔌 后端地址: ${CYAN}http://${SERVER_IP}:${BACKEND_PORT}${NC}"
}

# ════════════════════════════════════════════════════════════
#  备份数据库
# ════════════════════════════════════════════════════════════
backup_db() {
    echo ""
    info "═══════ 备份数据库 ═══════"
    load_env

    if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        error "无法读取数据库配置，请确认 .env 文件存在"
        return 1
    fi

    if ! docker ps --format "{{.Names}}" | grep -q "^gost-mysql$"; then
        error "数据库容器 gost-mysql 未运行"
        return 1
    fi

    local SQL_FILE="$PRISM_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    info "导出数据库到 $SQL_FILE ..."

    if docker exec gost-mysql mysqldump \
        -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction --routines --triggers \
        "$DB_NAME" > "$SQL_FILE" 2>/dev/null; then
        success "备份完成: $SQL_FILE ($(du -h "$SQL_FILE" | cut -f1))"
    else
        error "备份失败"
        rm -f "$SQL_FILE"
    fi
}

# ════════════════════════════════════════════════════════════
#  查看日志
# ════════════════════════════════════════════════════════════
logs_panel() {
    check_docker
    cd "$PRISM_DIR"
    echo -e "${CYAN}选择查看日志的服务：${NC}"
    echo "  1. 后端服务 (springboot-backend)"
    echo "  2. 数据库 (gost-mysql)"
    echo "  3. 前端 (vue-frontend)"
    echo "  4. 全部服务"
    read -p "请选择 (1-4): " log_choice
    case $log_choice in
        1) $DOCKER_CMD logs -f --tail=100 springboot-backend 2>/dev/null || docker logs -f --tail=100 springboot-backend ;;
        2) $DOCKER_CMD logs -f --tail=100 gost-mysql 2>/dev/null || docker logs -f --tail=100 gost-mysql ;;
        3) $DOCKER_CMD logs -f --tail=100 vue-frontend 2>/dev/null || docker logs -f --tail=100 vue-frontend ;;
        4) $DOCKER_CMD logs -f --tail=50 2>/dev/null ;;
        *) warn "无效选项" ;;
    esac
}

# ════════════════════════════════════════════════════════════
#  重启服务
# ════════════════════════════════════════════════════════════
restart_panel() {
    check_docker
    cd "$PRISM_DIR"
    info "重启所有服务..."
    $DOCKER_CMD restart
    success "服务已重启"
}

# ════════════════════════════════════════════════════════════
#  主菜单
# ════════════════════════════════════════════════════════════
show_menu() {
    clear
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║        🌟 Prism Panel 管理面板         ║"
    echo "  ║    基于 flux-panel / go-gost           ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    echo "  1. 🚀 安装面板"
    echo "  2. 🔄 更新面板"
    echo "  3. 🗑️  卸载面板"
    echo "  4. 📊 查看状态"
    echo "  5. 🔁 重启服务"
    echo "  6. 📋 查看日志"
    echo "  7. 💾 备份数据库"
    echo "  8. 📖 查看使用指南"
    echo "  9. 👋 退出"
    echo ""
    echo -e "  ${YELLOW}面板目录: ${PRISM_DIR}${NC}"
    echo ""
}

show_guide() {
    clear
    echo -e "${CYAN}═══════════════ 使用指南 ═══════════════${NC}"
    cat << 'GUIDE'

【第一步】登录系统
  • 地址: http://服务器IP:6366
  • 账号: admin_user / admin_user
  • ⚠️  登录后立即修改密码！

【第二步】创建节点
  • 菜单 → 节点管理 → 新增节点
  • 填写：节点名称、服务器IP、入口IP、端口范围
  • 保存后复制安装命令

【第三步】安装节点 Agent
  • 在目标转发服务器上执行面板复制的命令
  • 命令格式:
    bash <(curl -sSL http://面板IP:6365/agent/install) \
         -a 面板IP:6365 -s 节点密钥

  • 也可直接使用: bash /root/prism/node_install.sh

【第四步】创建隧道
  • 菜单 → 隧道管理 → 新增隧道
  • 端口转发: 单节点直接端口映射
  • 隧道转发: 入口→出口节点之间建立加密隧道
  • 监听地址: IPv4 填 0.0.0.0，IPv6 填 [::]

【第五步】创建转发
  • 菜单 → 转发管理 → 新增转发
  • 选择隧道，配置入口端口（留空自动分配）
  • 填写远程地址: 192.168.1.100:8080

【用户管理（可选）】
  • 菜单 → 用户管理 → 新增用户
  • 设置流量限额、转发数量、过期时间
  • 为用户分配隧道权限

【限速规则（可选）】
  • 菜单 → 限速规则 → 新增限速
  • 设置带宽限制 (Mbps)，绑定隧道

GUIDE
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "  📚 完整文档: ${BLUE}https://tes.cc/guide.html${NC}"
    echo ""
    read -p "按 Enter 返回主菜单..."
}

main() {
    # 检查 root 权限
    if [ "$EUID" -ne 0 ]; then
        warn "建议以 root 权限运行此脚本"
    fi

    while true; do
        show_menu
        read -p "  请选择操作 (1-9): " choice
        case $choice in
            1) install_panel ;;
            2) update_panel ;;
            3) uninstall_panel ;;
            4) status_panel ;;
            5) restart_panel ;;
            6) logs_panel ;;
            7) backup_db ;;
            8) show_guide ;;
            9) echo -e "${GREEN}👋 再见！${NC}"; exit 0 ;;
            *) warn "无效选项，请输入 1-9" ;;
        esac
        echo ""
        read -p "按 Enter 继续..."
    done
}

main
