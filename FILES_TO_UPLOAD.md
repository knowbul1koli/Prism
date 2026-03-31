# GitHub 上传文件清单

## ✅ 需要提交到 Git 的文件

```
prism/
├── ui/                      # 前端源码（完整目录）
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/                    # 文档
│   └── DEPLOY.md
├── register_proxy.py        # 注册服务
├── schema.sql              # 数据库结构
├── install.sh              # 一键安装脚本
├── uninstall.sh            # 卸载脚本
├── install_prism.sh        # 核心部署脚本
├── application.properties  # 配置模板
├── app.properties          # 配置模板
├── .env.example            # 环境变量模板
├── .gitignore              # Git 忽略规则
├── README.md               # 项目说明
└── LICENSE                 # 许可证
```

## ❌ 不要提交的文件（已在 .gitignore）

- `backend.jar` - 太大，放 Release
- `.env` - 包含敏感信息
- `logs/` - 运行时日志
- `ui/node_modules/` - 依赖包
- `ui/dist/` - 构建产物
- `decompile/` - 临时文件
- `*.log` - 日志文件

## 📦 Release 附件（手动上传）

1. `prism.tar.gz` - 运行 `prepare-release.sh` 生成
2. `backend.jar` - 从当前目录上传
