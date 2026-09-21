// ===== 站内消息页面 =====
let _msgCurrentPage = 1;

async function renderMessages() {
  const app = document.getElementById('app');
  if (!App.currentUser) {
    toast('请先登录', 'error');
    navigate('/login');
    return;
  }
  app.innerHTML = loadingState('加载消息...');
  await loadMessages(1);
}

async function loadMessages(page) {
  _msgCurrentPage = page;
  const app = document.getElementById('app');
  try {
    const data = await API.getMessages(page);
    const { messages, pagination } = data;

    if (messages.length === 0) {
      app.innerHTML = `
        <div class="container" style="padding-top:40px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h1 style="font-size:28px;font-weight:800">📬 站内消息</h1>
          </div>
          ${emptyState('📭', '暂无消息')}
        </div>`;
      return;
    }

    app.innerHTML = `
      <div class="container" style="padding-top:30px;padding-bottom:60px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          <h1 style="font-size:28px;font-weight:800">📬 站内消息</h1>
          <button class="btn btn-outline btn-sm" onclick="markAllMessagesRead()">全部标记已读</button>
        </div>
        <div id="msgList">
          ${messages.map(m => `
            <div class="card ${m.is_read ? '' : 'card-unread'}" style="cursor:pointer;border-left:${m.is_read ? 'none' : '4px solid var(--primary)'}" onclick="viewMessage(${m.id})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                <div style="flex:1">
                  <div style="font-weight:${m.is_read ? '600' : '700'};font-size:16px;margin-bottom:4px">
                    ${m.is_read ? '' : '<span style="color:var(--primary);font-size:10px">●</span> '}${esc(m.title)}
                  </div>
                  <div style="font-size:14px;color:var(--text-light);line-height:1.6">${esc(m.content)}</div>
                  ${m.order_no ? `<div style="margin-top:6px"><a href="#" onclick="navigate('/orders');return false;" style="font-size:13px">订单: ${esc(m.order_no)}</a></div>` : ''}
                </div>
                <div style="font-size:12px;color:var(--text-lighter);white-space:nowrap">
                  ${new Date(m.created_at).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        ${renderPagination(pagination, 'loadMessages')}
      </div>`;
    updateUnreadBadge();
  } catch (e) {
    app.innerHTML = `<div class="container" style="padding-top:40px">${emptyState('⚠️', e.message)}</div>`;
  }
}

async function viewMessage(id) {
  try {
    await API.markMessageRead(id);
    loadMessages(_msgCurrentPage);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function markAllMessagesRead() {
  try {
    await API.markAllRead();
    toast('已全部标记已读', 'success');
    loadMessages(_msgCurrentPage);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// 未读消息徽章
async function updateUnreadBadge() {
  if (!App.currentUser) return;
  try {
    const { unread } = await API.getUnreadCount();
    const badge = document.getElementById('unreadBadge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) { /* ignore */ }
}
