import { clearSession, getAccessToken, getRefreshToken, setTokens } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type QueryValue = string | number | boolean | null | undefined;

/** Appends non-empty params, e.g. withQuery('/admin/members', { q: 'ravi', page: 2 }). */
export function withQuery(path: string, params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.ok === false) {
    throw new ApiError(res.status, body && body.ok === false ? body.error.message : `Request failed (${res.status})`);
  }
  return body.data;
}

async function send(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(0, 'Cannot reach the RPD server. Check your connection and try again.');
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await send(`${API}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return api<T>(path, init, false);
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return parse<T>(res);
}

let refreshing: Promise<boolean> | null = null;

/** Refresh tokens rotate on use, so parallel 401s must share a single refresh call. */
function refreshTokens() {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await send(`${API}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await parse<{ tokens: { accessToken: string; refreshToken: string } }>(res);
    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function publicPost<T>(path: string, body: unknown) {
  const res = await send(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

export const publicApi = {
  requestOtp(mobile: string) {
    return publicPost<{ challengeId: string; expiresIn: number; resendIn: number }>('/admin/auth/otp/request', {
      mobile,
      channel: 'SMS',
    });
  },
  verifyOtp(mobile: string, code: string) {
    return publicPost<{
      tokens: { accessToken: string; refreshToken: string };
      member: { fullName: string; post: string };
    }>('/admin/auth/otp/verify', { mobile, code });
  },
};
