const express = require('express');
const { pool } = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 消息列表（分页）
router.get('/', requireLogin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM messages WHERE user_id = ?',
    [req.user.id]
  );

  const [rows] = await pool.execute(
    `SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    [req.user.id]
  );

  const [[{ unread }]] = await pool.execute(
    'SELECT COUNT(*) AS unread FROM messages WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );

  res.json({
    messages: rows,
    unread,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

// 未读消息数
router.get('/unread/count', requireLogin, async (req, res) => {
  const [[{ unread }]] = await pool.execute(
    'SELECT COUNT(*) AS unread FROM messages WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ unread });
});

// 标记单条已读
router.put('/:id/read', requireLogin, async (req, res) => {
  await pool.execute(
    'UPDATE messages SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  res.json({ message: '已标记已读' });
});

// 标记全部已读
router.put('/read-all', requireLogin, async (req, res) => {
  await pool.execute(
    'UPDATE messages SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ message: '已全部标记已读' });
});

// 发送消息（内部使用：订单状态变更通知）
async function sendMessage(userId, title, content, orderNo) {
  await pool.execute(
    'INSERT INTO messages (user_id, title, content, order_no) VALUES (?, ?, ?, ?)',
    [userId, title, content, orderNo || null]
  );
}

module.exports = router;
module.exports.sendMessage = sendMessage;
