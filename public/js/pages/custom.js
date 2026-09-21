// ===== 定制打印页面 =====
let _customState = {};

async function renderCustom() {
  const app = document.getElementById('app');
  app.innerHTML = loadingState('加载中...');

  try {
    const { materials } = await API.getMaterials();
    const { colors } = await API.getColors();
    _customState = {
      materials, colors,
      selectedMat: null, selectedColor: null, quantity: 1,
      uploadedFile: null, bambuLink: '', sourceType: 'upload',
    };

    app.innerHTML = `
      <div class="container" style="padding-top:40px;padding-bottom:80px">
        <h1 style="font-size:36px;font-weight:800;margin-bottom:8px">🚀 定制打印</h1>
        <p style="color:var(--text-light);font-size:16px;margin-bottom:36px">上传你的3D模型或填写 Bambu 官方模型链接，选择耗材和颜色，我们为你打印</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
          <!-- 左侧: 模型来源 -->
          <div>
            <div class="tabs" id="sourceTabs">
              <button class="tab active" onclick="switchSource('upload')">📁 上传模型文件</button>
              <button class="tab" onclick="switchSource('bambu')">🔗 Bambu 官方模型</button>
            </div>

            <div id="uploadPanel" class="card">
              <div class="upload-zone" id="uploadZone" onclick="document.getElementById('modelFile').click()">
                <div class="upload-icon">📁</div>
                <div style="font-weight:600;margin-bottom:4px;font-size:16px">点击或拖拽文件到此处</div>
                <div class="upload-hint">支持 STL / OBJ / 3MF / PLY / GCODE，最大 100MB</div>
              </div>
              <input type="file" id="modelFile" style="display:none"
                     accept=".stl,.obj,.3mf,.ply,.gcode"
                     onchange="handleFileUpload(this)">
              <div id="uploadResult" style="margin-top:16px"></div>
            </div>

            <div id="bambuPanel" class="card" style="display:none">
              <div class="bambu-input-wrap">
                <div class="bambu-icon">🔗</div>
                <div class="form-group">
                  <label>Bambu 模型分享链接</label>
                  <input type="text" id="bambuLinkInput" placeholder="粘贴 makerworld.com 或 bambu 官方模型分享链接"
                         oninput="_customState.bambuLink=this.value" style="font-size:14px">
                  <div class="form-hint">例如: https://makerworld.com/zh/models/xxxxx</div>
                </div>
                <div class="bambu-tip">
                  💡 <strong>如何获取链接：</strong>在 Bambu MakerWorld 或 Bambu Studio 中找到模型，点击「分享」按钮，复制链接粘贴到上方输入框即可。
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧: 耗材 + 颜色 + 数量 -->
          <div>
            <div class="card">
              <h3 style="margin-bottom:16px"><span class="step-num">2</span>选择耗材</h3>
              <div class="mat-compact-list" id="customMatList">
                ${materials.map(m => `
                  <div class="mat-compact-btn" data-mat="${esc(m.name)}" onclick="selectCustomMat('${esc(m.name)}')">
                    ${esc(m.name)}
                    <span class="mat-tag-price">¥${parseFloat(m.price_per_unit).toFixed(2)}/g</span>
                  </div>
                `).join('')}
              </div>
              <div id="customMatDetail"></div>
            </div>

            <div class="card">
              <h3 style="margin-bottom:16px"><span class="step-num">3</span>选择颜色</h3>
              <div class="color-options" id="customColorOptions">
                ${colors.map(c => `
                  <div class="color-option" onclick="selectCustomColor(this,'${esc(c.name)}')">
                    <span class="color-swatch" style="background:${esc(c.hex_code)}"></span>
                    ${esc(c.name)}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card">
              <h3 style="margin-bottom:16px"><span class="step-num">4</span>数量</h3>
              <div style="display:flex;align-items:center;gap:12px">
                <button class="btn btn-outline btn-sm" onclick="changeCustomQty(-1)">−</button>
                <input type="number" id="customQty" value="1" min="1" style="width:80px;text-align:center;padding:8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:16px"
                       onchange="syncCustomQty(this.value)">
                <button class="btn btn-outline btn-sm" onclick="changeCustomQty(1)">+</button>
              </div>
              <div id="customDynamicPrice" style="margin-top:14px"></div>
              <p style="font-size:13px;color:var(--text-light);margin-top:12px;line-height:1.6">
                💡 最终价格以实际打印重量为准。
              </p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:32px">
          <h3 style="margin-bottom:16px"><span class="step-num">5</span>收货信息</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group"><label>收货人姓名 *</label><input type="text" id="customRcptName" value="${esc(App.currentUser?.real_name || '')}"></div>
            <div class="form-group"><label>联系电话 *</label><input type="text" id="customRcptPhone" value="${esc(App.currentUser?.phone || '')}"></div>
          </div>
          <div class="form-group"><label>收货地址 *</label><textarea id="customRcptAddr" placeholder="请输入详细收货地址"></textarea></div>
          <div class="form-group"><label>备注 / 特殊要求</label><textarea id="customRemark" placeholder="如尺寸要求、后处理需求、填充密度等"></textarea></div>

          <div id="customOrderError" class="form-error"></div>
          <button class="btn btn-primary btn-lg btn-block" style="margin-top:8px" onclick="submitCustomOrder()">
            🚀 提交定制订单
          </button>
        </div>
      </div>
    `;

    // 拖拽上传
    const zone = document.getElementById('uploadZone');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      document.getElementById('modelFile').files = e.dataTransfer.files;
      handleFileUpload(document.getElementById('modelFile'));
    });

  } catch (e) {
    app.innerHTML = `<div class="container" style="padding-top:40px">${emptyState('⚠️', e.message)}</div>`;
  }
}

// 切换模型来源
function switchSource(type) {
  _customState.sourceType = type;
  document.querySelectorAll('#sourceTabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#sourceTabs .tab')[type === 'upload' ? 0 : 1].classList.add('active');
  document.getElementById('uploadPanel').style.display = type === 'upload' ? '' : 'none';
  document.getElementById('bambuPanel').style.display = type === 'bambu' ? '' : 'none';
}

async function handleFileUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const resultDiv = document.getElementById('uploadResult');
  resultDiv.innerHTML = '<p style="color:var(--text-light)">⏳ 上传中...</p>';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await API.uploadModel(formData);
    if (res.error) throw new Error(res.error);
    _customState.uploadedFile = { path: res.file_path, name: res.file_name, size: res.file_size };
    resultDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;background:var(--success-soft);padding:14px 18px;border-radius:var(--radius-sm);border:1px solid #A7F3D0">
        <span style="font-size:28px">✅</span>
        <div>
          <div style="font-weight:600">${esc(res.file_name)}</div>
          <div style="font-size:13px;color:var(--text-light)">${(res.file_size / 1024 / 1024).toFixed(2)} MB · 已上传</div>
        </div>
      </div>`;
    toast('文件上传成功', 'success');
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--danger)">❌ ${e.message}</div>`;
  }
}

// 紧凑耗材选择 + 展开优缺点
function selectCustomMat(matName) {
  _customState.selectedMat = matName;
  document.querySelectorAll('#customMatList .mat-compact-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`#customMatList .mat-compact-btn[data-mat="${matName}"]`);
    if (btn) btn.classList.add('active');

  const mat = _customState.materials.find(m => m.name === matName);
  if (!mat) return;
  const prosList = (mat.pros || '').split('|').filter(Boolean);
  const consList = (mat.cons || '').split('|').filter(Boolean);

  document.getElementById('customMatDetail').innerHTML = `
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

  updateCustomPrice();
}

function updateCustomPrice() {
  const st = _customState;
  if (!st.selectedMat) return;
  const mat = st.materials.find(m => m.name === st.selectedMat);
  if (!mat) return;

  const weight = 50; // 自定义模型估算50g
  const fixedCost = 25;
  const unitPrice = weight * parseFloat(mat.price_per_unit) + fixedCost;
  const total = unitPrice * st.quantity;

  document.getElementById('customDynamicPrice').innerHTML = `
    <div class="dynamic-price-box">
      <div class="dp-label">预估总价（${st.quantity}件）</div>
      <div class="dp-value">${formatPrice(total)}</div>
    </div>`;
}

function selectCustomColor(el, name) {
  document.querySelectorAll('#customColorOptions .color-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  _customState.selectedColor = name;
}

function changeCustomQty(delta) {
  const input = document.getElementById('customQty');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  input.value = val;
  _customState.quantity = val;
  updateCustomPrice();
}

function syncCustomQty(val) {
  _customState.quantity = Math.max(1, parseInt(val) || 1);
  updateCustomPrice();
}

async function submitCustomOrder() {
  if (!App.currentUser) {
    toast('请先登录', 'error');
    navigate('/login');
    return;
  }
  const errEl = document.getElementById('customOrderError');
  errEl.textContent = '';

  if (_customState.sourceType === 'upload') {
    if (!_customState.uploadedFile) { errEl.textContent = '请先上传模型文件'; return; }
  } else {
    const link = document.getElementById('bambuLinkInput').value.trim();
    if (!link) { errEl.textContent = '请填写 Bambu 模型分享链接'; return; }
    if (!/^https?:\/\/.+/.test(link)) { errEl.textContent = '请输入有效的链接地址（以 http 开头）'; return; }
    _customState.bambuLink = link;
  }

  if (!_customState.selectedMat) { errEl.textContent = '请选择耗材'; return; }
  if (!_customState.selectedColor) { errEl.textContent = '请选择颜色'; return; }

  const name = document.getElementById('customRcptName').value;
  const phone = document.getElementById('customRcptPhone').value;
  const addr = document.getElementById('customRcptAddr').value;
  const remark = document.getElementById('customRemark').value;

  if (!name || !phone || !addr) { errEl.textContent = '收货信息不完整'; return; }

  const mat = _customState.materials.find(m => m.name === _customState.selectedMat);
  const weight = 50;
  const unitPrice = weight * parseFloat(mat.price_per_unit) + 25;
  const total = unitPrice * _customState.quantity;

  const sourceLabel = _customState.sourceType === 'upload'
    ? `模型文件: ${esc(_customState.uploadedFile.name)}`
    : `Bambu 链接: ${esc(_customState.bambuLink)}`;

  showModal('确认订单', `
    <div style="margin-bottom:16px;line-height:2">
      <div><strong>${sourceLabel}</div>
      <div><strong>耗材:</strong> ${esc(_customState.selectedMat)}</div>
      <div><strong>颜色:</strong> ${esc(_customState.selectedColor)}</div>
      <div><strong>数量:</strong> ${_customState.quantity}</div>
      <div><strong>收货人:</strong> ${esc(name)} / ${esc(phone)}</div>
      <div><strong>地址:</strong> ${esc(addr)}</div>
    </div>
    <div style="background:var(--primary-soft);padding:14px;border-radius:var(--radius-sm);font-size:14px">
      预估总价: <strong style="color:var(--primary);font-size:20px">${formatPrice(total)}</strong>
    </div>
  `, [
    { label: '确认下单', class: 'btn-primary', onclick: 'doSubmitCustomOrder()' },
  ]);

  _customState.formData = { name, phone, addr, remark };
}

async function doSubmitCustomOrder() {
  const { name, phone, addr, remark } = _customState.formData;
  const item = {
    material: _customState.selectedMat,
    color: _customState.selectedColor,
    quantity: _customState.quantity,
  };

  if (_customState.sourceType === 'upload') {
    item.custom_file_path = _customState.uploadedFile.path;
    item.custom_file_name = _customState.uploadedFile.name;
  } else {
    item.bambu_link = _customState.bambuLink;
    item.custom_file_name = 'Bambu官方模型';
  }

  try {
    const result = await API.createOrder({
      order_type: 'custom',
      items: [item],
      remark,
      recipient_name: name,
      recipient_phone: phone,
      shipping_address: addr,
    });
    closeModal();
    toast('定制订单提交成功！订单号: ' + result.order_no, 'success');
    navigate('/orders');
  } catch (e) {
    toast(e.message, 'error');
  }
}
