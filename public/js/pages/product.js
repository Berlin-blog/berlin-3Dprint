// ===== 产品详情 + 下单页面 =====
let _productDetailState = {};

async function renderProductDetail(id) {
  const app = document.getElementById('app');
  app.innerHTML = loadingState('加载产品信息...');

  try {
    const { product } = await API.getProduct(id);
    const { materials } = await API.getMaterials();
    const { colors } = await API.getColors();

    _productDetailState = {
      product, materials, colors,
      selectedMat: null, selectedColor: null, quantity: 1,
    };

    app.innerHTML = `
      <div class="container" style="padding-top:40px;padding-bottom:80px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:32px">
          <div>
            <img src="${esc(product.image_url)}" alt="${esc(product.name)}"
                 style="width:100%;border-radius:var(--radius);box-shadow:var(--shadow-md);background:var(--bg)"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22><rect width=%22400%22 height=%22400%22 fill=%22%23f1f5f9%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2220%22>暂无图片</text></svg>'">
          </div>
          <div>
            <div style="font-size:13px;color:var(--text-light);margin-bottom:8px">${esc(product.category) || '其他'}</div>
            <h1 style="font-size:30px;font-weight:800;margin-bottom:12px;line-height:1.3">${esc(product.name)}</h1>
            <div style="font-size:34px;font-weight:800;color:var(--primary);margin-bottom:8px">
              ${formatPrice(product.price_from)}<span style="font-size:16px;font-weight:400;color:var(--text-light)"> 起</span>
            </div>
            <div style="font-size:13px;color:var(--text-light);margin-bottom:20px">最终价格随耗材选择变化</div>
            <p style="color:var(--text-light);margin-bottom:28px;line-height:1.8;font-size:15px">${esc(product.description)}</p>

            <!-- 紧凑耗材选择器 -->
            <div class="form-group">
              <label style="font-size:15px"><span class="step-num">1</span>选择耗材</label>
              <div class="mat-compact-list" id="matCompactList" style="margin-top:12px">
                ${materials.map(m => `
                  <div class="mat-compact-btn" data-mat="${esc(m.name)}" onclick="selectProductMat('${esc(m.name)}')">
                    ${esc(m.name)}
                    <span class="mat-tag-price">¥${parseFloat(m.price_per_unit).toFixed(2)}/g</span>
                  </div>
                `).join('')}
              </div>
              <div id="matDetailPanel"></div>
            </div>

            <!-- 颜色选择 -->
            <div class="form-group">
              <label style="font-size:15px"><span class="step-num">2</span>选择颜色</label>
              <div class="color-options" id="colorOptions" style="margin-top:12px">
                ${colors.map(c => `
                  <div class="color-option" onclick="selectColor(this,'${esc(c.name)}')">
                    <span class="color-swatch" style="background:${esc(c.hex_code)}"></span>
                    ${esc(c.name)}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 数量 -->
            <div class="form-group">
              <label style="font-size:15px"><span class="step-num">3</span>数量</label>
              <div style="display:flex;align-items:center;gap:12px;margin-top:12px">
                <button class="btn btn-outline btn-sm" onclick="changeQty(-1)">−</button>
                <input type="number" id="productQty" value="1" min="1" style="width:80px;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:16px"
                       onchange="syncQty(this.value)">
                <button class="btn btn-outline btn-sm" onclick="changeQty(1)">+</button>
                <span style="color:var(--text-light);font-size:14px">库存: ${product.stock}</span>
              </div>
            </div>

            <!-- 动态价格显示 -->
            <div id="dynamicPriceBox"></div>

            <div id="productOrderError" class="form-error"></div>
            <button class="btn btn-primary btn-lg btn-block" style="margin-top:16px" onclick="orderProduct(${product.id})">
              🛒 立即下单
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    app.innerHTML = `<div class="container" style="padding-top:40px">${emptyState('⚠️', e.message)}</div>`;
  }
}

// 选择耗材（紧凑模式 + 展开优缺点 + 更新动态价格）
function selectProductMat(matName) {
  const st = _productDetailState;
  st.selectedMat = matName;

  // 更新按钮选中状态
  document.querySelectorAll('#matCompactList .mat-compact-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`#matCompactList .mat-compact-btn[data-mat="${matName}"]`);
  if (btn) btn.classList.add('active');

  // 展开耗材详情面板
  const mat = st.materials.find(m => m.name === matName);
  if (!mat) return;
  const prosList = (mat.pros || '').split('|').filter(Boolean);
  const consList = (mat.cons || '').split('|').filter(Boolean);

  const panel = document.getElementById('matDetailPanel');
  panel.innerHTML = `
    <div class="mat-detail-panel">
      <div class="mat-detail-header">
        <span class="mat-detail-name">${esc(mat.name)}</span>
        <span class="mat-detail-price">¥${parseFloat(mat.price_per_unit).toFixed(2)}/${esc(mat.unit)}</span>
      </div>
      <div class="mat-detail-desc">${esc(mat.description)}</div>
      <div class="mat-pros-cons">
        <div class="mat-pros">
          <div class="mat-pros-title">✓ 优点</div>
          <ul>${prosList.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>
        <div class="mat-cons">
          <div class="mat-cons-title">⚠ 缺点</div>
          <ul>${consList.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;

  updateDynamicPrice();
}

function updateDynamicPrice() {
  const st = _productDetailState;
  if (!st.selectedMat) return;

  const mat = st.materials.find(m => m.name === st.selectedMat);
  if (!mat) return;

  const weight = st.product.weight;
  const fixedCost = parseFloat(st.product.fixed_cost);
  const matPrice = parseFloat(mat.price_per_unit);
  const unitPrice = weight * matPrice + fixedCost;
  const total = unitPrice * st.quantity;

  const box = document.getElementById('dynamicPriceBox');
  box.innerHTML = `
    <div class="dynamic-price-box">
      <div class="dp-label">预估总价（${st.quantity}件）</div>
      <div class="dp-value">${formatPrice(total)}</div>
    </div>`;
}

function selectColor(el, name) {
  document.querySelectorAll('#colorOptions .color-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  _productDetailState.selectedColor = name;
}

function changeQty(delta) {
  const input = document.getElementById('productQty');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  input.value = val;
  _productDetailState.quantity = val;
  updateDynamicPrice();
}

function syncQty(val) {
  _productDetailState.quantity = Math.max(1, parseInt(val) || 1);
  updateDynamicPrice();
}

async function orderProduct(productId) {
  if (!App.currentUser) {
    toast('请先登录', 'error');
    navigate('/login');
    return;
  }
  const st = _productDetailState;
  const errEl = document.getElementById('productOrderError');
  errEl.textContent = '';
  if (!st.selectedMat) { errEl.textContent = '请选择耗材'; return; }
  if (!st.selectedColor) { errEl.textContent = '请选择颜色'; return; }

  // 计算价格
  const mat = st.materials.find(m => m.name === st.selectedMat);
  const weight = st.product.weight;
  const fixedCost = parseFloat(st.product.fixed_cost);
  const unitPrice = weight * parseFloat(mat.price_per_unit) + fixedCost;
  const total = unitPrice * st.quantity;

  showModal('填写收货信息', `
    <div class="form-group"><label>收货人姓名 *</label><input type="text" id="rcptName" value="${esc(App.currentUser.real_name || '')}"></div>
    <div class="form-group"><label>联系电话 *</label><input type="text" id="rcptPhone" value="${esc(App.currentUser.phone || '')}"></div>
    <div class="form-group"><label>收货地址 *</label><textarea id="rcptAddr" placeholder="请输入详细收货地址"></textarea></div>
    <div class="form-group"><label>备注</label><textarea id="orderRemark" placeholder="特殊要求（选填）"></textarea></div>
    <div style="background:var(--primary-soft);padding:14px;border-radius:var(--radius-sm);font-size:14px">
      <div style="margin-bottom:4px">耗材: ${esc(st.selectedMat)} · 颜色: ${esc(st.selectedColor)} · 数量: ${st.quantity}</div>
      总价: <strong style="color:var(--primary);font-size:20px">${formatPrice(total)}</strong>
    </div>
  `, [
    { label: '确认下单', class: 'btn-primary', onclick: `submitProductOrder(${productId})` },
  ]);
}

async function submitProductOrder(productId) {
  const st = _productDetailState;
  const name = document.getElementById('rcptName').value;
  const phone = document.getElementById('rcptPhone').value;
  const addr = document.getElementById('rcptAddr').value;
  const remark = document.getElementById('orderRemark').value;

  if (!name || !phone || !addr) { toast('收货信息不完整', 'error'); return; }

  try {
    const result = await API.createOrder({
      order_type: 'preset',
      items: [{
        product_id: productId,
        material: st.selectedMat,
        color: st.selectedColor,
        quantity: st.quantity,
      }],
      remark,
      recipient_name: name,
      recipient_phone: phone,
      shipping_address: addr,
    });
    closeModal();
    toast('下单成功！订单号: ' + result.order_no, 'success');
    navigate('/orders');
  } catch (e) {
    toast(e.message, 'error');
  }
}
