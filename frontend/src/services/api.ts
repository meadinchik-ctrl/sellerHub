// Central API client for SELLER HUB

const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('sellerhub_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('sellerhub_token', token);
}

export function removeStoredToken() {
  localStorage.removeItem('sellerhub_token');
}

export function getStoredStoreId(): string | null {
  return localStorage.getItem('sellerhub_active_store_id');
}

export function setStoredStoreId(storeId: string) {
  localStorage.setItem('sellerhub_active_store_id', storeId);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const storeId = getStoredStoreId();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (storeId) {
    headers['X-Store-Id'] = storeId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Automatically send and receive HttpOnly cookies
  });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register') && !endpoint.includes('/auth/me')) {
    removeStoredToken();
    if (window.location.pathname.startsWith('/dashboard')) {
      window.location.href = '/auth';
    }
  }

  if (!response.ok) {
    let errorDetail = 'Произошла ошибка при выполнении запроса';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch (e) {
      // ignore
    }
    throw new Error(errorDetail);
  }

  // Handle empty or blob responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return response as unknown as T;
}

export const api = {
  // Auth
  register: (data: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  telegramLogin: (data: any) => apiRequest('/auth/telegram-login', { method: 'POST', body: JSON.stringify(data) }),
  requestTelegramAuth: () => apiRequest('/auth/telegram/request-auth', { method: 'POST' }),
  checkTelegramAuth: (token: string) => apiRequest(`/auth/telegram/check-auth?token=${token}`),
  getGoogleAuthUrl: () => apiRequest('/auth/google/url'),
  googleLogin: (data: any) => apiRequest('/auth/google-login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (data: any) => apiRequest('/auth/profile', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data: any) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  unlinkProvider: (provider: string) => apiRequest(`/auth/unlink-provider/${provider}`, { method: 'POST' }),
  getTelegramBotLinkToken: () => apiRequest('/auth/telegram-bot-link-token', { method: 'POST' }),
  getTelegramConnectionStatus: () => apiRequest('/auth/telegram-connection-status'),
  logout: () => {
    removeStoredToken();
    return apiRequest('/auth/logout', { method: 'POST' });
  },

  // Stores
  getStores: () => apiRequest('/stores'),
  getStore: (id: string) => apiRequest(`/stores/${id}`),
  createStore: (data: any) => apiRequest('/stores', { method: 'POST', body: JSON.stringify(data) }),
  updateStore: (id: string, data: any) => apiRequest(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStore: (id: string) => apiRequest(`/stores/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return apiRequest(`/products?${q.toString()}`);
  },
  getProduct: (id: string) => apiRequest(`/products/${id}`),
  createProduct: (data: any) => apiRequest('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
  duplicateProduct: (id: string) => apiRequest(`/products/${id}/duplicate`, { method: 'POST' }),
  bulkProductsAction: (data: any) => apiRequest('/products/bulk', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => apiRequest('/categories'),
  createCategory: (data: any) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),

  // Import / Export
  analyzeImportFile: (formData: FormData) => apiRequest('/import-export/analyze', { method: 'POST', body: formData }),
  executeImport: (data: any) => apiRequest('/import-export/execute', { method: 'POST', body: JSON.stringify(data) }),
  getImportHistory: () => apiRequest('/import-export/history'),

  // Analytics
  getAnalyticsOverview: (period: string = '7d') => apiRequest(`/analytics/overview?period=${period}`),

  // CRM
  getCustomers: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return apiRequest(`/crm/customers?${q.toString()}`);
  },
  getCustomer: (id: string) => apiRequest(`/crm/customers/${id}`),
  updateCustomer: (id: string, data: any) => apiRequest(`/crm/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiRequest(`/crm/customers/${id}`, { method: 'DELETE' }),

  // Team
  getTeamMembers: () => apiRequest('/team'),
  inviteTeamMember: (data: any) => apiRequest('/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamRole: (id: string, role: string) => apiRequest(`/team/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeTeamMember: (id: string) => apiRequest(`/team/${id}`, { method: 'DELETE' }),

  // Plans
  getPlans: () => apiRequest('/plans'),
  getCurrentSubscription: () => apiRequest('/plans/current'),
  selectPlan: (name: string) => apiRequest(`/plans/select/${name}`, { method: 'POST' }),

  // Public
  getPublicStore: (slug: string) => apiRequest(`/public/store/${slug}`),
  getPublicCategories: (slug: string) => apiRequest(`/public/store/${slug}/categories`),
  getPublicProducts: (slug: string, params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return apiRequest(`/public/store/${slug}/products?${q.toString()}`);
  },
  getPublicProductDetail: (slug: string, productSlug: string) => apiRequest(`/public/store/${slug}/products/${productSlug}`),
  getPublicPortfolio: (slug: string) => apiRequest(`/public/store/${slug}/portfolio`),
  bookPublicService: (slug: string, data: any) => apiRequest(`/public/store/${slug}/book`, { method: 'POST', body: JSON.stringify(data) }),
  trackPublicEvent: (slug: string, data: any) => apiRequest(`/public/store/${slug}/track`, { method: 'POST', body: JSON.stringify(data) }),

  // Modules: Booking & Portfolio
  getBookingSlots: () => apiRequest('/booking/slots'),
  createBookingSlot: (data: any) => apiRequest('/booking/slots', { method: 'POST', body: JSON.stringify(data) }),
  updateBookingSlot: (id: string, data: any) => apiRequest(`/booking/slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBookingSlot: (id: string) => apiRequest(`/booking/slots/${id}`, { method: 'DELETE' }),

  getPortfolioItems: () => apiRequest('/portfolio'),
  createPortfolioItem: (data: any) => apiRequest('/portfolio', { method: 'POST', body: JSON.stringify(data) }),
  updatePortfolioItem: (id: string, data: any) => apiRequest(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePortfolioItem: (id: string) => apiRequest(`/portfolio/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminStats: () => apiRequest('/admin/stats'),
  getAdminUsers: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return apiRequest(`/admin/users?${q}`);
  },
  toggleAdminUserStatus: (userId: string) => apiRequest(`/admin/users/${userId}/toggle-status`, { method: 'POST' }),
  setAdminUserSubscription: (userId: string, planName: string) => apiRequest(`/admin/users/${userId}/subscription/${planName}`, { method: 'POST' }),
  getAdminStores: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return apiRequest(`/admin/stores?${q}`);
  },
  getAdminConfig: () => apiRequest('/admin/config'),
  updateAdminConfig: (data: any) => apiRequest('/admin/config', { method: 'PUT', body: JSON.stringify(data) }),
  getAdminAuditLogs: () => apiRequest('/admin/audit-logs'),

  // Upload
  uploadImage: async (file: File): Promise<{ url: string; filename: string; size: number; original_size?: number; compression_ratio?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/upload/image', {
      method: 'POST',
      body: formData,
    });
  },
};
