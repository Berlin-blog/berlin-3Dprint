-- ============================================
-- 3D打印下单平台 数据库初始化脚本 V2
-- 数据库: 3dprint  字符集: utf8mb4
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  real_name VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  role ENUM('admin', 'customer') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 打印材料表
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL COMMENT '每单位价格(元)',
  unit VARCHAR(20) DEFAULT '克',
  description TEXT,
  pros TEXT COMMENT '优点，用|分隔',
  cons TEXT COMMENT '缺点，用|分隔',
  available BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 颜色表
CREATE TABLE IF NOT EXISTS colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  hex_code VARCHAR(7) NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 预置产品表
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL COMMENT '基础参考价格',
  weight INT DEFAULT 50 COMMENT '打印所需克数',
  fixed_cost DECIMAL(10, 2) DEFAULT 25.00 COMMENT '固定成本(时间成本+电费)',
  image_url VARCHAR(500),
  category VARCHAR(50),
  stock INT DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  order_type ENUM('preset', 'custom') NOT NULL COMMENT 'preset=预置产品 custom=自定义模型',
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'printing', 'shipped', 'completed', 'cancelled')
    DEFAULT 'pending' COMMENT '待确认/已确认/打印中/已发货/已完成/已取消',
  remark TEXT,
  recipient_name VARCHAR(50) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  shipping_address VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT COMMENT '预置产品ID(自定义订单为NULL)',
  custom_file_path VARCHAR(500) COMMENT '自定义模型文件路径',
  custom_file_name VARCHAR(255) COMMENT '原始文件名',
  bambu_link VARCHAR(500) COMMENT 'Bambu官方模型分享链接',
  product_weight INT DEFAULT 50 COMMENT '产品打印克重',
  material VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 示例数据
-- ============================================

-- 材料 (密码在 init.js 中通过 bcrypt 创建用户)
INSERT INTO materials (name, price_per_unit, unit, description, pros, cons, sort_order) VALUES
('PLA',          0.30, '克', '环保可降解，适合模型展示，打印精度高',
  '易打印成功率高|无需加热腔|精度高细节好|环保可降解',
  '耐热性差(60°C易变形)|脆性较大易断裂|不适合长时间户外使用', 1),
('PLA Lite',     0.25, '克', '入门级PLA，打印简单表面光滑，适合初学者和快速原型',
  '易打印成功率高|低温柔性较好|表面光滑细腻|价格实惠适合练手',
  '强度略低于普通PLA|耐热性同样有限|不适合承重功能件', 2),
('PLA Pure',     0.50, '克', '食品级高纯度PLA，色彩通透无杂质，环保安全',
  '食品级安全无毒|高纯度无杂质|色彩通透美观|环保可完全降解',
  '价格较高|打印速度建议较慢|对温度较敏感需调参', 3),
('ABS',          0.35, '克', '强度高耐高温，适合功能性零件',
  '强度高韧性好|耐高温(100°C+)|可打磨抛光上色|适合功能性零件',
  '打印时有刺激性气味|需要加热腔防翘边|不适合室内无通风环境', 4),
('树脂(光固化)', 0.80, '克', '表面光滑精度极高，适合精细手办珠宝',
  '精度极高表面光滑|适合精细手办珠宝|细节表现力最强|可做透明件',
  '需后处理(清洗+固化)|树脂有毒性需防护|打印尺寸受限|材料成本较高', 5),
('尼龙(PA)',     0.50, '克', '韧性好耐磨损，适合机械零件',
  '韧性极佳耐冲击|耐磨损耐疲劳|耐高温适合机械件|可承受较大应力',
  '易吸潮需干燥保存|打印难度较高|表面较粗糙需后处理', 6),
('TPU(柔性)',    0.45, '克', '柔性材料，适合手机壳鞋底等',
  '柔软可弯折|耐冲击抗摔|适合手机壳鞋底密封件|贴合度好',
  '打印速度慢|不支持悬空结构|精度较低|回弹形状有限制', 7),
('PETG',         0.38, '克', '兼顾强度与韧性，食品级安全',
  '兼顾强度与韧性|食品级安全无毒|不易翘边易打印|耐化学腐蚀',
  '容易拉丝需调参|打印温度较高|表面有轻微光泽不均', 8);

-- 颜色
INSERT INTO colors (name, hex_code, sort_order) VALUES
('白色', '#FFFFFF', 1),
('黑色', '#222222', 2),
('红色', '#E74C3C', 3),
('橙色', '#E67E22', 4),
('黄色', '#F1C40F', 5),
('绿色', '#27AE60', 6),
('蓝色', '#3498DB', 7),
('紫色', '#9B59B6', 8),
('灰色', '#95A5A6', 9),
('透明', '#ECF0F1', 10);

-- 预置产品 (price=基础参考价, weight=打印克重, fixed_cost=固定成本25元=时间20+电费5)
INSERT INTO products (name, description, price, weight, fixed_cost, image_url, category, stock) VALUES
('创意齿轮花瓶', '参数化设计的齿轮纹理花瓶，层叠造型兼具几何美感与实用功能。高15cm，直径8cm。', 89.00, 120, 25.00, 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600', '家居装饰', 50),
('迷你建筑模型', '微缩现代主义别墅建筑模型，精细还原建筑细节，适合摆件或教学展示。', 129.00, 200, 25.00, 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600', '模型摆件', 30),
('恐龙骨架化石', '1:20比例霸王龙骨架3D打印模型，可拼接组装，科普收藏佳品。全长35cm。', 199.00, 350, 25.00, 'https://images.unsplash.com/photo-1580687774429-7c3a0e9e8e3a?w=600', '模型摆件', 20),
('定制名字钥匙扣', '个性化文字钥匙扣，可定制姓名或短语，送礼自用两相宜。', 25.00, 15, 25.00, 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600', '实用小物', 200),
('几何笔筒收纳', '六边形蜂窝结构笔筒，模块化设计可自由拼接扩展，桌面收纳利器。', 45.00, 80, 25.00, 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600', '办公文具', 100),
('手机支架', '符合人体工学的桌面手机/平板支架，多角度调节，PLA材质轻巧稳固。', 35.00, 45, 25.00, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600', '实用小物', 150),
('机械关节手办', '可动关节机器人手办，全身12个可动关节，自由摆造型。高12cm。', 159.00, 180, 25.00, 'https://images.unsplash.com/photo-1635776062764-e025521e3df3?w=600', '模型摆件', 25),
('艺术抽象雕塑', '莫比乌斯环变体抽象雕塑，数学之美与艺术的结合，桌面艺术摆件。', 78.00, 100, 25.00, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600', '家居装饰', 40);
