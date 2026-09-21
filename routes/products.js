const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 计算产品在某材料下的价格
function calcPrice(weight, materialPrice, fixedCost) {
  return parseFloat(weight) * parseFloat(materialPrice) + parseFloat(fixedCost || 25);
}

// 计算起步价（使用最便宜的可用耗材）
async function calcPriceFrom(weight, fixedCost) {
  const [mats] = await pool.execute('SELECT MIN(price_per_unit) AS min_price FROM materials WHERE available = TRUE');
  const minPrice = mats[0].min_price || 0.25;
  return calcPrice(weight, minPrice, fixedCost);
}

// 产品列表（公开，支持分类筛选、搜索、分页）
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(48, Math.max(1, parseInt(req.query.pageSize) || 12));
  const offset = (page - 1) * pageSize;

  let where = 'WHERE available = TRUE';
  const params = [];
  if (category && category !== 'all') {
    where += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // 查总数
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM products ${where}`, params);

  // 查分页数据
  const [rows] = await pool.execute(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  // 为每个产品计算起步价
  for (const p of rows) {
    const priceFrom = await calcPriceFrom(p.weight, p.fixed_cost);
    p.price_from = priceFrom.toFixed(2);
  }

  res.json({
    products: rows,
    pagination: {
      page, pageSize, total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// 产品详情（公开）
router.get('/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: '产品不存在' });
  }
  const product = rows[0];
  const priceFrom = await calcPriceFrom(product.weight, product.fixed_cost);
  product.price_from = priceFrom.toFixed(2);

  // 返回每种耗材对应的精确价格
  const [mats] = await pool.execute('SELECT id, name, price_per_unit, unit FROM materials WHERE available = TRUE ORDER BY sort_order');
  product.material_prices = mats.map(m => ({
    name: m.name,
    unit_price: calcPrice(product.weight, m.price_per_unit, product.fixed_cost).toFixed(2),
    raw_price_per_gram: parseFloat(m.price_per_unit),
  }));

  res.json({ product });
});

// 获取所有分类
router.get('/meta/categories', async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT category FROM products WHERE available = TRUE AND category IS NOT NULL'
  );
  res.json({ categories: rows.map(r => r.category) });
});

// ---- 以下为管理员接口 ----

// 创建产品
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price, weight, fixed_cost, image_url, category, stock } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ error: '产品名称和价格不能为空' });
  }
  const [result] = await pool.execute(
    'INSERT INTO products (name, description, price, weight, fixed_cost, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, price, weight || 50, fixed_cost || 25, image_url || null, category || null, stock || 0]
  );
  res.json({ message: '创建成功', id: result.insertId });
});

// 更新产品
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, weight, fixed_cost, image_url, category, stock, available } = req.body;
  await pool.execute(
    `UPDATE products SET name=?, description=?, price=?, weight=?, fixed_cost=?, image_url=?, category=?, stock=?, available=? WHERE id=?`,
    [name, description, price, weight || 50, fixed_cost || 25, image_url, category, stock,
     available !== undefined ? available : true, req.params.id]
  );
  res.json({ message: '更新成功' });
});

// 删除产品
router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.execute('UPDATE products SET available = FALSE WHERE id = ?', [req.params.id]);
  res.json({ message: '已下架' });
});

module.exports = router;
