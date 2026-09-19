import apiClient, { clearApiCache } from './client';

const TOKEN_STORAGE_KEY = 'sentinel_auth_token';
const USER_STORAGE_KEY = 'sentinel_auth_user';

export function getStoredAuthToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredAuthToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {}
}

export function getStoredAuthUser() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredAuthUser(user) {
  try {
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (e) {}
}

export function clearClientAuthState() {
  setStoredAuthToken(null);
  setStoredAuthUser(null);
  clearApiCache();
}

/**
 * Authenticate administrator with server-side secrets.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, authenticated: boolean, user: Object, token: string }>}
 */
export async function login({ email, password }) {
  const result = await apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email || '').trim(),
      password: String(password || '').trim(),
    }),
  });

  if (result?.authenticated && result?.token) {
    setStoredAuthToken(result.token);
    setStoredAuthUser(result.user);
  }
  return result;
}

/**
 * Terminate administrator session on server and clear local state.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await apiClient('/api/v1/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Server logout error (proceeding with local cleanup):', err);
  } finally {
    clearClientAuthState();
  }
}

/**
 * Verify active administrator session against server.
 * @returns {Promise<{ authenticated: boolean, user?: Object }>}
 */
export async function checkSession() {
  try {
    const result = await apiClient('/api/v1/auth/session', {
      method: 'GET',
      forceRefresh: true,
    });
    if (result?.authenticated && result?.user) {
      setStoredAuthUser(result.user);
      return { authenticated: true, user: result.user };
    }
    clearClientAuthState();
    return { authenticated: false, user: null };
  } catch (err) {
    clearClientAuthState();
    return { authenticated: false, user: null };
  }
}
