// ===== UI 工具函数 =====

// Toast 提示
function toast(message, type = 'info') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// 模态框
function showModal(title, contentHtml, actions = []) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-title">${title}</div>
        <div>${contentHtml}</div>
        <div class="modal-actions">
          ${actions.map(a => `<button class="btn ${a.class || 'btn-primary'}" onclick="${a.onclick}">${a.label}</button>`).join('')}
          <button class="btn btn-outline" onclick="closeModal()">关闭</button>
        </div>
      </div>
    </div>`;
}
function closeModal() { document.getElementById('modal').innerHTML = ''; }

// 确认对话框
function confirmDialog(message, onConfirm) {
  showModal('确认操作', `<p>${message}</p>`, [
    { label: '确认', class: 'btn-danger', onclick: `(${onConfirm})(); closeModal();` },
  ]);
}

// 状态文本映射
const STATUS_TEXT = {
  pending: '待确认',
  confirmed: '已确认',
  printing: '打印中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

function statusTag(status) {
  return `<span class="status-tag status-${status}">${STATUS_TEXT[status] || status}</span>`;
}

// 价格格式化
function formatPrice(val) {
  return '¥' + parseFloat(val || 0).toFixed(2);
}

// HTML 转义
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 空状态
function emptyState(icon, message) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
}

// 加载中
function loadingState(message = '加载中...') {
  return `<div class="loading-state"><div class="loading-icon">⏳</div><p>${message}</p></div>`;
}

// 骨架屏（产品列表用）
function skeletonGrid(count = 8) {
  let html = '<div class="skeleton-grid">';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line price" style="margin-bottom:18px"></div>
    </div>`;
  }
  return html + '</div>';
}

// 分页控件
function renderPagination(pg, loadFn) {
  if (!pg || pg.totalPages <= 1) return '';
  const cur = pg.page;
  let pages = [];
  // 显示逻辑：首页 + 当前页前后2页 + 末页
  if (pg.totalPages <= 7) {
    for (let i = 1; i <= pg.totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 4) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(pg.totalPages - 1, cur + 1); i++) pages.push(i);
    if (cur < pg.totalPages - 3) pages.push('...');
    pages.push(pg.totalPages);
  }
  return `
    <div class="pagination">
      ${cur > 1 ? `<button class="pg-btn" onclick="${loadFn}(${cur - 1})">‹ 上一页</button>` : ''}
      ${pages.map(p => p === '...'
        ? `<span class="pg-ellipsis">…</span>`
        : `<button class="pg-btn ${p === cur ? 'active' : ''}" onclick="${loadFn}(${p})">${p}</button>`
      ).join('')}
      ${cur < pg.totalPages ? `<button class="pg-btn" onclick="${loadFn}(${cur + 1})">下一页 ›</button>` : ''}
      <span class="pg-info">共 ${pg.total} 条</span>
    </div>`;
}
