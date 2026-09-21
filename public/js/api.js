// ===== API 请求封装 =====
const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'same-origin',
      ...options,
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || `请求失败 (${res.status})`);
    }
    return data;
  },

  // 认证
  register: (body) => API.request('/api/auth/register', { method: 'POST', body }),
  login: (body) => API.request('/api/auth/login', { method: 'POST', body }),
  logout: () => API.request('/api/auth/logout', { method: 'POST' }),
  me: () => API.request('/api/auth/me'),
  updateProfile: (body) => API.request('/api/auth/profile', { method: 'PUT', body }),

  // 产品
  getProducts: (params = '') => API.request('/api/products' + (params ? '?' + params : '')),
  getProduct: (id) => API.request('/api/products/' + id),
  getCategories: () => API.request('/api/products/meta/categories'),

  // 材料颜色
  getMaterials: () => API.request('/api/materials'),
  getColors: () => API.request('/api/materials/colors'),

  // 管理员：耗材 CRUD
  createMaterial: (body) => API.request('/api/materials', { method: 'POST', body }),
  updateMaterial: (id, body) => API.request('/api/materials/' + id, { method: 'PUT', body }),
  deleteMaterial: (id) => API.request('/api/materials/' + id, { method: 'DELETE' }),

  // 管理员：颜色 CRUD
  createColor: (body) => API.request('/api/materials/colors', { method: 'POST', body }),
  updateColor: (id, body) => API.request('/api/materials/colors/' + id, { method: 'PUT', body }),
  deleteColor: (id) => API.request('/api/materials/colors/' + id, { method: 'DELETE' }),

  // 订单
  createOrder: (body) => API.request('/api/orders', { method: 'POST', body }),
  getMyOrders: (page = 1, pageSize = 10) => API.request('/api/orders/my?page=' + page + '&pageSize=' + pageSize),
  getOrder: (orderNo) => API.request('/api/orders/' + orderNo),
  cancelOrder: (orderNo) => API.request('/api/orders/' + orderNo + '/cancel', { method: 'PUT' }),

  // 站内消息
  getMessages: (page = 1) => API.request('/api/messages?page=' + page),
  getUnreadCount: () => API.request('/api/messages/unread/count'),
  markMessageRead: (id) => API.request('/api/messages/' + id + '/read', { method: 'PUT' }),
  markAllRead: () => API.request('/api/messages/read-all', { method: 'PUT' }),

  // 上传
  uploadModel: (formData) => fetch('/api/upload/model', { method: 'POST', body: formData, credentials: 'same-origin' }).then(r => r.json()),
  uploadImage: (formData) => fetch('/api/upload/image', { method: 'POST', body: formData, credentials: 'same-origin' }).then(r => r.json()),

  // 管理后台
  adminDashboard: () => API.request('/api/admin/dashboard'),
  adminGetOrders: (status = 'all', page = 1, pageSize = 15) => API.request('/api/admin/orders' + (status !== 'all' ? '?status=' + status + '&page=' + page : '?page=' + page) + '&pageSize=' + pageSize),
  adminGetOrder: (orderNo) => API.request('/api/admin/orders/' + orderNo),
  adminUpdateOrderStatus: (orderNo, status) => API.request('/api/admin/orders/' + orderNo + '/status', { method: 'PUT', body: { status } }),
  adminGetProducts: () => API.request('/api/admin/products'),
  adminCreateProduct: (body) => API.request('/api/products', { method: 'POST', body }),
  adminUpdateProduct: (id, body) => API.request('/api/products/' + id, { method: 'PUT', body }),
  adminDeleteProduct: (id) => API.request('/api/products/' + id, { method: 'DELETE' }),
  adminGetMaterials: () => API.request('/api/admin/materials'),
  adminGetUsers: () => API.request('/api/admin/users'),
};
