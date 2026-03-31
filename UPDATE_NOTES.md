# 更新说明 v1.0.0

## ✅ 已修复的问题

1. **自动安装 MySQL** - 全新服务器无需预装数据库
2. **自动生成配置** - 自动创建 .env 文件和随机密码
3. **注册按钮显示** - 首次访问正确显示注册选项
4. **前端预构建** - Release 包含构建好的前端，无需 npm
5. **卸载脚本** - 正确读取动态数据库名称

## 📦 Release 文件

- `prism.tar.gz` - 完整安装包（含构建好的前端）
- `backend.jar` - 后端服务

## 🚀 部署命令

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

## 🗑️ 卸载命令

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/uninstall.sh)
```
