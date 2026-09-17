const ACCESS = 'rpd_admin_access';
const REFRESH = 'rpd_admin_refresh';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS, accessToken);
  localStorage.setItem(REFRESH, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function isSignedIn() {
  return Boolean(getAccessToken());
}
