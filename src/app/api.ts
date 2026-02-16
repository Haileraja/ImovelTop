const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export async function registerUser(nome: string, email: string, password: string, role: string) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ nome, email, password, role }) });
}

export async function fetchProperties(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const url = `/properties?${params.toString()}`;
  return request(url, { method: 'GET' });
}

export async function createProperty(data: any) {
  return request('/properties', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteProperty(id: string) {
  return request(`/properties/${id}`, { method: 'DELETE' });
}

export async function getCurrentUser() {
  return request('/auth/me', { method: 'GET' });
}

export { getToken, setToken };
export default { loginByRole, loginWithCredentials, registerUser, fetchProperties, createProperty, deleteProperty, getCurrentUser, getToken, setToken };