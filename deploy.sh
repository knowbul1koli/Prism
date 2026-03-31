#!/bin/bash
# ============================================================
#  Prism Panel — 一键部署脚本
#  支持: Debian 11+ / Ubuntu 20.04+
#  用法: bash deploy.sh
# ============================================================
export DEBIAN_FRONTEND=noninteractive
export LANG=en_US.UTF-8

# ── 配置 ─────────────────────────────────────────────────────
PRISM_DIR="/root/prism"
FRONTEND_PORT=50001
BACKEND_PORT=50000
REGISTER_PORT=50002
VER="v1.0.0"
RELEASE_URL="https://github.com/knowbul1koli/Prism/releases/download/${VER}"

# ── 颜色 ─────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 前置检查 ───────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || error "请使用 root 用户运行此脚本"
command -v apt-get &>/dev/null || error "仅支持 Debian/Ubuntu 系统"

# ── 检测中国网络 ─────────────────────────────────────────────
COUNTRY=$(curl -s --connect-timeout 5 https://ipinfo.io/country 2>/dev/null || echo "")
if [ "$COUNTRY" = "CN" ]; then
    RELEASE_URL="https://ghfast.top/${RELEASE_URL}"
    info "检测到国内网络，使用加速镜像"
fi

# ── 生成随机密码 ─────────────────────────────────────────────
rand_str() { tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$1"; }
DB_NAME="prism_$(rand_str 8)"
DB_USER="prism_$(rand_str 8)"
DB_PASS="$(rand_str 24)"
JWT_SECRET="$(rand_str 20)"

# ── 清除 dpkg 锁 ──────────────────────────────────────────────
kill_apt_locks() {
    # 等待已有 apt/dpkg 进程结束（最多 60 秒）
    local waited=0
    while fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock &>/dev/null; do
        if [ $waited -eq 0 ]; then
            warn "等待其他 apt/dpkg 进程结束..."
        fi
        sleep 2
        waited=$((waited + 2))
        if [ $waited -ge 60 ]; then
            warn "超时，强制清除锁..."
            rm -f /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock
            dpkg --configure -a 2>/dev/null
            break
        fi
    done
}

# ── 安装依赖 ─────────────────────────────────────────────────
info "安装系统依赖（可能需要几分钟）..."
kill_apt_locks

# 修复可能损坏的 dpkg 状态
dpkg --configure -a 2>/dev/null || true

# 更新源（显示错误但不中断）
if ! apt-get update -qq 2>&1 | grep -i "err\|fail" ; then
    success "软件源更新完成"
else
    warn "部分源更新失败，继续安装..."
fi

# 逐个安装核心依赖，避免单个包失败导致全部中断
PKGS="curl ca-certificates gnupg nginx mariadb-server openjdk-17-jre-headless python3 python3-pymysql"
for pkg in $PKGS; do
    if dpkg -s "$pkg" &>/dev/null; then
        continue
    fi
    info "  安装 $pkg ..."
    if ! apt-get install -y -qq "$pkg" 2>&1 | tail -5; then
        # openjdk-17 在部分旧系统上包名不同
        if [ "$pkg" = "openjdk-17-jre-headless" ]; then
            warn "  openjdk-17 安装失败，尝试 openjdk-11..."
            apt-get install -y -qq openjdk-11-jre-headless 2>&1 | tail -3 || error "Java 运行时安装失败，请手动安装 openjdk-17-jre-headless"
        else
            error "安装 $pkg 失败"
        fi
    fi
done
success "系统依赖安装完成"

# Node.js 18+
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
    info "安装 Node.js 18..."
    # 先装前置依赖
    apt-get install -y -qq apt-transport-https 2>/dev/null || true
    if ! curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 2>&1 | tail -3; then
        error "NodeSource 源配置失败，请检查网络"
    fi
    apt-get install -y -qq nodejs 2>&1 | tail -3 || error "Node.js 安装失败"
    success "Node.js $(node -v) 安装完成"
fi

# ── 启动 MariaDB ─────────────────────────────────────────────
systemctl enable --now mariadb > /dev/null 2>&1
# 等待 MariaDB 就绪
for i in $(seq 1 15); do
    mysqladmin ping &>/dev/null && break
    sleep 1
done
mysqladmin ping &>/dev/null || error "MariaDB 启动失败"

# ── 创建数据库 ───────────────────────────────────────────────
info "初始化数据库..."
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" || error "创建数据库失败"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';" || error "创建数据库用户失败"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1'; FLUSH PRIVILEGES;" || error "授权失败"
mysql "${DB_NAME}" < "${PRISM_DIR}/schema.sql" || error "导入数据库结构失败"
success "数据库初始化完成"

# ── 写入 .env ────────────────────────────────────────────────
cat > "${PRISM_DIR}/.env" <<EOF
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
REGISTER_PORT=${REGISTER_PORT}
EOF
chmod 600 "${PRISM_DIR}/.env"

# ── 下载 backend.jar (如果不存在) ────────────────────────────
if [ ! -f "${PRISM_DIR}/backend.jar" ]; then
    info "下载 backend.jar（约 52MB）..."
    curl -fSL --retry 3 --retry-delay 5 -o "${PRISM_DIR}/backend.jar" "${RELEASE_URL}/backend.jar" || error "下载 backend.jar 失败，请检查网络"
    [ -s "${PRISM_DIR}/backend.jar" ] || error "backend.jar 下载不完整"
    success "backend.jar 下载完成"
fi

# ── 配置注册代理 ─────────────────────────────────────────────
info "配置注册代理..."
sed -i "s/^DB_USER = .*/DB_USER = \"${DB_USER}\"/" "${PRISM_DIR}/register_proxy.py"
sed -i "s/^DB_PASS = .*/DB_PASS = \"${DB_PASS}\"/" "${PRISM_DIR}/register_proxy.py"
sed -i "s/^DB_NAME = .*/DB_NAME = \"${DB_NAME}\"/" "${PRISM_DIR}/register_proxy.py"

# ── 构建前端 ─────────────────────────────────────────────────
info "构建前端..."

# 低内存机器自动添加 swap 防止 OOM
TOTAL_MEM=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_ADDED=0
if [ "$TOTAL_MEM" -lt 1500 ] && [ ! -f /swapfile ]; then
    info "内存不足 1.5GB，创建临时 swap..."
    fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024 2>/dev/null
    chmod 600 /swapfile
    mkswap /swapfile > /dev/null 2>&1
    swapon /swapfile 2>/dev/null
    SWAP_ADDED=1
fi

cd "${PRISM_DIR}/ui"
export NODE_OPTIONS="--max-old-space-size=512"
npm install --silent 2>&1 | tail -5 || error "npm install 失败"
npm run build 2>&1 | tail -5 || error "前端构建失败"
rm -rf /var/www/html/prism
cp -r dist /var/www/html/prism
cd "${PRISM_DIR}"

# 清理临时 swap
if [ "$SWAP_ADDED" -eq 1 ]; then
    swapoff /swapfile 2>/dev/null
    rm -f /swapfile
fi
success "前端构建完成"

# ── Nginx 配置 ───────────────────────────────────────────────
info "配置 Nginx..."
cat > /etc/nginx/conf.d/prism.conf <<'NGINX'
server {
    listen 50001;
    root /var/www/html/prism;
    index index.html;
    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /api/v1/user/register {
        proxy_pass http://127.0.0.1:50002/api/v1/user/register;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    location = /api/v1/user/init-status {
        proxy_pass http://127.0.0.1:50002/api/v1/user/init-status;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 10s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:50000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Authorization $http_authorization;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location /system-info {
        proxy_pass http://127.0.0.1:50000/system-info;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}
NGINX
# 删除默认站点避免冲突
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t 2>&1 || error "Nginx 配置检测失败"
systemctl enable --now nginx > /dev/null 2>&1
systemctl reload nginx
success "Nginx 配置完成"

# ── Systemd 服务 ─────────────────────────────────────────────
info "创建系统服务..."

cat > /etc/systemd/system/prism-backend.service <<EOF
[Unit]
Description=Prism Panel Backend
After=network.target mariadb.service

[Service]
Type=simple
User=root
WorkingDirectory=${PRISM_DIR}
ExecStart=/usr/bin/java -Xms256m -Xmx512m \
    -DLOG_DIR=${PRISM_DIR}/logs \
    -DJWT_SECRET=${JWT_SECRET} \
    -Dspring.datasource.url=jdbc:mysql://127.0.0.1:3306/${DB_NAME}?useUnicode=true&characterEncoding=UTF-8&useSSL=false \
    -Dspring.datasource.username=${DB_USER} \
    -Dspring.datasource.password=${DB_PASS} \
    -Dserver.port=${BACKEND_PORT} \
    -jar ${PRISM_DIR}/backend.jar \
    --spring.config.additional-location=file:${PRISM_DIR}/application.properties
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/prism-register.service <<EOF
[Unit]
Description=Prism Registration Proxy
After=network.target mariadb.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${PRISM_DIR}/register_proxy.py
Restart=always
RestartSec=3
WorkingDirectory=${PRISM_DIR}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now prism-backend prism-register
success "服务已创建并启动"

# ── 等待后端启动 ─────────────────────────────────────────────
info "等待后端启动（Java 首次启动较慢）..."
BACKEND_READY=0
for i in $(seq 1 45); do
    if curl -s http://127.0.0.1:${BACKEND_PORT}/api/v1/user/login > /dev/null 2>&1; then
        BACKEND_READY=1
        break
    fi
    sleep 2
done
if [ "$BACKEND_READY" -eq 1 ]; then
    success "后端启动成功"
else
    warn "后端尚未就绪，可能需要更多时间启动（查看日志: journalctl -fu prism-backend）"
fi

# ── 获取公网 IP ──────────────────────────────────────────────
PUBLIC_IP=$(curl -s --connect-timeout 5 https://api.ipify.org 2>/dev/null || curl -s --connect-timeout 5 https://ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

# ── 完成 ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Prism Panel 部署完成！${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  面板地址:  ${CYAN}http://${PUBLIC_IP}:${FRONTEND_PORT}${NC}"
echo -e "  首次访问自动进入管理员注册页面"
echo ""
echo -e "  管理命令:"
echo -e "    systemctl status  prism-backend   # 后端状态"
echo -e "    systemctl status  prism-register   # 注册代理状态"
echo -e "    journalctl -fu    prism-backend    # 后端日志"
echo ""
