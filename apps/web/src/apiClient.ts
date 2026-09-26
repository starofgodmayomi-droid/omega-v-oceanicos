const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const READ_TOKEN = import.meta.env.VITE_API_READ_TOKEN?.trim();
const ADMIN_TOKEN = import.meta.env.VITE_API_ADMIN_TOKEN?.trim();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const method = (init.method ?? 'GET').toUpperCase();
  const token = method === 'GET' ? READ_TOKEN : ADMIN_TOKEN;
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new ApiRequestError('API is unreachable; verify the API URL and service health.', 0, 'API_UNREACHABLE');
  }

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError(`API returned invalid JSON (${response.status}).`, response.status, 'INVALID_JSON');
  }
  if (!response.ok) {
    throw new ApiRequestError(payload?.error || payload?.message || `API request failed (${response.status}).`, response.status, payload?.error);
  }
  return payload as T;
}
