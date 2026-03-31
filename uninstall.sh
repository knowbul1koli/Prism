#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}警告: 此操作将完全删除 Prism Panel 及所有数据！${NC}"
read -p "确认卸载? (输入 yes 继续): " confirm
[[ "$confirm" != "yes" ]] && echo "已取消" && exit 0

echo -e "${RED}[1/5]${NC} 停止服务..."
docker rm -f prism-backend 2>/dev/null || true
pkill -f register_proxy.py 2>/dev/null || true

echo -e "${RED}[2/5]${NC} 删除 Nginx 配置..."
rm -f /etc/nginx/conf.d/prism.conf
systemctl reload nginx 2>/dev/null || true

echo -e "${RED}[3/5]${NC} 删除前端文件..."
rm -rf /var/www/html/prism

echo -e "${RED}[4/5]${NC} 删除程序目录..."
rm -rf /root/prism

echo -e "${RED}[5/5]${NC} 清理数据库..."
read -p "是否删除数据库? (yes/no): " del_db
if [[ "$del_db" == "yes" ]]; then
    if [[ -f /root/prism/.env ]]; then
        source /root/prism/.env
        mysql -u root -e "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
        mysql -u root -e "DROP USER IF EXISTS '${DB_USER}'@'127.0.0.1';" 2>/dev/null || true
        echo "数据库已删除"
    else
        echo "未找到 .env 文件，跳过数据库清理"
    fi
fi

echo -e "${GREEN}✓ 卸载完成${NC}"
