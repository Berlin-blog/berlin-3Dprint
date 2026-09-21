# 🖨️ 3D打印定制平台

一个完整的3D打印产品展示与定制下单平台，支持用户上传模型或填写 Bambu 官方链接下单。

## ✨ 功能

- 🏠 预置产品展示（分类筛选、搜索、分页）
- 🚀 定制打印（上传 STL/OBJ 模型 或 Bambu 官方链接）
- 🎨 8种耗材选择（含优缺点对比），10种颜色
- 💰 价格按耗材动态计算（克重 × 耗材单价 + 固定成本）
- 📦 订单管理（下单、查询、取消、状态追踪）
- 📬 站内消息通知（订单状态变更自动通知）
- 👤 用户系统（注册、登录、个人信息）
- 🔐 登录失败锁定保护（5次失败锁定15分钟）
- 🛠️ 管理后台（产品管理、订单管理、耗材增删改查、数据概览）
- 📱 移动端响应式（抽屉式菜单）

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置数据库连接（编辑 .env）
cp .env.example .env
# 修改 .env 中的数据库信息

# 3. 初始化数据库（建表 + 示例数据 + 管理员账号）
npm run init-db

# 4. 启动服务器
npm start
```

打开 http://localhost:3000

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | demo | demo123 |

## ☁️ 免费部署到 Render + TiDB Cloud

### 第一步：创建 TiDB Cloud 免费数据库

1. 注册 https://tidbcloud.com （免费，5GB 存储）
2. 创建 Serverless 集群（选 Singapore 区域）
3. 创建数据库 `3dprint`
4. 在连接页面获取连接信息：
   - Host: `gateway01.xx-xxxx-x.prod.aws.tidbcloud.com`
   - Port: `4000`
   - User: `xxxxx.root`（或你设置的用户名）
   - Password: 你设置的密码

### 第二步：初始化远程数据库

```bash
# 用 TiDB 的连接信息运行初始化
DB_HOST=gateway01.xx.prod.aws.tidbcloud.com \
DB_PORT=4000 \
DB_USER=xxxxx.root \
DB_PASSWORD=yourpassword \
DB_NAME=3dprint \
DB_SSL=true \
npm run init-db

# 运行迁移脚本
DB_HOST=... DB_PORT=4000 DB_USER=... DB_PASSWORD=... DB_NAME=3dprint DB_SSL=true npm run migrate
```

### 第三步：部署到 Render

1. 注册 https://render.com （GitHub 账号登录）
2. New → Web Service → 连接 GitHub 仓库 `berlin-3Dprint`
3. 配置：
   - Name: `berlin-3dprint`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 添加环境变量：
   - `DB_HOST` = TiDB 的 Host
   - `DB_PORT` = `4000`
   - `DB_USER` = TiDB 用户名
   - `DB_PASSWORD` = TiDB 密码
   - `DB_NAME` = `3dprint`
   - `DB_SSL` = `true`
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = 随便填一个长字符串
5. Deploy

部署完成后会得到一个 `https://berlin-3dprint.onrender.com` 的地址。

### ⚠️ 免费版限制

- Render 免费版 15 分钟无访问会休眠，下次访问约 30 秒唤醒
- 上传的文件存在临时目录，服务重启会丢失（建议通过 Bambu 链接或备注沟通模型文件）
- TiDB Cloud 免费版 5GB 存储，每月 5000 万请求单元

## 🛠️ 技术栈

- 后端：Node.js + Express + MySQL2
- 前端：原生 JavaScript SPA（无框架）
- 数据库：MySQL / TiDB（兼容 MySQL 协议）
- 文件上传：Multer
- 认证：Express Session + bcryptjs
