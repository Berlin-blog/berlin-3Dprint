const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const { sendMessage } = require('./messages');

const router = express.Router();

// 所有管理员接口都需要管理员权限
router.use(requireAdmin);

// 数据概览
router.get('/dashboard', async (req, res) => {
  const [[{ total_orders }]] = await pool.execute('SELECT COUNT(*) AS total_orders FROM orders');
  const [[{ pending_orders }]] = await pool.execute("SELECT COUNT(*) AS pending_orders FROM orders WHERE status = 'pending'");
  const [[{ total_revenue }]] = await pool.execute("SELECT COALESCE(SUM(total_price), 0) AS total_revenue FROM orders WHERE status != 'cancelled'");
  const [[{ total_products }]] = await pool.execute('SELECT COUNT(*) AS total_products FROM products WHERE available = TRUE');
  const [[{ total_users }]] = await pool.execute("SELECT COUNT(*) AS total_users FROM users WHERE role = 'customer'");
  const [statusStats] = await pool.execute(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
  );
  const [recentOrders] = await pool.execute(
    `SELECT o.order_no, o.total_price, o.status, o.created_at, u.username, o.recipient_name
     FROM orders o JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC LIMIT 10`
  );
  res.json({
    total_orders, pending_orders, total_revenue, total_products, total_users,
    statusStats, recentOrders,
  });
});

// 订单管理列表（分页）
router.get('/orders', async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 15));
  const offset = (page - 1) * pageSize;

  let where = '';
  const params = [];
  if (status && status !== 'all') {
    where = ' WHERE o.status = ?';
    params.push(status);
  }

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM orders o ${where}`, params
  );

  const [rows] = await pool.execute(
    `SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id ${where}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json({
    orders: rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

// 订单详情（管理员）
router.get('/orders/:orderNo', async (req, res) => {
  const [orderRows] = await pool.execute(
    `SELECT o.*, u.username, u.phone, u.email
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.order_no = ?`,
    [req.params.orderNo]
  );
  if (orderRows.length === 0) return res.status(404).json({ error: '订单不存在' });
  const [items] = await pool.execute(
    `SELECT oi.*, p.name AS product_name, p.image_url
     FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderRows[0].id]
  );
  res.json({ order: orderRows[0], items });
});

// 更新订单状态（并发送站内消息通知用户）
router.put('/orders/:orderNo/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'printing', 'shipped', 'completed', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' });
  }

  // 查订单获取 user_id 和旧状态
  const [orderRows] = await pool.execute(
    'SELECT id, user_id, status FROM orders WHERE order_no = ?',
    [req.params.orderNo]
  );
  if (orderRows.length === 0) return res.status(404).json({ error: '订单不存在' });

  const order = orderRows[0];
  await pool.execute('UPDATE orders SET status = ? WHERE order_no = ?', [status, req.params.orderNo]);

  // 发送站内消息（状态确实变化时才发）
  if (order.status !== status) {
    const statusTextMap = {
      pending: '待确认', confirmed: '已确认', printing: '打印中',
      shipped: '已发货', completed: '已完成', cancelled: '已取消',
    };
    await sendMessage(
      order.user_id,
      `订单状态更新：${statusTextMap[status]}`,
      `您的订单 ${req.params.orderNo} 状态已更新为「${statusTextMap[status]}」。`,
      req.params.orderNo
    );
  }

  res.json({ message: '状态已更新' });
});

// 产品管理列表（含不可用的）
router.get('/products', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');
  res.json({ products: rows });
});

// 材料管理
router.get('/materials', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM materials ORDER BY sort_order');
  res.json({ materials: rows });
});

// 用户列表
router.get('/users', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, username, real_name, phone, email, role, created_at FROM users ORDER BY created_at DESC`
  );
  res.json({ users: rows });
});

module.exports = router;
