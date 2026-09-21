const express = require('express');
const session = require('express-session');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// 加载 .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx > 0) process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
}

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const materialRoutes = require('./routes/materials');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || '3dprint-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24小时
}));

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);

// 前端页面路由 (SPA fallback)
app.get(['/', '/login', '/register', '/custom', '/orders', '/product/:id',
  '/messages', '/admin', '/admin/products', '/admin/orders', '/admin/materials'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 3D打印平台已启动: http://localhost:${PORT}`);
  console.log(`📦 管理后台: http://localhost:${PORT}/admin`);
  console.log(`👤 管理员账号: admin / admin123`);
  console.log(`👤 演示用户: demo / demo123\n`);
});
