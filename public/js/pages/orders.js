// ===== 我的订单页面 =====
async function renderOrders() {
  const app = document.getElementById('app');
  if (!App.currentUser) {
    toast('请先登录', 'error');
    navigate('/login');
    return;
  }
  app.innerHTML = loadingState('加载订单...');
  await loadOrdersPage(1);
}

async function loadOrdersPage(page) {
  const app = document.getElementById('app');
  try {
    const data = await API.getMyOrders(page, 10);
    const { orders, pagination } = data;
    if (orders.length === 0) {
      app.innerHTML = `
        <div class="container" style="padding-top:40px">
          ${emptyState('📦', '还没有订单，去下单吧！')}
          <div style="text-align:center;margin-bottom:40px">
            <button class="btn btn-primary" onclick="navigate('/')">浏览产品</button>
          </div>
        </div>`;
      return;
    }
    app.innerHTML = `
      <div class="container" style="padding-top:30px;padding-bottom:60px">
        <h1 style="font-size:28px;font-weight:800;margin-bottom:24px">📦 我的订单</h1>
        <div id="orderList">
          ${orders.map(o => `
            <div class="card" style="cursor:pointer" onclick="viewOrderDetail('${esc(o.order_no)}')">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
                <div>
                  <div style="font-weight:700;font-size:16px;margin-bottom:4px">${esc(o.order_no)}</div>
                  <div style="font-size:13px;color:var(--text-light)">
                    ${o.order_type === 'custom' ? '🎨 自定义定制' : '🛒 预置产品'} ·
                    ${new Date(o.created_at).toLocaleString('zh-CN')}
                  </div>
                  <div style="font-size:13px;color:var(--text-light);margin-top:4px">
                    ${esc(o.items_summary || '查看详情')}
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:22px;font-weight:800;color:var(--primary)">${formatPrice(o.total_price)}</div>
                  ${statusTag(o.status)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        ${renderPagination(pagination, 'loadOrdersPage')}
      </div>`;
  } catch (e) {
    app.innerHTML = `<div class="container" style="padding-top:40px">${emptyState('⚠️', e.message)}</div>`;
  }
}

async function viewOrderDetail(orderNo) {
  showModal('订单详情 ' + orderNo, loadingState('加载中...'));
  try {
    const { order, items } = await API.getOrder(orderNo);
    const content = `
      <div class="order-detail-block">
        <h3>订单信息</h3>
        <p><strong>订单号:</strong> ${esc(order.order_no)}</p>
        <p><strong>类型:</strong> ${order.order_type === 'custom' ? '🎨 自定义定制' : '🛒 预置产品'}</p>
        <p><strong>状态:</strong> ${statusTag(order.status)}</p>
        <p><strong>总价:</strong> <span style="color:var(--primary);font-weight:700">${formatPrice(order.total_price)}</span></p>
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
              : `<div style="width:60px;height:60px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:24px">🎨</div>`}
            <div class="item-info">
              <div class="item-name">${esc(item.product_name || item.custom_file_name || '自定义模型')}</div>
              <div class="item-spec">
                材料: ${esc(item.material)} · 颜色: ${esc(item.color)} · 数量: ${item.quantity}
                <br>单价: ${formatPrice(item.unit_price)} · 小计: ${formatPrice(item.subtotal)}
              </div>
              ${item.bambu_link ? `<div style="margin-top:4px"><a href="${esc(item.bambu_link)}" target="_blank" style="font-size:13px">🔗 Bambu 模型链接</a></div>` : ''}
              ${item.custom_file_path ? `<div style="margin-top:4px"><a href="${esc(item.custom_file_path)}" target="_blank" style="font-size:13px">📎 下载模型文件</a></div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    const actions = order.status === 'pending'
      ? [{ label: '取消订单', class: 'btn-danger', onclick: `cancelMyOrder('${esc(orderNo)}')` }]
      : [];
    showModal('订单详情 ' + orderNo, content, actions);
  } catch (e) {
    showModal('订单详情', `<p style="color:var(--danger)">${e.message}</p>`);
  }
}

async function cancelMyOrder(orderNo) {
  try {
    await API.cancelOrder(orderNo);
    toast('订单已取消', 'success');
    closeModal();
    loadOrdersPage(1);
  } catch (e) {
    toast(e.message, 'error');
  }
}
