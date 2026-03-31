#!/bin/bash
VERSION=${1:-v1.0.0}
RELEASE_DIR="/tmp/prism-release"

echo "准备 Prism ${VERSION} Release 文件..."

rm -rf ${RELEASE_DIR}
mkdir -p ${RELEASE_DIR}/prism

# 复制文件
cp -r ui ${RELEASE_DIR}/prism/
cp register_proxy.py ${RELEASE_DIR}/prism/
cp schema.sql ${RELEASE_DIR}/prism/
cp install_prism.sh ${RELEASE_DIR}/prism/
cp application.properties ${RELEASE_DIR}/prism/
cp app.properties ${RELEASE_DIR}/prism/

# 清理前端
rm -rf ${RELEASE_DIR}/prism/ui/node_modules

# 确保 dist 存在
if [[ ! -d ${RELEASE_DIR}/prism/ui/dist ]]; then
    echo "❌ ui/dist 不存在，请先构建前端: cd ui && npm run build"
    exit 1
fi

cd ${RELEASE_DIR}
tar czf prism.tar.gz prism/
mv prism.tar.gz /root/

echo "✅ /root/prism.tar.gz"
echo ""
echo "📦 上传到 GitHub Release:"
echo "  1. prism.tar.gz"
echo "  2. backend.jar"
