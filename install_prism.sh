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

generate_random() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c16
}

[[ $EUID -ne 0 ]] && error "请使用 root 权限运行"

PRISM_DIR="/root/prism"
cd "$PRISM_DIR" || error "目录不存在"

echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🌟 Prism Panel 安装程序          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""

# 1. 安装 Docker
info "[1/8] 检查 Docker..."
if ! command -v docker &>/dev/null; then
    info "安装 Docker..."
    apt-get update -qq
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    success "Docker 安装完成"
else
    success "Docker 已安装"
fi

# 2. 安装 MySQL
info "[2/8] 检查 MySQL..."
if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mariadb; then
    info "安装 MariaDB..."
    apt-get install -y mariadb-server
    systemctl enable --now mariadb
    success "MariaDB 安装完成"
else
    success "MySQL 已运行"
fi

# 3. 生成 .env 配置
info "[3/8] 生成配置文件..."
if [[ ! -f .env ]]; then
    DB_NAME="prism_$(generate_random | cut -c1-8)"
    DB_USER="prism_$(generate_random | cut -c1-8)"
    DB_PASS="$(generate_random)$(generate_random)"
    JWT_SECRET="$(generate_random)$(generate_random)"
    
    cat > .env << ENV_EOF
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
BACKEND_PORT=50000
FRONTEND_PORT=50001
REGISTER_PORT=50002
LOG_DIR=/root/prism/logs
ENV_EOF
    success "配置文件已生成"
else
    success "配置文件已存在"
fi

source .env

# 4. 初始化数据库
info "[4/8] 初始化数据库..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};" 2>/dev/null
mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null
mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1'; FLUSH PRIVILEGES;" 2>/dev/null

if ! mysql -u root ${DB_NAME} -e "SHOW TABLES LIKE 'user';" | grep -q user; then
    info "导入数据库结构..."
    mysql -u root ${DB_NAME} < schema.sql
    success "数据库结构已导入"
else
    success "数据库已存在"
fi

# 5. 安装 Python 依赖
info "[5/8] 安装 Python 依赖..."
apt-get install -y python3-pymysql > /dev/null 2>&1
success "Python 依赖已安装"

# 6. 启动后端服务
info "[6/8] 启动后端服务..."
mkdir -p logs
docker rm -f prism-backend 2>/dev/null || true
docker run -d --name prism-backend --network host --restart always \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://127.0.0.1:3306/${DB_NAME}?useUnicode=true&characterEncoding=UTF-8&useSSL=false" \
  -e SPRING_DATASOURCE_USERNAME="${DB_USER}" \
  -e SPRING_DATASOURCE_PASSWORD="${DB_PASS}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e LOG_DIR="/app/logs" \
  -e SERVER_PORT="${BACKEND_PORT}" \
  -v ${PRISM_DIR}/backend.jar:/app/backend.jar \
  -v ${PRISM_DIR}/logs:/app/logs \
  -w /app eclipse-temurin:21-jre java -jar backend.jar > /dev/null
sleep 3
if docker ps | grep -q prism-backend; then
    success "后端服务已启动"
else
    error "后端启动失败，查看日志: docker logs prism-backend"
fi

# 7. 配置 Nginx
info "[7/8] 配置 Nginx..."
if ! command -v nginx &>/dev/null; then
    apt-get install -y nginx > /dev/null 2>&1
fi

cat > /etc/nginx/conf.d/prism.conf << 'NGINX_EOF'
server {
    listen 50001;
    root /var/www/html/prism;
    index index.html;
    client_max_body_size 20M;
    location / { try_files $uri $uri/ /index.html; }
    location = /api/v1/user/register {
        proxy_pass http://127.0.0.1:50002/api/v1/user/register;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location = /api/v1/user/init-status {
        proxy_pass http://127.0.0.1:50002/api/v1/user/init-status;
        proxy_set_header Host $host;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:50000/api/;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
}
NGINX_EOF

mkdir -p /var/www/html/prism
cp -r ui/dist/* /var/www/html/prism/
systemctl restart nginx
success "Nginx 配置完成"

# 8. 启动注册服务
info "[8/8] 启动注册服务..."
pkill -f register_proxy.py 2>/dev/null || true
DB_NAME=${DB_NAME} DB_USER=${DB_USER} DB_PASS=${DB_PASS} nohup python3 register_proxy.py > logs/register.log 2>&1 &
sleep 2
if ss -tlnp | grep -q ":${REGISTER_PORT}"; then
    success "注册服务已启动"
else
    error "注册服务启动失败"
fi

# 获取服务器 IP
SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
success "════════════════════════════════════════"
success "   Prism Panel 安装完成！"
success "════════════════════════════════════════"
echo ""
info "访问地址: http://${SERVER_IP}:${FRONTEND_PORT}"
echo ""
warn "首次访问请注册管理员账户"
warn "第一个注册的用户将自动成为管理员"
echo ""
info "服务管理："
info "  后端日志: docker logs -f prism-backend"
info "  注册日志: tail -f ${PRISM_DIR}/logs/register.log"
info "  重启后端: docker restart prism-backend"
echo ""
success "════════════════════════════════════════"
