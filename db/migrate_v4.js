/**
 * 数据库迁移脚本 V4
 * 1. 创建 messages（站内消息）表
 * 2. 为高频查询字段添加索引
 * 运行: node db/migrate_v4.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 加载 .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx > 0) { const key = t.slice(0, idx).trim(); const val = t.slice(idx + 1).trim(); if (!process.env[key]) process.env[key] = val; }
  }
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123456',
    database: process.env.DB_NAME || '3dprint',
    multipleStatements: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });

  console.log('✅ 连接数据库成功');

  // 1. 创建站内消息表
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      order_no VARCHAR(32) COMMENT '关联订单号',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ messages 表已创建');

  // 2. 添加索引（忽略已存在的错误）
  const indexes = [
    ['idx_orders_user_id', 'orders', '(user_id)'],
    ['idx_orders_order_no', 'orders', '(order_no)'],
    ['idx_orders_status', 'orders', '(status)'],
    ['idx_products_category', 'products', '(category)'],
    ['idx_products_available', 'products', '(available)'],
    ['idx_messages_user_read', 'messages', '(user_id, is_read)'],
  ];

  for (const [name, table, cols] of indexes) {
    try {
      await conn.execute(`CREATE INDEX ${name} ON ${table} ${cols}`);
      console.log(`✅ 索引 ${name} 已创建`);
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log(`ℹ️  索引 ${name} 已存在`);
      } else {
        console.log(`⚠️  索引 ${name}: ${err.message}`);
      }
    }
  }

  await conn.end();
  console.log('\n🎉 迁移完成！');
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});
