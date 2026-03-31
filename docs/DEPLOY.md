# Prism Panel 部署文档

## 快速部署

### 方式一：一键安装（推荐）

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/knowbul1koli/Prism/main/install.sh)
```

### 方式二：手动部署

#### 1. 下载安装包

```bash
cd /tmp
wget https://github.com/knowbul1koli/Prism/releases/latest/download/prism.tar.gz
tar xzf prism.tar.gz
mv prism /root/
cd /root/prism
```

#### 2. 下载后端 JAR

```bash
wget https://github.com/knowbul1koli/Prism/releases/latest/download/backend.jar
```

#### 3. 安装依赖

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Python 依赖
apt-get install -y python3-pymysql

# 安装 MySQL
apt-get install -y mariadb-server
systemctl enable --now mariadb
```
