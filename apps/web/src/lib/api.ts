const API_URL = '/api';
const TOKEN_KEY = 'gmt_access_token';

export class ApiError extends Error {
  constructor(public message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function authHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return headers;
}

function parseBody(raw: string, contentType: string): unknown {
  if (!raw) return null;
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

async function request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  const headers = authHeaders(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const method = String(init.method || 'GET').toUpperCase();

  if (response.ok && raw.length === 0 && method === 'GET' && attempt < 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return request<T>(path, init, attempt + 1);
  }

  const body = parseBody(raw, contentType);
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'message' in body
      ? (Array.isArray((body as any).message) ? (body as any).message.join(', ') : String((body as any).message))
      : (typeof body === 'string' && body.trim() ? body : `Request gagal (${response.status})`);
    throw new ApiError(message, response.status, body);
  }

  if (raw.length === 0 && method === 'GET') {
    throw new ApiError('API mengembalikan respons kosong. Silakan refresh halaman.', response.status, null);
  }

  return body as T;
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, 0);
}

export async function upload<T = any>(path: string, form: FormData): Promise<T> {
  return api<T>(path, { method: 'POST', body: form });
}

export async function openProtectedHtml(path: string) {
  const win = window.open('', '_blank');
  if (!win) throw new Error('Browser memblokir jendela preview. Izinkan pop-up untuk aplikasi ini.');
  win.document.write('<p style="font-family:sans-serif;padding:24px">Memuat preview...</p>');
  try {
    const response = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: 'no-store' });
    if (!response.ok) throw new Error(`Preview gagal (${response.status})`);
    const html = await response.text();
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (error) {
    win.document.body.innerHTML = `<p style="font-family:sans-serif;padding:24px;color:#b91c1c">${String(error)}</p>`;
  }
}

export async function downloadProtected(path: string, filename?: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Download gagal (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
