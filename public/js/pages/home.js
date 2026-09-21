// ===== 首页 =====
async function renderHome(scrollTarget) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="hero">
      <div class="hero-content container">
        <h1>万物皆可打印</h1>
        <p>上传你的3D模型，或填写 Bambu 官方模型链接，选择材料与颜色，一键下单定制打印</p>
        <div class="hero-btns">
          <button class="btn btn-primary btn-lg" onclick="navigate('/custom')">🚀 立即定制</button>
          <button class="btn btn-ghost-light btn-lg" onclick="document.getElementById('products').scrollIntoView({behavior:'smooth'})">浏览产品</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="num">8+</div><div class="label">打印材料</div></div>
          <div class="hero-stat"><div class="num">10</div><div class="label">可选颜色</div></div>
          <div class="hero-stat"><div class="num">100<span style="font-size:24px">MB</span></div><div class="label">最大文件</div></div>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- 特性区 -->
      <div class="features">
        <div class="feature-card">
          <div class="feature-icon">📁</div>
          <h3>上传即打印</h3>
          <p>支持 STL / OBJ / 3MF / PLY / GCODE 格式，拖拽上传，一键提交打印</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔗</div>
          <h3>Bambu 模型直链</h3>
          <p>填写 Bambu 官方模型分享链接，无需下载，直接下单打印</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎨</div>
          <h3>多材料多颜色</h3>
          <p>8种打印材料，10种颜色可选，每种材料附带优缺点对比</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📦</div>
          <h3>订单全程追踪</h3>
          <p>从待确认到打印中再到发货，实时掌握订单进度</p>
        </div>
      </div>

      <!-- 产品区 -->
      <div class="section-title" id="products">🔥 热门产品</div>
      <div class="section-sub">精选3D打印好物，即选即下单</div>
      <div class="filter-bar">
        <select id="categoryFilter" onchange="loadProducts()">
          <option value="all">全部分类</option>
        </select>
        <input type="text" id="searchInput" placeholder="搜索产品名称..." onkeyup="if(event.key==='Enter')loadProducts()">
        <button class="btn btn-primary btn-sm" onclick="loadProducts()">🔍 搜索</button>
      </div>
      <div id="productGrid">${skeletonGrid()}</div>
      <div id="productPagination"></div>
    </div>
  `;

  // 加载分类
  try {
    const { categories } = await API.getCategories();
    const sel = document.getElementById('categoryFilter');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
  } catch (e) { /* ignore */ }

  await loadProducts();

  if (scrollTarget === 'products') {
    setTimeout(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}

async function loadProducts(page) {
  page = page || 1;
  const grid = document.getElementById('productGrid');
  const pgEl = document.getElementById('productPagination');
  if (!grid) return;
  grid.innerHTML = loadingState();
  const cat = document.getElementById('categoryFilter')?.value || 'all';
  const search = document.getElementById('searchInput')?.value || '';
  const params = new URLSearchParams();
  if (cat !== 'all') params.set('category', cat);
  if (search) params.set('search', search);
  params.set('page', page);

  try {
    const { products, pagination } = await API.getProducts(params.toString());
    if (products.length === 0) {
      grid.innerHTML = emptyState('🔍', '没有找到匹配的产品');
      if (pgEl) pgEl.innerHTML = '';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="navigate('/product/${p.id}')">
        <img src="${esc(p.image_url) || '/img/placeholder.png'}" alt="${esc(p.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22220%22><rect width=%22400%22 height=%22220%22 fill=%22%23f1f5f9%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2218%22>暂无图片</text></svg>'">
        <div class="product-info">
          <div class="product-name">${esc(p.name)}</div>
          <div class="product-desc">${esc(p.description)}</div>
          <div class="product-meta">
            <span class="product-price">${formatPrice(p.price_from)}<span style="font-size:13px;font-weight:400;color:var(--text-light)"> 起</span></span>
            <span class="product-cat">${esc(p.category) || '其他'}</span>
          </div>
        </div>
      </div>
    `).join('');
    if (pgEl) pgEl.innerHTML = renderPagination(pagination, 'loadProducts');
  } catch (e) {
    grid.innerHTML = emptyState('⚠️', '加载失败: ' + e.message);
  }
}
