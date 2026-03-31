#!/bin/bash
# 准备 GitHub Release 文件

VERSION=${1:-v1.0.0}
RELEASE_DIR="/tmp/prism-release"

echo "准备 Prism ${VERSION} Release 文件..."

# 清理旧文件
rm -rf ${RELEASE_DIR}
mkdir -p ${RELEASE_DIR}/prism

# 复制必需文件
cp -r ui ${RELEASE_DIR}/prism/
cp register_proxy.py ${RELEASE_DIR}/prism/
cp schema.sql ${RELEASE_DIR}/prism/
cp install_prism.sh ${RELEASE_DIR}/prism/
cp application.properties ${RELEASE_DIR}/prism/
cp app.properties ${RELEASE_DIR}/prism/
cp .env.example ${RELEASE_DIR}/prism/.env.example 2>/dev/null || echo "DB_NAME=
DB_USER=
DB_PASS=
JWT_SECRET=
BACKEND_PORT=50000
FRONTEND_PORT=50001
REGISTER_PORT=50002
LOG_DIR=/root/prism/logs" > ${RELEASE_DIR}/prism/.env.example

# 清理前端
rm -rf ${RELEASE_DIR}/prism/ui/node_modules
rm -rf ${RELEASE_DIR}/prism/ui/dist

# 打包
cd ${RELEASE_DIR}
tar czf prism.tar.gz prism/
mv prism.tar.gz /root/

echo "✅ Release 文件已生成: /root/prism.tar.gz"
echo ""
echo "📦 需要手动上传到 GitHub Release:"
echo "  1. prism.tar.gz (主安装包)"
echo "  2. backend.jar (从当前目录上传)"
echo ""
