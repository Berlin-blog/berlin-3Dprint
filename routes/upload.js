const express = require('express');
const multer = require('multer');
const path = require('path');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Vercel 文件系统只读，用内存存储；本地开发也用内存保持一致
// 文件不落盘，只记录文件名，管理员通过订单备注中的文件名联系用户获取文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const exts = ['.stl', '.obj', '.3mf', '.ply', '.gcode'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (exts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 STL / OBJ / 3MF / PLY / GCODE 格式'));
    }
  },
});

// 上传模型文件（内存存储，返回文件名和大小，不保存文件本身）
router.post('/model', requireLogin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未收到文件' });
  }
  // 生成一个唯一文件名用于记录
  const ext = path.extname(req.file.originalname);
  const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  res.json({
    message: '上传成功',
    file_path: `/uploads/models/${uniqueName}`,
    file_name: req.file.originalname,
    file_size: req.file.size,
    note: '文件已接收，请通过订单备注补充模型详情，管理员会联系您确认',
  });
});

// 上传产品图片（同样内存存储）
const imgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (exts.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 JPG/PNG/GIF/WEBP 图片'));
  },
});

router.post('/image', requireLogin, imgUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const ext = path.extname(req.file.originalname);
  const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  // 本地开发可以保存到磁盘
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const fs = require('fs');
    const dir = path.join(__dirname, '..', 'uploads', 'products');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, uniqueName), req.file.buffer);
  }
  // 生产环境建议用图片 URL 代替上传
  res.json({
    message: '上传成功',
    image_url: `/uploads/products/${uniqueName}`,
    note: process.env.VERCEL ? '生产环境请直接填写图片URL' : null,
  });
});

module.exports = router;
