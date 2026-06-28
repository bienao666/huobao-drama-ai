# Docker Linux 部署指南

本文档用于在 Linux 服务器上拉取项目代码，并通过 Docker Compose 一键构建镜像、启动容器。

## 1. 准备服务器

确认服务器已安装 Docker 和 Docker Compose v2：

```bash
docker --version
docker compose version
```

如果命令不存在，需要先安装 Docker。安装完成后，建议确认当前用户可以运行 Docker；如果没有权限，可以临时在命令前加 `sudo`。

还需要在服务器防火墙或云厂商安全组中放行 `3000` 端口。

## 2. 拉取代码

```bash
git clone <你的仓库地址>
cd huobao-drama-ai
```

如果仓库已经存在，更新代码：

```bash
git pull
```

## 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
nano .env
```

至少建议修改：

```env
NEXTAUTH_SECRET=替换成随机密钥
NEXTAUTH_URL=http://你的服务器IP:3000
```

生成 `NEXTAUTH_SECRET`：

```bash
openssl rand -base64 32
```

如果已经绑定域名，可以使用域名：

```env
NEXTAUTH_URL=https://你的域名
```

如果有 AI 平台 Key，也可以在 `.env` 中填写，例如：

```env
OPENAI_API_KEY=sk-xxxx
NVIDIA_API_KEY=nvapi-xxxx
DEEPSEEK_API_KEY=sk-xxxx
SILICONFLOW_API_KEY=sk-xxxx
```

没有 API Key 也可以先启动项目，但相关 AI 生成能力会不可用。

## 4. 一键构建并启动

前台启动，适合第一次观察构建日志：

```bash
docker compose up --build
```

确认能正常启动后，可以改为后台运行：

```bash
docker compose up --build -d
```

访问地址：

```text
http://你的服务器IP:3000
```

## 5. 查看运行状态和日志

查看容器状态：

```bash
docker compose ps
```

查看实时日志：

```bash
docker compose logs -f
```

只看最近 200 行日志：

```bash
docker compose logs --tail=200
```

## 6. 常用维护命令

重启服务：

```bash
docker compose restart
```

停止并删除容器，保留数据库和上传文件：

```bash
docker compose down
```

停止并删除容器、数据库和上传文件：

```bash
docker compose down -v
```

`docker compose down -v` 会删除 `huobao-data` 数据卷，慎用。

## 7. 更新版本

拉取最新代码并重新构建：

```bash
git pull
docker compose up --build -d
```

查看更新后的日志：

```bash
docker compose logs -f
```

## 8. 数据持久化说明

Compose 配置会创建 Docker volume：

```text
huobao-data
```

容器内的数据目录是：

```text
/app/data
```

这里会保存：

- SQLite 数据库：`/app/data/custom.db`
- 本地上传文件：`/app/data/uploads`

普通的 `docker compose down` 不会删除这些数据。

## 9. 常见问题

### 端口无法访问

确认容器正在运行：

```bash
docker compose ps
```

确认服务器防火墙或云安全组已放行 `3000`。

### NEXTAUTH_SECRET 警告

如果日志提示 `NEXTAUTH_SECRET` 未设置或仍是默认值，请在 `.env` 中替换为随机密钥：

```bash
openssl rand -base64 32
```

然后重启：

```bash
docker compose up --build -d
```

### Docker 权限不足

如果看到 permission denied，可以临时使用：

```bash
sudo docker compose up --build -d
```

或者把当前用户加入 `docker` 用户组后重新登录。

### 构建时提示 Cannot find module '../server/require-hook'

如果构建日志中出现类似错误：

```text
error: Cannot find module '../server/require-hook' from '/app/node_modules/.bin/next'
```

说明 Dockerfile 里仍在使用 `bunx next build`。请拉取最新代码，确认 Dockerfile 中的构建命令是：

```dockerfile
RUN node node_modules/next/dist/bin/next build
```

然后重新构建：

```bash
docker compose build --no-cache
docker compose up -d
```

### 需要清理旧镜像

只清理未使用的镜像和缓存：

```bash
docker system prune
```

这个命令不会删除正在使用的容器和 volume，但执行前仍建议先确认当前服务状态。
