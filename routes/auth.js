const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireLogin } = require('../middleware/auth');
const { checkLocked, recordFailure, clearFailures, getRemainingAttempts, MAX_ATTEMPTS } = require('../middleware/rateLimit');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, password, real_name, phone, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: '该用户名不可注册' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.execute(
      'INSERT INTO users (username, password, real_name, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashed, real_name || null, phone || null, email || null, 'customer']
    );
    res.json({ message: '注册成功' });
  } catch (err) {
    res.status(500).json({ error: '注册失败', detail: err.message });
  }
});

// 登录（带失败计数+锁定）
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  // 检查是否被锁定
  const lockMsg = checkLocked(username);
  if (lockMsg) {
    return res.status(429).json({ error: lockMsg });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      const record = recordFailure(username);
      const remaining = getRemainingAttempts(username);
      if (record.lockedUntil) {
        return res.status(429).json({ error: '密码错误次数过多，账号已被临时锁定15分钟' });
      }
      return res.status(400).json({ error: `用户名或密码错误（剩余 ${remaining} 次尝试机会）` });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const record = recordFailure(username);
      const remaining = getRemainingAttempts(username);
      if (record.lockedUntil) {
        return res.status(429).json({ error: '密码错误次数过多，账号已被临时锁定15分钟' });
      }
      return res.status(400).json({ error: `用户名或密码错误（剩余 ${remaining} 次尝试机会）` });
    }

    // 登录成功，清除失败记录
    clearFailures(username);

    req.session.user = {
      id: user.id,
      username: user.username,
      real_name: user.real_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };
    res.json({ message: '登录成功', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: '登录失败', detail: err.message });
  }
});

// 退出
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: '已退出登录' });
  });
});

// 获取当前用户
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.session.user });
});

// 更新个人信息
router.put('/profile', requireLogin, async (req, res) => {
  const { real_name, phone, email } = req.body;
  try {
    await pool.execute(
      'UPDATE users SET real_name = ?, phone = ?, email = ? WHERE id = ?',
      [real_name || null, phone || null, email || null, req.session.user.id]
    );
    req.session.user.real_name = real_name;
    req.session.user.phone = phone;
    req.session.user.email = email;
    res.json({ message: '更新成功', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: '更新失败', detail: err.message });
  }
});

module.exports = router;
