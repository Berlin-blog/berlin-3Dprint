const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 从 .env 文件加载环境变量（本地开发用，Render 直接读环境变量）
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

// 构建数据库连接配置
// 本地开发: localhost:3306, 无 SSL
// TiDB Cloud / 远程数据库: 使用环境变量 + SSL
function buildConfig() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123456',
    database: process.env.DB_NAME || '3dprint',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  };

  // TiDB Cloud / 远程数据库需要 SSL
  if (process.env.DB_SSL === 'true' || process.env.DATABASE_URL) {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
}

const pool = mysql.createPool(buildConfig());

module.exports = { pool, buildConfig };
