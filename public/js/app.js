// ===== 主应用: 路由 + 导航 =====
const App = {
  currentUser: null,
};

// 更新导航栏
function updateNav() {
  const authEl = document.getElementById('navAuth');
  const ordersLink = document.getElementById('navOrders');
  const adminLink = document.getElementById('navAdmin');
  const msgLink = document.getElementById('navMessages');

  if (App.currentUser) {
    ordersLink.style.display = '';
    msgLink.style.display = '';
    authEl.innerHTML = `
      <span class="nav-user">
        <span>👤 ${esc(App.currentUser.username)}</span>
        ${App.currentUser.role === 'admin' ? '<span class="badge">管理员</span>' : ''}
        <button class="btn btn-outline btn-sm" onclick="handleLogout()">退出</button>
      </span>`;
    if (App.currentUser.role === 'admin') {
      adminLink.style.display = '';
    } else {
      adminLink.style.display = 'none';
    }
    // 轮询未读消息
    if (!App._msgInterval) {
      updateUnreadBadge();
      App._msgInterval = setInterval(updateUnreadBadge, 30000);
    }
  } else {
    ordersLink.style.display = 'none';
    adminLink.style.display = 'none';
    msgLink.style.display = 'none';
    if (App._msgInterval) {
      clearInterval(App._msgInterval);
      App._msgInterval = null;
    }
    authEl.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="navigate('/login')">登录</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('/register')">注册</button>`;
  }
}

async function handleLogout() {
  try {
    await API.logout();
    App.currentUser = null;
    updateNav();
    toast('已退出登录', 'info');
    navigate('/');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// 路由导航
function navigate(path, scrollTarget) {
  history.pushState(null, '', path);
  route(path, scrollTarget);
}

window.addEventListener('popstate', () => route(location.pathname));

async function route(path, scrollTarget) {
  window.scrollTo(0, 0);
  const app = document.getElementById('app');

  // 路由匹配
  if (path === '/' || path === '') {
    await renderHome(scrollTarget);
  } else if (path === '/login') {
    renderLogin();
  } else if (path === '/register') {
    renderRegister();
  } else if (path === '/custom') {
    await renderCustom();
  } else if (path === '/orders') {
    await renderOrders();
  } else if (path === '/messages') {
    await renderMessages();
  } else if (path.startsWith('/product/')) {
    const id = path.split('/')[2];
    await renderProductDetail(id);
  } else if (path === '/admin' || path.startsWith('/admin/')) {
    const section = path.startsWith('/admin/') ? path.split('/')[2] : 'dashboard';
    await renderAdmin(section);
  } else {
    app.innerHTML = emptyState('🤷', '页面不存在');
  }
}

// 初始化
async function init() {
  try {
    const { user } = await API.me();
    App.currentUser = user;
  } catch (e) {
    App.currentUser = null;
  }
  updateNav();
  route(location.pathname + location.hash.replace('#', ''));
}

document.addEventListener('DOMContentLoaded', init);
