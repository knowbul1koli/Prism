# GitHub 更新步骤

## 📦 已准备的文件

✅ /root/prism.tar.gz - 新的 Release 包
✅ /root/prism/backend.jar - 后端服务
✅ 所有源码已更新

## 🔄 更新到 GitHub

### 1. 提交代码更新
```bash
cd /root/prism
git add .
git commit -m "Fix: 修复注册按钮显示、自动安装MySQL、自动生成配置"
git push
```

### 2. 创建新 Release
访问: https://github.com/knowbul1koli/Prism/releases/new

- Tag: v1.0.1
- Title: Prism Panel v1.0.1
- 描述: 见 UPDATE_NOTES.md
- 上传: prism.tar.gz + backend.jar

### 3. 测试
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

完成！
