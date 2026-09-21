/** 认证中间件 — JWT cookie 方式（适配 Vercel Serverless） */
const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || '3dprint-secret-key-2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, real_name: user.real_name, phone: user.phone, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, user) {
  const token = generateToken(user);
  res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
}

// 从 cookie 解析用户信息，挂到 req.user
function parseUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.auth_token;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key] = val.join('=');
  }
  return cookies;
}

function requireLogin(req, res, next) {
  const user = parseUser(req);
  if (!user) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = parseUser(req);
  if (!user) {
    return res.status(401).json({ error: '请先登录' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: '无管理员权限' });
  }
  req.user = user;
  next();
}

module.exports = { requireLogin, requireAdmin, parseUser, setAuthCookie, clearAuthCookie, generateToken };
