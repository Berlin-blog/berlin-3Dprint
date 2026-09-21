/**
 * 数据库迁移脚本 V2
 * 1. materials 表新增 pros / cons 列（优缺点）
 * 2. order_items 表新增 bambu_link 列（Bambu 官方模型链接）
 * 3. 更新现有耗材的优缺点数据
 * 4. 新增 PLA Lite / PLA Pure 耗材
 * 运行: node db/migrate_v2.js
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

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root123456';
const DB_NAME = process.env.DB_NAME || '3dprint';
const DB_SSL = process.env.DB_SSL === 'true';

async function migrate() {
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
    multipleStatements: true,
    ssl: DB_SSL ? { rejectUnauthorized: true } : undefined,
  });

  console.log('✅ 连接数据库成功');

  // 1. 检查并添加 pros / cons 列
  const [cols] = await conn.execute("SHOW COLUMNS FROM materials LIKE 'pros'");
  if (cols.length === 0) {
    await conn.execute("ALTER TABLE materials ADD COLUMN pros TEXT AFTER description");
    console.log('✅ materials 表已添加 pros 列');
  }
  const [cols2] = await conn.execute("SHOW COLUMNS FROM materials LIKE 'cons'");
  if (cols2.length === 0) {
    await conn.execute("ALTER TABLE materials ADD COLUMN cons TEXT AFTER pros");
    console.log('✅ materials 表已添加 cons 列');
  }

  // 2. 检查并添加 bambu_link 列到 order_items
  const [cols3] = await conn.execute("SHOW COLUMNS FROM order_items LIKE 'bambu_link'");
  if (cols3.length === 0) {
    await conn.execute("ALTER TABLE order_items ADD COLUMN bambu_link VARCHAR(500) AFTER custom_file_name");
    console.log('✅ order_items 表已添加 bambu_link 列');
  }

  // 3. 更新现有耗材的优缺点
  const updates = [
    ['PLA', '易打印成功率高|无需加热腔|精度高细节好|环保可降解', '耐热性差(60°C易变形)|脆性较大易断裂|不适合长时间户外使用'],
    ['ABS', '强度高韧性好|耐高温(100°C+)|可打磨抛光上色|适合功能性零件', '打印时有刺激性气味|需要加热腔防翘边|不适合室内无通风环境'],
    ['树脂(光固化)', '精度极高表面光滑|适合精细手办珠宝|细节表现力最强|可做透明件', '需后处理(清洗+固化)|树脂有毒性需防护|打印尺寸受限|材料成本较高'],
    ['尼龙(PA)', '韧性极佳耐冲击|耐磨损耐疲劳|耐高温适合机械件|可承受较大应力', '易吸潮需干燥保存|打印难度较高|表面较粗糙需后处理'],
    ['TPU(柔性)', '柔软可弯折|耐冲击抗摔|适合手机壳鞋底密封件|贴合度好', '打印速度慢|不支持悬空结构|精度较低|回弹形状有限制'],
    ['PETG', '兼顾强度与韧性|食品级安全无毒|不易翘边易打印|耐化学腐蚀', '容易拉丝需调参|打印温度较高|表面有轻微光泽不均'],
  ];

  for (const [name, pros, cons] of updates) {
    await conn.execute('UPDATE materials SET pros = ?, cons = ? WHERE name = ?', [pros, cons, name]);
  }
  console.log('✅ 已更新 6 种现有耗材的优缺点');

  // 4. 新增 PLA Lite / PLA Pure
  const newMaterials = [
    ['PLA Lite', 0.25, '克', '入门级PLA，打印简单表面光滑，适合初学者和快速原型', '易打印成功率高|低温柔性较好|表面光滑细腻|价格实惠适合练手', '强度略低于普通PLA|耐热性同样有限|不适合承重功能件'],
    ['PLA Pure', 0.50, '克', '食品级高纯度PLA，色彩通透无杂质，环保安全', '食品级安全无毒|高纯度无杂质|色彩通透美观|环保可完全降解', '价格较高|打印速度建议较慢|对温度较敏感需调参'],
  ];

  for (const [name, price, unit, desc, pros, cons] of newMaterials) {
    const [exist] = await conn.execute('SELECT id FROM materials WHERE name = ?', [name]);
    if (exist.length === 0) {
      await conn.execute(
        'INSERT INTO materials (name, price_per_unit, unit, description, pros, cons, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, price, unit, desc, pros, cons, 0]
      );
      console.log(`✅ 新增耗材: ${name}`);
    } else {
      await conn.execute('UPDATE materials SET price_per_unit=?, description=?, pros=?, cons=? WHERE name=?', [price, desc, pros, cons, name]);
      console.log(`ℹ️  已存在，已更新: ${name}`);
    }
  }

  await conn.end();
  console.log('\n🎉 数据库迁移完成！');
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});
