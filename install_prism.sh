#!/bin/bash
# Prism Panel 一键安装脚本
# 适用系统：Debian 12 / Ubuntu 22.04+

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# 检查 root 权限
[[ $EUID -ne 0 ]] && error "请使用 root 权限运行此脚本"

PRISM_DIR="/root/prism"
cd "$PRISM_DIR" || error "目录 $PRISM_DIR 不存在"

info "开始安装 Prism Panel..."

# 1. 检查并安装 Docker
info "检查 Docker..."
if ! command -v docker &>/dev/null; then
    info "安装 Docker..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    success "Docker 安装完成"
else
    success "Docker 已安装"
fi

# 2. 检查并安装 Python 依赖
info "检查 Python 依赖..."
if ! python3 -c "import pymysql" 2>/dev/null; then
    apt-get install -y python3-pymysql
    success "Python 依赖安装完成"
fi

# 3. 检查 MySQL
info "检查 MySQL..."
if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mariadb; then
    error "MySQL/MariaDB 未运行，请先安装并启动数据库"
fi
success "MySQL 运行正常"

# 4. 加载环境变量
if [[ ! -f .env ]]; then
    error ".env 文件不存在"
fi
source .env

# 5. 检查数据库连接
info "检查数据库..."
if ! mysql -u root -e "USE $DB_NAME" 2>/dev/null; then
    error "数据库 $DB_NAME 不存在或无法访问"
fi

# 修复数据库用户权限
mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1' \
IDENTIFIED BY '${DB_PASS}'; FLUSH PRIVILEGES;" 2>/dev/null || true
success "数据库配置完成"

# 6. 创建日志目录
mkdir -p logs
chmod 755 logs

# 7. 停止旧容器
info "清理旧容器..."
docker rm -f prism-backend 2>/dev/null || true

# 8. 启动后端服务
info "启动后端服务..."
docker run -d --name prism-backend --network host --restart always \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://127.0.0.1:3306/${DB_NAME}?useUnicode=true&characterEncoding=UTF-8&useSSL=false" \
  -e SPRING_DATASOURCE_USERNAME="${DB_USER}" \
  -e SPRING_DATASOURCE_PASSWORD="${DB_PASS}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e LOG_DIR="/app/logs" \
  -e SERVER_PORT="${BACKEND_PORT}" \
  -v ${PRISM_DIR}/backend.jar:/app/backend.jar \
  -v ${PRISM_DIR}/logs:/app/logs \
  -w /app \
  eclipse-temurin:21-jre java -jar backend.jar

sleep 3

# 9. 检查后端状态
if ! docker ps | grep -q prism-backend; then
    error "后端启动失败，查看日志: docker logs prism-backend"
fi
success "后端服务启动成功"

# 10. 配置 Nginx
info "配置 Nginx..."
if [[ ! -f /etc/nginx/conf.d/prism.conf ]]; then
    cat > /etc/nginx/conf.d/prism.conf <<EOF
server {
    listen ${FRONTEND_PORT};
    root /var/www/html/prism;
    index index.html;
    client_max_body_size 20M;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location = /api/v1/user/register {
        proxy_pass http://127.0.0.1:${REGISTER_PORT}/api/v1/user/register;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    location = /api/v1/user/init-status {
        proxy_pass http://127.0.0.1:${REGISTER_PORT}/api/v1/user/init-status;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 10s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Authorization \$http_authorization;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location /system-info {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/system-info;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
    }
}
EOF
fi

# 11. 部署前端文件
info "部署前端..."
mkdir -p /var/www/html/prism
cp -r ui/dist/* /var/www/html/prism/
chmod -R 755 /var/www/html/prism

# 12. 重启 Nginx
systemctl restart nginx
success "Nginx 配置完成"

# 13. 启动注册服务
info "启动注册服务..."
pkill -f register_proxy.py 2>/dev/null || true
nohup python3 register_proxy.py > logs/register.log 2>&1 &
sleep 2

# 14. 验证服务
info "验证服务状态..."
ERRORS=0

if ! ss -tlnp | grep -q ":${BACKEND_PORT}"; then
    error "后端服务未监听端口 ${BACKEND_PORT}"
    ERRORS=$((ERRORS+1))
fi

if ! ss -tlnp | grep -q ":${FRONTEND_PORT}"; then
    error "前端服务未监听端口 ${FRONTEND_PORT}"
    ERRORS=$((ERRORS+1))
fi

if ! ss -tlnp | grep -q ":${REGISTER_PORT}"; then
    error "注册服务未监听端口 ${REGISTER_PORT}"
    ERRORS=$((ERRORS+1))
fi

if [[ $ERRORS -gt 0 ]]; then
    error "部分服务启动失败"
fi

# 15. 获取访问地址
SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
success "=========================================="
success "Prism Panel 安装完成！"
success "=========================================="
echo ""
info "访问地址: http://${SERVER_IP}:${FRONTEND_PORT}"
info "后端 API: http://${SERVER_IP}:${BACKEND_PORT}"
echo ""
info "服务管理命令："
info "  查看后端日志: docker logs -f prism-backend"
info "  查看注册日志: tail -f ${PRISM_DIR}/logs/register.log"
info "  重启后端: docker restart prism-backend"
info "  重启 Nginx: systemctl restart nginx"
echo ""
warn "首次访问请注册管理员账户"
success "=========================================="
