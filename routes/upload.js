const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'models');
fs.mkdirSync(uploadDir, { recursive: true });

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
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

// 上传模型文件
router.post('/model', requireLogin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未收到文件' });
  }
  res.json({
    message: '上传成功',
    file_path: `/uploads/models/${req.file.filename}`,
    file_name: req.file.originalname,
    file_size: req.file.size,
  });
});

// 上传产品图片
const imgDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(imgDir, { recursive: true });

const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imgDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});

const imgUpload = multer({
  storage: imgStorage,
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
  res.json({
    message: '上传成功',
    image_url: `/uploads/products/${req.file.filename}`,
  });
});

module.exports = router;
