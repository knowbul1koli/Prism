# Prism Panel

现代化的流量转发管理面板，基于 Go-Gost + Spring Boot + React 构建。

## ✨ 特性

- 🚀 一键部署，开箱即用
- 🎨 现代化暗黑主题 UI
- 👥 多用户权限管理
- 🔐 JWT 认证 + 流量配额控制
- 📊 实时流量统计与监控
- 🌐 支持 IPv4/IPv6 双栈

## 📋 系统要求

- **操作系统**: Debian 12 / Ubuntu 22.04+
- **架构**: x86_64 / ARM64
- **内存**: 最低 1GB RAM
- **磁盘**: 最低 2GB 可用空间

## 🚀 一键部署

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

部署过程会自动：
- ✅ 检测系统环境
- ✅ 安装 Docker 和依赖
- ✅ 配置 MySQL 数据库
- ✅ 启动后端服务
- ✅ 部署前端界面
- ✅ 配置 Nginx 反向代理

## 🗑️ 完全卸载

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/uninstall.sh)
```

## 📖 使用指南

### 首次访问

1. 访问 `http://YOUR_SERVER_IP:50001`
2. 点击"注册"创建管理员账户（第一个注册用户自动成为管理员）
3. 登录后即可开始使用

### 端口说明

- `50000` - 后端 API 服务
- `50001` - 前端 Web 界面
- `50002` - 注册服务

## 📦 项目结构

```
prism/
├── backend.jar          # 后端服务（需从 Release 下载）
├── ui/                  # 前端源码
├── register_proxy.py    # 注册服务
├── schema.sql          # 数据库结构
├── install.sh          # 一键安装脚本
├── uninstall.sh        # 卸载脚本
└── install_prism.sh    # 核心部署脚本
```

## 🔧 开发

### 前端开发

```bash
cd ui
npm install
npm run dev
```

### 构建前端

```bash
cd ui
npm run build
```

## 🛠️ 服务管理

```bash
# 查看后端日志
docker logs -f prism-backend

# 重启后端
docker restart prism-backend

# 查看注册服务日志
tail -f /root/prism/logs/register.log

# 重启 Nginx
systemctl restart nginx
```

## 📝 License

MIT License

## 🙏 致谢

基于 flux-panel 项目改进
