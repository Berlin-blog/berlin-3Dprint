const express = require('express');
const { pool } = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 生成订单号: ORD + 时间戳 + 随机数
function genOrderNo() {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${ts}${rand}`;
}

// 计算单价：克重 × 耗材单价 + 固定成本
function calcUnitPrice(weight, materialPrice, fixedCost) {
  return parseFloat(weight) * parseFloat(materialPrice) + parseFloat(fixedCost || 25);
}

// 创建订单
router.post('/', requireLogin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      order_type,        // 'preset' | 'custom'
      items,             // [{ product_id, custom_file_path, custom_file_name, bambu_link, material, color, quantity }]
      remark,
      recipient_name,
      recipient_phone,
      shipping_address,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: '订单不能为空' });
    }
    if (!recipient_name || !recipient_phone || !shipping_address) {
      return res.status(400).json({ error: '收货信息不完整' });
    }

    await conn.beginTransaction();

    let totalPrice = 0;
    const processedItems = [];

    for (const item of items) {
      let unitPrice = 0;
      let productWeight = 50; // 默认50克

      // 获取耗材价格
      const [matRows] = await conn.execute('SELECT price_per_unit FROM materials WHERE name = ? AND available = TRUE', [item.material]);
      if (matRows.length === 0) throw new Error(`耗材 ${item.material} 不存在或已停用`);
      const matPrice = parseFloat(matRows[0].price_per_unit);

      if (order_type === 'preset' && item.product_id) {
        // 预置产品：价格 = 克重 × 耗材单价 + 固定成本
        const [prodRows] = await conn.execute('SELECT weight, fixed_cost FROM products WHERE id = ?', [item.product_id]);
        if (prodRows.length === 0) throw new Error(`产品 ${item.product_id} 不存在`);
        productWeight = prodRows[0].weight;
        unitPrice = calcUnitPrice(productWeight, matPrice, prodRows[0].fixed_cost);
      } else if (order_type === 'custom') {
        // 自定义模型：价格 = 估算克重(50g) × 耗材单价 + 固定成本
        unitPrice = calcUnitPrice(productWeight, matPrice, 25);
      }

      const qty = item.quantity || 1;
      const subtotal = unitPrice * qty;
      totalPrice += subtotal;

      processedItems.push({
        product_id: item.product_id || null,
        custom_file_path: item.custom_file_path || null,
        custom_file_name: item.custom_file_name || null,
        bambu_link: item.bambu_link || null,
        product_weight: productWeight,
        material: item.material,
        color: item.color,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: subtotal,
      });
    }

    const orderNo = genOrderNo();

    // 创建订单主记录
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_no, user_id, order_type, total_price, status, remark, recipient_name, recipient_phone, shipping_address)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [orderNo, req.session.user.id, order_type, totalPrice.toFixed(2),
       remark || null, recipient_name, recipient_phone, shipping_address]
    );

    // 创建订单明细
    for (const item of processedItems) {
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, custom_file_path, custom_file_name, bambu_link, product_weight, material, color, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderResult.insertId, item.product_id, item.custom_file_path, item.custom_file_name,
         item.bambu_link, item.product_weight, item.material, item.color, item.quantity,
         item.unit_price.toFixed(2), item.subtotal.toFixed(2)]
      );
    }

    await conn.commit();

    res.json({
      message: '下单成功',
      order_no: orderNo,
      total_price: totalPrice.toFixed(2),
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: '下单失败', detail: err.message });
  } finally {
    conn.release();
  }
});

// 查询我的订单列表（分页）
router.get('/my', requireLogin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?',
    [req.session.user.id]
  );

  const [rows] = await pool.execute(
    `SELECT o.*, GROUP_CONCAT(oi.material, ' x', oi.quantity) AS items_summary
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.session.user.id, pageSize, offset]
  );
  res.json({
    orders: rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

// 查询订单详情
router.get('/:orderNo', requireLogin, async (req, res) => {
  const [orderRows] = await pool.execute(
    'SELECT * FROM orders WHERE order_no = ? AND user_id = ?',
    [req.params.orderNo, req.session.user.id]
  );
  if (orderRows.length === 0) {
    return res.status(404).json({ error: '订单不存在' });
  }
  const order = orderRows[0];
  const [items] = await pool.execute(
    `SELECT oi.*, p.name AS product_name, p.image_url
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [order.id]
  );
  res.json({ order, items });
});

// 取消订单
router.put('/:orderNo/cancel', requireLogin, async (req, res) => {
  const [rows] = await pool.execute(
    `UPDATE orders SET status = 'cancelled' WHERE order_no = ? AND user_id = ? AND status = 'pending'`,
    [req.params.orderNo, req.session.user.id]
  );
  if (rows.affectedRows === 0) {
    return res.status(400).json({ error: '订单无法取消（可能已处理）' });
  }
  res.json({ message: '订单已取消' });
});

module.exports = router;
