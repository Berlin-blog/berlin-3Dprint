// ===== 登录/注册页面 =====
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container" style="max-width:440px;margin-top:60px">
      <div class="card">
        <h2 style="text-align:center;margin-bottom:24px">用户登录</h2>
        <form id="loginForm" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="loginUsername" required placeholder="请输入用户名">
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="loginPassword" required placeholder="请输入密码">
          </div>
          <div id="loginError" class="form-error"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">登录</button>
        </form>
        <p style="text-align:center;margin-top:16px;color:var(--text-light)">
          还没有账号？<a href="#" onclick="navigate('/register');return false;">立即注册</a>
        </p>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const { user } = await API.login({ username, password });
    toast('登录成功，欢迎回来！', 'success');
    App.currentUser = user;
    updateNav();
    navigate('/');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function renderRegister() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container" style="max-width:440px;margin-top:40px">
      <div class="card">
        <h2 style="text-align:center;margin-bottom:24px">用户注册</h2>
        <form id="registerForm" onsubmit="handleRegister(event)">
          <div class="form-group"><label>用户名 *</label><input type="text" id="regUsername" required placeholder="设置登录用户名"></div>
          <div class="form-group"><label>密码 *</label><input type="password" id="regPassword" required placeholder="设置密码"></div>
          <div class="form-group"><label>真实姓名</label><input type="text" id="regRealName" placeholder="选填"></div>
          <div class="form-group"><label>手机号</label><input type="text" id="regPhone" placeholder="选填"></div>
          <div class="form-group"><label>邮箱</label><input type="email" id="regEmail" placeholder="选填"></div>
          <div id="regError" class="form-error"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">注册</button>
        </form>
        <p style="text-align:center;margin-top:16px;color:var(--text-light)">
          已有账号？<a href="#" onclick="navigate('/login');return false;">去登录</a>
        </p>
      </div>
    </div>
  `;
}

async function handleRegister(e) {
  e.preventDefault();
  const body = {
    username: document.getElementById('regUsername').value,
    password: document.getElementById('regPassword').value,
    real_name: document.getElementById('regRealName').value,
    phone: document.getElementById('regPhone').value,
    email: document.getElementById('regEmail').value,
  };
  const errEl = document.getElementById('regError');
  errEl.textContent = '';
  try {
    await API.register(body);
    toast('注册成功，请登录', 'success');
    navigate('/login');
  } catch (err) {
    errEl.textContent = err.message;
  }
}
