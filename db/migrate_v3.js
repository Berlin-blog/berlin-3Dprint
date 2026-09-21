/**
 * 数据库迁移脚本 V3
 * 1. products 表新增 weight(打印克重) 和 fixed_cost(固定成本) 列
 * 2. 回填现有产品的克重和固定成本
 * 3. order_items 表新增 product_weight 列（记录下单时产品的克重）
 * 运行: node db/migrate_v3.js
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
    if (idx > 0) process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
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
    ssl: DB_SSL ? { rejectUnauthorized: true } : undefined,
  });

  console.log('✅ 连接数据库成功');

  // 1. products 表加 weight 列
  const [wCol] = await conn.execute("SHOW COLUMNS FROM products LIKE 'weight'");
  if (wCol.length === 0) {
    await conn.execute("ALTER TABLE products ADD COLUMN weight INT DEFAULT 50 COMMENT '打印所需克数' AFTER price");
    console.log('✅ products 表已添加 weight 列');
  } else {
    console.log('ℹ️  weight 列已存在');
  }

  // 2. products 表加 fixed_cost 列
  const [fcCol] = await conn.execute("SHOW COLUMNS FROM products LIKE 'fixed_cost'");
  if (fcCol.length === 0) {
    await conn.execute("ALTER TABLE products ADD COLUMN fixed_cost DECIMAL(10,2) DEFAULT 25.00 COMMENT '固定成本(时间+电费)' AFTER weight");
    console.log('✅ products 表已添加 fixed_cost 列');
  } else {
    console.log('ℹ️  fixed_cost 列已存在');
  }

  // 3. order_items 表加 product_weight 列
  const [pwCol] = await conn.execute("SHOW COLUMNS FROM order_items LIKE 'product_weight'");
  if (pwCol.length === 0) {
    await conn.execute("ALTER TABLE order_items ADD COLUMN product_weight INT DEFAULT 50 COMMENT '产品打印克重' AFTER bambu_link");
    console.log('✅ order_items 表已添加 product_weight 列');
  } else {
    console.log('ℹ️  product_weight 列已存在');
  }

  // 4. 回填现有产品的克重和固定成本
  // 固定成本统一 25 元 (时间成本20 + 电费5)
  const productWeights = {
    '创意齿轮花瓶': 120,
    '迷你建筑模型': 200,
    '恐龙骨架化石': 350,
    '定制名字钥匙扣': 15,
    '几何笔筒收纳': 80,
    '手机支架': 45,
    '机械关节手办': 180,
    '艺术抽象雕塑': 100,
  };

  for (const [name, weight] of Object.entries(productWeights)) {
    await conn.execute('UPDATE products SET weight = ?, fixed_cost = 25.00 WHERE name = ?', [weight, name]);
  }
  console.log('✅ 已回填 8 个产品的克重和固定成本');

  // 5. 打印验证
  const [rows] = await conn.execute('SELECT name, weight, fixed_cost FROM products LIMIT 8');
  rows.forEach(r => {
    const minPrice = 0.25 * r.weight + parseFloat(r.fixed_cost);
    console.log(`  ${r.name}: ${r.weight}g, 固定成本${r.fixed_cost}元 → 起步价${minPrice.toFixed(2)}元`);
  });

  await conn.end();
  console.log('\n🎉 迁移完成！');
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});
