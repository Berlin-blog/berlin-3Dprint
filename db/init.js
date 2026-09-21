/**
 * 数据库初始化脚本
 * 运行: node db/init.js
 * 创建表结构、插入示例数据、创建管理员账号
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 加载 .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx > 0) process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root123456';
const DB_NAME = process.env.DB_NAME || '3dprint';
const DB_SSL = process.env.DB_SSL === 'true';

async function init() {
  // 1. 连接数据库（TiDB 需要先在控制台创建 database，这里直接连）
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    ssl: DB_SSL ? { rejectUnauthorized: true } : undefined,
  });

  console.log('✅ 连接数据库成功');

  // TiDB 不支持 CREATE DATABASE，MySQL 本地可以
  if (!DB_SSL) {
    try {
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ 数据库 "${DB_NAME}" 已就绪`);
    } catch (e) {
      console.log(`ℹ️  数据库 "${DB_NAME}" 已存在或需手动创建`);
    }
  }

  // 2. 执行建表 + 示例数据 SQL
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await conn.query(sql);
  console.log('✅ 表结构和示例数据已创建');

  // 3. 创建管理员账号（如果不存在）
  const [adminRows] = await conn.execute('SELECT id FROM users WHERE username = ?', ['admin']);
  if (adminRows.length === 0) {
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    await conn.execute(
      'INSERT INTO users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
      ['admin', hashedAdmin, '系统管理员', 'admin']
    );
    console.log('✅ 管理员账号已创建 → 用户名: admin  密码: admin123');
  } else {
    console.log('ℹ️  管理员账号已存在，跳过');
  }

  // 4. 创建演示用户账号
  const [userRows] = await conn.execute('SELECT id FROM users WHERE username = ?', ['demo']);
  if (userRows.length === 0) {
    const hashedDemo = await bcrypt.hash('demo123', 10);
    await conn.execute(
      'INSERT INTO users (username, password, real_name, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['demo', hashedDemo, '演示用户', '13800138000', 'demo@example.com', 'customer']
    );
    console.log('✅ 演示用户账号已创建 → 用户名: demo  密码: demo123');
  } else {
    console.log('ℹ️  演示用户账号已存在，跳过');
  }

  await conn.end();
  console.log('\n🎉 数据库初始化完成！现在可以运行: npm start');
}

init().catch(err => {
  console.error('❌ 初始化失败:', err.message);
  process.exit(1);
});
