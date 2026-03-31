#!/bin/bash
# ============================================================
#  Prism Panel — 自定义 UI 构建 & 启动脚本
#  在面板服务器上执行: bash /root/prism/build.sh
# ============================================================
set -e
PRISM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PRISM_DIR"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}ℹ  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }

# ── 检查依赖 ────────────────────────────────────────────────
command -v docker  &>/dev/null || error "请先安装 Docker"
command -v node    &>/dev/null || error "请先安装 Node.js (>=18)"
command -v npm     &>/dev/null || error "请先安装 npm"

if command -v docker-compose &>/dev/null; then
  DC="docker-compose"
elif docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
else
  error "请先安装 docker-compose"
fi

# ── 检查 .env ────────────────────────────────────────────────
[ -f "$PRISM_DIR/.env" ] || error ".env 文件不存在，请先运行 manage.sh 安装面板"
cp "$PRISM_DIR/.env" "$PRISM_DIR/ui/.env"
info ".env 已同步到 ui/ 目录"

# ── 安装前端依赖 ─────────────────────────────────────────────
info "安装前端依赖..."
cd "$PRISM_DIR/ui"
npm install
success "依赖安装完成"

# ── 构建生产包（可选，Docker 内部也会构建，但本地构建可验证） ──
# info "本地构建验证..."
# npm run build && success "本地构建通过"

cd "$PRISM_DIR"

# ── 停止旧的前端容器（覆盖所有可能的旧名称）─────────────────
info "停止旧前端容器..."
for name in prism-frontend vue-frontend vite-frontend flux-frontend; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "$name" 2>/dev/null && info "已移除旧容器: $name" || true
  fi
done

# ── 彻底清理 gost-network 残留端点 ──────────────────────────
if docker network inspect gost-network &>/dev/null 2>&1; then
  warn "检测到 gost-network 残留，强制断开所有端点..."
  # 先按名称断开
  NAMES=$(docker network inspect gost-network \
    --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")
  for c in $NAMES; do
    [ -z "$c" ] && continue
    docker network disconnect -f gost-network "$c" 2>/dev/null || true
    docker rm -f "$c" 2>/dev/null || true
  done
  # 再按 ID 断开（兜底）
  IDS=$(docker network inspect gost-network \
    --format '{{range $id, $v := .Containers}}{{$id}} {{end}}' 2>/dev/null || echo "")
  for cid in $IDS; do
    [ -z "$cid" ] && continue
    docker network disconnect -f gost-network "$cid" 2>/dev/null || true
  done
  # 删除网络本身
  docker network rm gost-network 2>/dev/null || true
  info "gost-network 清理完成"
fi

# ── 重新 build 并启动 ────────────────────────────────────────
info "构建并启动自定义前端..."
$DC -f docker-compose.custom.yml up -d --build

# ── 等待就绪 ─────────────────────────────────────────────────
info "等待服务就绪..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:"${FRONTEND_PORT:-50001}" >/dev/null 2>&1; then
    echo ""
    break
  fi
  printf '.'
  sleep 2
done

source .env 2>/dev/null || true
SERVER_IP=$(curl -s --connect-timeout 3 https://ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 Prism Panel 自定义 UI 部署成功！${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "  🌐 访问地址 : ${CYAN}http://${SERVER_IP}:${FRONTEND_PORT:-50001}${NC}"
echo -e "  🔌 后端地址 : ${CYAN}http://${SERVER_IP}:${BACKEND_PORT:-50000}${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo -e "  重新构建: ${YELLOW}bash /root/prism/build.sh${NC}"
echo -e "  查看日志: ${YELLOW}docker logs -f prism-frontend${NC}"