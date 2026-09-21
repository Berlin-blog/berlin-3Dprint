// ===== 管理后台 =====
async function renderAdmin(subPath) {
  const app = document.getElementById('app');
  if (!App.currentUser || App.currentUser.role !== 'admin') {
    toast('需要管理员权限', 'error');
    navigate('/login');
    return;
  }

  const section = subPath || 'dashboard';
  app.innerHTML = `
    <div class="admin-layout">
      <button class="admin-menu-toggle" id="adminMenuToggle" onclick="toggleAdminSidebar()">☰ 菜单</button>
      <div class="admin-sidebar" id="adminSidebar">
        <a onclick="navigate('/admin');return false;" class="${section==='dashboard'?'active':''}">📊 数据概览</a>
        <a onclick="navigate('/admin/products');return false;" class="${section==='products'?'active':''}">📦 产品管理</a>
        <a onclick="navigate('/admin/orders');return false;" class="${section==='orders'?'active':''}">📋 订单管理</a>
        <a onclick="navigate('/admin/materials');return false;" class="${section==='materials'?'active':''}">🎨 耗材管理</a>
      </div>
      <div class="admin-content" id="adminContent">${loadingState()}</div>
    </div>
  `;

  if (section === 'dashboard') await adminDashboard();
  else if (section === 'products') await adminProducts();
  else if (section === 'orders') await adminOrders();
  else if (section === 'materials') await adminMaterials();
}

function toggleAdminSidebar() {
  const sb = document.getElementById('adminSidebar');
  sb.classList.toggle('open');
}

// ---- 数据概览 ----
async function adminDashboard() {
  const el = document.getElementById('adminContent');
  try {
    const d = await API.adminDashboard();
    el.innerHTML = `
      <h1 style="font-size:24px;font-weight:800;margin-bottom:24px">📊 数据概览</h1>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-label">总订单数</div><div class="stat-value">${d.total_orders}</div></div>
        <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">待处理订单</div><div class="stat-value">${d.pending_orders}</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">总收入(排除取消)</div><div class="stat-value">${formatPrice(d.total_revenue)}</div></div>
        <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-label">在售产品</div><div class="stat-value">${d.total_products}</div></div>
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-label">注册用户</div><div class="stat-value">${d.total_users}</div></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">订单状态分布</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${(d.statusStats||[]).map(s => `
            <div style="text-align:center;min-width:100px">
              <div>${statusTag(s.status)}</div>
              <div style="font-size:24px;font-weight:800;margin-top:8px">${s.count}</div>
            </div>
          `).join('') || '<p style="color:var(--text-light)">暂无数据</p>'}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">最近订单</h3>
        <table class="data-table">
          <thead><tr><th>订单号</th><th>用户</th><th>收货人</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            ${(d.recentOrders||[]).map(o => `
              <tr style="cursor:pointer" onclick="navigate('/admin/orders')">
                <td>${esc(o.order_no)}</td>
                <td>${esc(o.username)}</td>
                <td>${esc(o.recipient_name)}</td>
                <td>${formatPrice(o.total_price)}</td>
                <td>${statusTag(o.status)}</td>
                <td>${new Date(o.created_at).toLocaleString('zh-CN')}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-light)">暂无订单</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

// ---- 产品管理 ----
async function adminProducts() {
  const el = document.getElementById('adminContent');
  try {
    const { products } = await API.adminGetProducts();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h1 style="font-size:24px;font-weight:800">📦 产品管理</h1>
        <button class="btn btn-primary" onclick="showProductForm()">+ 新增产品</button>
      </div>
      <table class="data-table">
        <thead><tr><th>ID</th><th>图片</th><th>名称</th><th>分类</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td>${p.id}</td>
              <td><img src="${esc(p.image_url)||''}" style="width:50px;height:50px;border-radius:6px;object-fit:cover" onerror="this.style.display='none'"></td>
              <td>${esc(p.name)}</td>
              <td>${esc(p.category) || '-'}</td>
              <td>${formatPrice(p.price)}</td>
              <td>${p.stock}</td>
              <td>${p.available ? '<span style="color:var(--success)">在售</span>' : '<span style="color:var(--danger)">已下架</span>'}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="showProductForm(${p.id})">编辑</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">下架</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

async function showProductForm(id) {
  let p = { name:'', description:'', price:'', weight:50, fixed_cost:25, image_url:'', category:'', stock:0, available:true };
  if (id) {
    const { products } = await API.adminGetProducts();
    p = products.find(x => x.id === id) || p;
  }
  showModal(id ? '编辑产品' : '新增产品', `
    <div class="form-group"><label>产品名称 *</label><input type="text" id="pfName" value="${esc(p.name)}"></div>
    <div class="form-group"><label>描述</label><textarea id="pfDesc">${esc(p.description)}</textarea></div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1"><label>参考价格 *</label><input type="number" step="0.01" id="pfPrice" value="${p.price}"></div>
      <div class="form-group" style="flex:1"><label>打印克重(g) *</label><input type="number" id="pfWeight" value="${p.weight || 50}"></div>
      <div class="form-group" style="flex:1"><label>固定成本(元)</label><input type="number" step="0.01" id="pfFixedCost" value="${p.fixed_cost || 25}"></div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1"><label>库存</label><input type="number" id="pfStock" value="${p.stock}"></div>
      <div class="form-group" style="flex:1"><label>分类</label><input type="text" id="pfCategory" value="${esc(p.category)}"></div>
    </div>
    <div class="form-group"><label>图片URL</label><input type="text" id="pfImage" value="${esc(p.image_url)}" placeholder="输入图片URL">
      <div style="margin-top:8px">
        <input type="file" id="pfImgFile" accept="image/*" style="font-size:13px" onchange="uploadProductImage(this)">
      </div>
    </div>
    <div class="form-group"><label>状态</label>
      <select id="pfAvailable"><option value="true" ${p.available?'selected':''}>在售</option><option value="false" ${!p.available?'selected':''}>下架</option></select>
    </div>
    <div style="background:var(--bg-alt);padding:12px;border-radius:var(--radius-sm);font-size:13px;color:var(--text-light)">
      💡 实际价格 = 克重 × 耗材单价 + 固定成本。固定成本默认25元（时间成本20元 + 电费5元）。
    </div>
  `, [
    { label: '保存', class: 'btn-primary', onclick: `saveProduct(${id||'null'})` },
  ]);
}

async function uploadProductImage(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await API.uploadImage(formData);
    if (res.image_url) {
      document.getElementById('pfImage').value = res.image_url;
      toast('图片上传成功', 'success');
    }
  } catch (e) {
    toast('图片上传失败: ' + e.message, 'error');
  }
}

async function saveProduct(id) {
  const body = {
    name: document.getElementById('pfName').value,
    description: document.getElementById('pfDesc').value,
    price: parseFloat(document.getElementById('pfPrice').value),
    weight: parseInt(document.getElementById('pfWeight').value) || 50,
    fixed_cost: parseFloat(document.getElementById('pfFixedCost').value) || 25,
    stock: parseInt(document.getElementById('pfStock').value),
    category: document.getElementById('pfCategory').value,
    image_url: document.getElementById('pfImage').value,
    available: document.getElementById('pfAvailable').value === 'true',
  };
  if (!body.name || isNaN(body.price)) { toast('名称和价格不能为空', 'error'); return; }
  try {
    if (id) {
      await API.adminUpdateProduct(id, body);
    } else {
      await API.adminCreateProduct(body);
    }
    toast('保存成功', 'success');
    closeModal();
    adminProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteProduct(id) {
  showModal('确认下架', '<p>确定要下架此产品吗？下架后用户将看不到此产品。</p>', [
    { label: '确认下架', class: 'btn-danger', onclick: `doDeleteProduct(${id})` },
  ]);
}

async function doDeleteProduct(id) {
  try {
    await API.adminDeleteProduct(id);
    toast('已下架', 'success');
    closeModal();
    adminProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- 订单管理 ----
let _adminOrderStatus = 'all';

async function adminOrders(page) {
  page = page || 1;
  const el = document.getElementById('adminContent');
  try {
    const data = await API.adminGetOrders(_adminOrderStatus, page, 15);
    const { orders, pagination } = data;
    el.innerHTML = `
      <h1 style="font-size:24px;font-weight:800;margin-bottom:24px">📋 订单管理</h1>
      <div class="filter-bar">
        <button class="btn btn-sm ${_adminOrderStatus==='all'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('all')">全部</button>
        <button class="btn btn-sm ${_adminOrderStatus==='pending'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('pending')">待确认</button>
        <button class="btn btn-sm ${_adminOrderStatus==='confirmed'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('confirmed')">已确认</button>
        <button class="btn btn-sm ${_adminOrderStatus==='printing'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('printing')">打印中</button>
        <button class="btn btn-sm ${_adminOrderStatus==='shipped'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('shipped')">已发货</button>
        <button class="btn btn-sm ${_adminOrderStatus==='completed'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('completed')">已完成</button>
        <button class="btn btn-sm ${_adminOrderStatus==='cancelled'?'btn-primary':'btn-outline'}" onclick="adminFilterOrders('cancelled')">已取消</button>
      </div>
      <table class="data-table" id="adminOrderTable">
        <thead><tr><th>订单号</th><th>用户</th><th>类型</th><th>金额</th><th>状态</th><th>收货人</th><th>时间</th><th>操作</th></tr></thead>
        <tbody id="adminOrderBody">
          ${orders.map(o => `
            <tr>
              <td style="cursor:pointer;color:var(--primary)" onclick="adminViewOrder('${esc(o.order_no)}')">${esc(o.order_no)}</td>
              <td>${esc(o.username)}</td>
              <td>${o.order_type === 'custom' ? '🎨定制' : '🛒预置'}</td>
              <td>${formatPrice(o.total_price)}</td>
              <td>${statusTag(o.status)}</td>
              <td>${esc(o.recipient_name)}<br><span style="font-size:12px;color:var(--text-light)">${esc(o.recipient_phone)}</span></td>
              <td style="font-size:13px">${new Date(o.created_at).toLocaleString('zh-CN')}</td>
              <td><button class="btn btn-outline btn-sm" onclick="adminViewOrder('${esc(o.order_no)}')">详情</button></td>
            </tr>
          `).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-light)">暂无订单</td></tr>'}
        </tbody>
      </table>
      ${renderPagination(pagination, 'adminOrders')}
    `;
  } catch (e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

async function adminFilterOrders(status) {
  _adminOrderStatus = status;
  adminOrders(1);
}

async function adminViewOrder(orderNo) {
  showModal('订单详情 ' + orderNo, loadingState('加载中...'));
  try {
    const { order, items } = await API.adminGetOrder(orderNo);
    const statuses = ['pending','confirmed','printing','shipped','completed','cancelled'];
    const content = `
      <div class="order-detail-block">
        <h3>订单信息</h3>
        <p><strong>订单号:</strong> ${esc(order.order_no)}</p>
        <p><strong>用户:</strong> ${esc(order.username)} (${esc(order.phone||'-')} / ${esc(order.email||'-')})</p>
        <p><strong>类型:</strong> ${order.order_type === 'custom' ? '🎨 自定义定制' : '🛒 预置产品'}</p>
        <p><strong>总价:</strong> <span style="color:var(--primary);font-weight:700">${formatPrice(order.total_price)}</span></p>
        <p><strong>当前状态:</strong> ${statusTag(order.status)}</p>
        <p><strong>下单时间:</strong> ${new Date(order.created_at).toLocaleString('zh-CN')}</p>
        ${order.remark ? `<p><strong>备注:</strong> ${esc(order.remark)}</p>` : ''}
      </div>
      <div class="order-detail-block">
        <h3>收货信息</h3>
        <p><strong>收货人:</strong> ${esc(order.recipient_name)}</p>
        <p><strong>电话:</strong> ${esc(order.recipient_phone)}</p>
        <p><strong>地址:</strong> ${esc(order.shipping_address)}</p>
      </div>
      <div class="order-detail-block">
        <h3>打印明细</h3>
        ${items.map(item => `
          <div class="order-item-row">
            ${item.product_name
              ? `<img src="${esc(item.image_url) || ''}" onerror="this.style.display='none'">`
              : `<div style="width:60px;height:60px;border-radius:8px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;font-size:24px">🎨</div>`}
            <div class="item-info">
              <div class="item-name">${esc(item.product_name || item.custom_file_name || '自定义模型')}</div>
              <div class="item-spec">材料: ${esc(item.material)} · 颜色: ${esc(item.color)} · 数量: ${item.quantity}<br>单价: ${formatPrice(item.unit_price)} · 小计: ${formatPrice(item.subtotal)}</div>
              ${item.bambu_link ? `<div style="margin-top:4px"><a href="${esc(item.bambu_link)}" target="_blank" style="font-size:13px">🔗 Bambu 模型链接</a></div>` : ''}
              ${item.custom_file_path ? `<div style="margin-top:4px"><a href="${esc(item.custom_file_path)}" target="_blank" style="font-size:13px">📎 下载模型文件</a></div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="order-detail-block">
        <h3>更新订单状态</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${statuses.map(s => `
            <button class="btn btn-sm ${order.status===s?'btn-primary':'btn-outline'}" onclick="adminUpdateStatus('${esc(orderNo)}','${s}')">${STATUS_TEXT[s]}</button>
          `).join('')}
        </div>
      </div>
    `;
    showModal('订单详情 ' + orderNo, content);
  } catch (e) {
    showModal('订单详情', `<p style="color:var(--danger)">${e.message}</p>`);
  }
}

async function adminUpdateStatus(orderNo, status) {
  try {
    await API.adminUpdateOrderStatus(orderNo, status);
    toast('状态已更新', 'success');
    adminViewOrder(orderNo);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- 耗材管理（增删改查 + 定价） ----
async function adminMaterials() {
  const el = document.getElementById('adminContent');
  try {
    const { materials } = await API.getMaterials();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h1 style="font-size:24px;font-weight:800">🎨 耗材管理</h1>
        <button class="btn btn-primary" onclick="showMaterialForm()">+ 新增耗材</button>
      </div>
      <table class="data-table">
        <thead><tr><th>ID</th><th>名称</th><th>单价(元/克)</th><th>描述</th><th>优点</th><th>缺点</th><th>状态</th><th>操作</th></tr></thead>
        <tbody id="matTableBody">
          ${materials.map(m => {
            const prosList = (m.pros || '').split('|').filter(Boolean);
            const consList = (m.cons || '').split('|').filter(Boolean);
            return `
            <tr>
              <td>${m.id}</td>
              <td><strong>${esc(m.name)}</strong></td>
              <td><strong style="color:var(--primary)">¥${parseFloat(m.price_per_unit).toFixed(2)}</strong></td>
              <td style="max-width:200px;font-size:13px;color:var(--text-light)">${esc(m.description)}</td>
              <td style="max-width:200px;font-size:12px">${prosList.map(p => `<div style="color:var(--success)">✓ ${esc(p)}</div>`).join('')}</td>
              <td style="max-width:200px;font-size:12px">${consList.map(c => `<div style="color:var(--warning)">⚠ ${esc(c)}</div>`).join('')}</td>
              <td>${m.available ? '<span style="color:var(--success)">● 可用</span>' : '<span style="color:var(--danger)">● 停用</span>'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-outline btn-sm" onclick="showMaterialForm(${m.id})">编辑</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMaterial(${m.id})">删除</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

async function showMaterialForm(id) {
  let m = { name:'', price_per_unit:'', unit:'克', description:'', pros:'', cons:'', available:true, sort_order:0 };
  if (id) {
    const { materials } = await API.getMaterials();
    m = materials.find(x => x.id === id) || m;
  }
  showModal(id ? '编辑耗材' : '新增耗材', `
    <div class="form-group"><label>耗材名称 *</label><input type="text" id="mfName" value="${esc(m.name)}" placeholder="如: PLA、ABS、树脂"></div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:2"><label>单价(元/克) *</label><input type="number" step="0.01" id="mfPrice" value="${m.price_per_unit}" placeholder="0.30"></div>
      <div class="form-group" style="flex:1"><label>单位</label><input type="text" id="mfUnit" value="${esc(m.unit)}"></div>
    </div>
    <div class="form-group"><label>描述</label><textarea id="mfDesc" placeholder="耗材简介">${esc(m.description)}</textarea></div>
    <div class="form-group"><label>优点（用 | 分隔）</label><input type="text" id="mfPros" value="${esc(m.pros)}" placeholder="优点1|优点2|优点3"></div>
    <div class="form-group"><label>缺点（用 | 分隔）</label><input type="text" id="mfCons" value="${esc(m.cons)}" placeholder="缺点1|缺点2|缺点3"></div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1"><label>排序</label><input type="number" id="mfSort" value="${m.sort_order || 0}"></div>
      <div class="form-group" style="flex:1"><label>状态</label><select id="mfAvailable"><option value="true" ${m.available?'selected':''}>可用</option><option value="false" ${!m.available?'selected':''}>停用</option></select></div>
    </div>
  `, [
    { label: '保存', class: 'btn-primary', onclick: `saveMaterial(${id || 'null'})` },
  ]);
}

async function saveMaterial(id) {
  const body = {
    name: document.getElementById('mfName').value,
    price_per_unit: parseFloat(document.getElementById('mfPrice').value),
    unit: document.getElementById('mfUnit').value,
    description: document.getElementById('mfDesc').value,
    pros: document.getElementById('mfPros').value,
    cons: document.getElementById('mfCons').value,
    sort_order: parseInt(document.getElementById('mfSort').value) || 0,
    available: document.getElementById('mfAvailable').value === 'true',
  };
  if (!body.name || isNaN(body.price_per_unit)) { toast('名称和单价不能为空', 'error'); return; }
  try {
    if (id) {
      await API.updateMaterial(id, body);
    } else {
      await API.createMaterial(body);
    }
    toast('保存成功', 'success');
    closeModal();
    adminMaterials();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteMaterial(id) {
  showModal('确认删除', '<p>确定要删除此耗材吗？删除后用户将无法选择此耗材。</p>', [
    { label: '确认删除', class: 'btn-danger', onclick: `doDeleteMaterial(${id})` },
  ]);
}

async function doDeleteMaterial(id) {
  try {
    await API.deleteMaterial(id);
    toast('已删除', 'success');
    closeModal();
    adminMaterials();
  } catch (e) {
    toast(e.message, 'error');
  }
}
