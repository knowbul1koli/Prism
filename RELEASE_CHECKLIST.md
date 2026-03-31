# GitHub Release 发布清单

## 📦 需要上传的文件

### 1. 源码压缩包（自动生成）
- ✅ Source code (zip)
- ✅ Source code (tar.gz)

### 2. 手动上传文件

#### 必需文件：
- `prism.tar.gz` - 主安装包（包含前端源码、脚本等）
- `backend.jar` - 后端服务（从当前目录上传）

## 🚀 发布步骤

### 1. 准备 Release 文件

```bash
cd /root/prism
bash prepare-release.sh v1.0.0
```

这会生成 `/root/prism.tar.gz`

### 2. 创建 GitHub Release

1. 访问 https://github.com/knowbul1koli/Prism/releases/new
2. 填写版本号：`v1.0.0`
3. 填写标题：`Prism Panel v1.0.0`
4. 上传文件：
   - `prism.tar.gz`
   - `backend.jar`
5. 发布 Release

### 3. 测试部署

在新服务器上测试一键安装：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

## 📋 Release Notes 模板

```markdown
## ✨ 新特性
- 现代化暗黑主题 UI
- 多用户权限管理
- 实时流量统计

## 🚀 快速部署
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)

## 📖 文档
- [部署文档](./docs/DEPLOY.md)
- [使用指南](./README.md)
```
