# 如何发布 Prism 到 GitHub

## 第一步：初始化 Git 仓库

```bash
cd /root/prism
git init
git add .
git commit -m "Initial commit: Prism Panel v1.0.0"
```

## 第二步：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名：`Prism`
3. 所有者：`knowbul1koli`
4. 描述：`现代化的流量转发管理面板`
5. 公开仓库
6. 不要初始化 README（我们已有）

## 第三步：推送代码

```bash
git remote add origin https://github.com/knowbul1koli/Prism.git
git branch -M main
git push -u origin main
```

## 第四步：准备 Release 文件

```bash
cd /root/prism
bash prepare-release.sh v1.0.0
```

生成的文件：
- `/root/prism.tar.gz` - 需要上传到 Release

## 第五步：创建 Release

1. 访问 https://github.com/knowbul1koli/Prism/releases/new
2. 标签：`v1.0.0`
3. 标题：`Prism Panel v1.0.0`
4. 描述：

```markdown
## ✨ 新特性
- 🎨 现代化暗黑主题 UI
- 👥 多用户权限管理
- 📊 实时流量统计与监控
- 🔐 JWT 认证 + 流量配额控制

## 🚀 一键部署
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)

## 🗑️ 卸载
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/uninstall.sh)
```

5. 上传文件：
   - `prism.tar.gz`
   - `backend.jar`

6. 点击 "Publish release"

## 第六步：测试部署

在新服务器上测试：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

## 完成！

访问 https://github.com/knowbul1koli/Prism 查看项目
