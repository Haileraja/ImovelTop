const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Resolve image URLs — relative /uploads/... paths are prefixed with the API base so they load from the backend. */
export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return url;
}

function getToken() {
  return localStorage.getItem('imobiliaria_token');
}
function setToken(token: string | null) {
  if (token) localStorage.setItem('imobiliaria_token', token);
  else localStorage.removeItem('imobiliaria_token');
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json().catch(() => null);
}

export async function loginByRole(role: string) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ role }) });
}

export async function loginWithCredentials(email: string, password: string) {
  return request('/auth/token', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function registerUser(nome: string, email: string, password: string, role: string, phone?: string) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ nome, email, password, role, phone }) });
}

export async function fetchProperties(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const url = `/properties?${params.toString()}`;
  return request(url, { method: 'GET' });
}

export async function fetchPropertiesCount(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return request(`/properties/count?${params.toString()}`, { method: 'GET' });
}

export async function createProperty(data: any) {
  return request('/properties', { method: 'POST', body: JSON.stringify(data) });
}

export async function uploadProperty(formData: FormData) {
  const API = API_BASE + '/properties/upload';
  const token = getToken();
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API, { method: 'POST', body: formData, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json().catch(() => null);
}

export function uploadPropertyWithProgress(formData: FormData, onProgress: (progress: number) => void): Promise<any> {
  const API = API_BASE + '/properties/upload';
  const token = getToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          resolve(null);
        }
      } else {
        reject(new Error(xhr.responseText || xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

export async function requestVisit(propertyId: string, payload: { preferred_date?: string; preferred_time?: string } = {}) {
  return request(`/properties/${propertyId}/visit-requests`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchMyVisitRequests() {
  return request('/my/visit-requests', { method: 'GET' });
}

export async function cancelVisitRequest(id: string) {
  return request(`/my/visit-requests/${id}`, { method: 'DELETE' });
}

export async function updateMyVisitRequest(id: string, payload: { preferred_date?: string; preferred_time?: string }) {
  return request(`/my/visit-requests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function updateProfile(payload: { nome?: string; email?: string; phone?: string }) {
  return request('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function fetchUsers() {
  return request('/users', { method: 'GET' });
}

export async function fetchVisitRequests() {
  return request('/visit-requests', { method: 'GET' });
}

export async function updateVisitRequest(id: string, payload: { status: 'approved' | 'rejected'; admin_note?: string }) {
  return request(`/visit-requests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteProperty(id: string) {
  return request(`/properties/${id}`, { method: 'DELETE' });
}

export async function getCurrentUser() {
  return request('/auth/me', { method: 'GET' });
}

// ---- Favorites ----
export async function fetchMyFavorites() {
  return request('/my/favorites', { method: 'GET' });
}

export async function addFavorite(propertyId: string) {
  return request(`/my/favorites/${propertyId}`, { method: 'POST' });
}

export async function removeFavorite(propertyId: string) {
  return request(`/my/favorites/${propertyId}`, { method: 'DELETE' });
}

// ---- Notifications ----
export async function fetchMyNotifications() {
  return request('/my/notifications', { method: 'GET' });
}

export async function markNotificationRead(id: string) {
  return request(`/my/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return request('/my/notifications/read-all', { method: 'PATCH' });
}

// ---- Chat ----
export async function fetchChatConversations() {
  return request('/chat/conversations', { method: 'GET' });
}

export async function fetchChatMessages(partnerId: string) {
  return request(`/chat/${partnerId}`, { method: 'GET' });
}

export async function sendChatMessage(partnerId: string, message: string, propertyId?: string) {
  return request(`/chat/${partnerId}`, {
    method: 'POST',
    body: JSON.stringify({ receiver_id: partnerId, message, property_id: propertyId }),
  });
}

// ---- Reviews ----
export async function fetchReviews(propertyId: string) {
  return request(`/properties/${propertyId}/reviews`, { method: 'GET' });
}

export async function createReview(propertyId: string, data: { rating: number; comment?: string }) {
  return request(`/properties/${propertyId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---- Password Reset ----
export async function forgotPassword(email: string) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, newPassword: string) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }) });
}

// ---- Email Verification ----
export async function verifyEmail(email: string, code: string) {
  return request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) });
}

export async function resendVerificationCode(email: string) {
  return request('/auth/resend-code', { method: 'POST', body: JSON.stringify({ email }) });
}

// ---- Admin Stats ----
export async function fetchAdminStats() {
  return request('/admin/stats', { method: 'GET' });
}

// ---- Vendor Visit Requests ----
export async function fetchVendorVisitRequests() {
  return request('/vendor/visit-requests', { method: 'GET' });
}

// ---- Vendor manage visits ----
export async function vendorUpdateVisit(id: string, payload: { status: 'approved' | 'rejected' | 'concluded'; admin_note?: string }) {
  return request(`/vendor/visit-requests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// ---- Vendor Stats ----
export async function fetchVendorStats() {
  return request('/vendor/stats', { method: 'GET' });
}

// ---- Admin Report ----
export async function fetchAdminReport() {
  return request('/admin/report', { method: 'GET' });
}

// ---- Change Password ----
export async function changePassword(currentPassword: string, newPassword: string) {
  return request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
}

// ---- Delete Account (RGPD) ----
export async function deleteAccount() {
  return request('/auth/account', { method: 'DELETE' });
}

// ---- Update Property (PUT) ----
export async function updateProperty(id: string, data: Record<string, any>) {
  return request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ---- Restore Property (admin) ----
export async function restoreProperty(id: string) {
  return request(`/properties/${id}/restore`, { method: 'POST' });
}

// ---- Admin User Management ----
export async function adminUpdateUser(userId: string, payload: { role?: string; is_active?: boolean }) {
  return request(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// ---- Admin Deleted Properties ----
export async function fetchDeletedProperties() {
  return request('/admin/deleted-properties', { method: 'GET' });
}

export { getToken, setToken };
export default {
  loginByRole, loginWithCredentials, registerUser, fetchProperties, fetchPropertiesCount,
  createProperty, uploadProperty, uploadPropertyWithProgress, deleteProperty,
  updateProperty, restoreProperty,
  getCurrentUser, getToken, setToken, requestVisit, fetchVisitRequests,
  fetchMyVisitRequests, cancelVisitRequest, updateMyVisitRequest,
  fetchUsers, updateVisitRequest, updateProfile,
  fetchMyFavorites, addFavorite, removeFavorite,
  fetchMyNotifications, markNotificationRead, markAllNotificationsRead,
  fetchChatConversations, fetchChatMessages, sendChatMessage,
  fetchReviews, createReview,
  forgotPassword, resetPassword,
  verifyEmail, resendVerificationCode,
  fetchAdminStats, fetchVendorVisitRequests, vendorUpdateVisit, fetchVendorStats,
  fetchAdminReport,
  changePassword, deleteAccount,
  adminUpdateUser, fetchDeletedProperties,
};