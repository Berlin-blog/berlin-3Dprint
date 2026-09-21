const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ===== 公开接口 =====

// 获取所有耗材
router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM materials ORDER BY sort_order');
  res.json({ materials: rows });
});

// 获取所有颜色
router.get('/colors', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM colors ORDER BY sort_order');
  res.json({ colors: rows });
});

// 获取所有颜色（管理后台用，包含不可用的）
router.get('/colors/all', requireAdmin, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM colors ORDER BY sort_order');
  res.json({ colors: rows });
});

// ===== 管理员：耗材 CRUD =====

// 新增耗材
router.post('/', requireAdmin, async (req, res) => {
  const { name, price_per_unit, unit, description, pros, cons, sort_order, available } = req.body;
  if (!name || price_per_unit == null) {
    return res.status(400).json({ error: '耗材名称和单价不能为空' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO materials (name, price_per_unit, unit, description, pros, cons, available, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, price_per_unit, unit || '克', description || null, pros || null, cons || null,
       available !== undefined ? available : true, sort_order || 0]
    );
    res.json({ message: '创建成功', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: '创建失败', detail: err.message });
  }
});

// 更新耗材
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, price_per_unit, unit, description, pros, cons, available, sort_order } = req.body;
  try {
    await pool.execute(
      `UPDATE materials SET name=?, price_per_unit=?, unit=?, description=?, pros=?, cons=?, available=?, sort_order=? WHERE id=?`,
      [name, price_per_unit, unit || '克', description, pros, cons,
       available !== undefined ? available : true, sort_order || 0, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: '更新失败', detail: err.message });
  }
});

// 删除耗材（物理删除）
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '耗材不存在' });
    }
    res.json({ message: '已删除' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', detail: err.message });
  }
});

// ===== 管理员：颜色 CRUD =====

// 新增颜色
router.post('/colors', requireAdmin, async (req, res) => {
  const { name, hex_code, sort_order, available } = req.body;
  if (!name || !hex_code) {
    return res.status(400).json({ error: '颜色名称和色值不能为空' });
  }
  const [result] = await pool.execute(
    'INSERT INTO colors (name, hex_code, available, sort_order) VALUES (?, ?, ?, ?)',
    [name, hex_code, available !== undefined ? available : true, sort_order || 0]
  );
  res.json({ message: '创建成功', id: result.insertId });
});

// 更新颜色
router.put('/colors/:id', requireAdmin, async (req, res) => {
  const { name, hex_code, available, sort_order } = req.body;
  await pool.execute(
    'UPDATE colors SET name=?, hex_code=?, available=?, sort_order=? WHERE id=?',
    [name, hex_code, available, sort_order, req.params.id]
  );
  res.json({ message: '更新成功' });
});

// 删除颜色
router.delete('/colors/:id', requireAdmin, async (req, res) => {
  const [result] = await pool.execute('DELETE FROM colors WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '颜色不存在' });
  res.json({ message: '已删除' });
});

module.exports = router;
