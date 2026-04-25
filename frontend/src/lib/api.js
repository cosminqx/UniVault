export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

const BASE_NO_TRAILING_SLASH = API_BASE.replace(/\/$/, '');

export function getUploadUrl(filePath) {
  const normalizedPath = String(filePath || '').replace(/^\/+/, '');
  const uploadsBase = BASE_NO_TRAILING_SLASH.endsWith('/api')
    ? BASE_NO_TRAILING_SLASH.slice(0, -4)
    : BASE_NO_TRAILING_SLASH;

  if (!uploadsBase) {
    return `/uploads/${normalizedPath}`;
  }

  return `${uploadsBase}/uploads/${normalizedPath}`;
}

export async function api(path, { method = 'GET', token, body, isForm = false } = {}) {
  const headers = {};
  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}
