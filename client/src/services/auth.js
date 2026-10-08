import { API_BASE } from '../config';

const TOKEN_KEY = 'qilsrp.token';
const USER_KEY  = 'qilsrp.user';

// Login attempt throttling
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;

function attemptsKey(email) {
  return `qilsrp.loginAttempts.${email.trim().toLowerCase()}`;
}

function recordFailedLogin(email) {
  const key = attemptsKey(email);
  const existing = JSON.parse(sessionStorage.getItem(key) || '{"count":0}');
  const count = existing.count + 1;
  sessionStorage.setItem(key, JSON.stringify({
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null,
  }));
}

function clearLoginAttempts(email) {
  sessionStorage.removeItem(attemptsKey(email));
}

export function getLoginLockStatus(email) {
  if (!email) return { locked: false };
  const existing = JSON.parse(sessionStorage.getItem(attemptsKey(email)) || '{}');
  if (!existing.lockedUntil) return { locked: false };

  const remainingMs = existing.lockedUntil - Date.now();
  if (remainingMs <= 0) {
    clearLoginAttempts(email);
    return { locked: false };
  }
  return { locked: true, remainingMs };
}

// JWTs are base64url, not plain base64 (-/_ instead of +//)
function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return JSON.parse(atob(padded));
}

function isTokenExpired(token) {
  try {
    const payload = decodeJwtPayload(token);
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

// POST /user/login
export async function login(email, password) {
  const lockStatus = getLoginLockStatus(email);
  if (lockStatus.locked) {
    const seconds = Math.ceil(lockStatus.remainingMs / 1000);
    throw new Error(`Too many failed attempts. Try again in ${seconds}s.`);
  }

  const res = await fetch(`${API_BASE}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    recordFailedLogin(email);
    throw new Error(data.message || 'Incorrect Email or Password.');
  }

  clearLoginAttempts(email);

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    user_id: data.user_id,
    name:    data.name,
    email:   data.email,
    role:    data.role,
    cohort:  data.cohort,
  }));

  return data;
}

// POST /user/register
export async function register({ name, email, mobile, password, cohort, role }) {
  const res = await fetch(`${API_BASE}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, mobile, password, cohort, role }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Registration failed. Please try again.');
  }

  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// fetch() wrapper that attaches the auth token and clears the session on a 401
export async function authFetch(url, options = {}) {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    logout();
    throw new Error('You must be signed in to do that.');
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    logout();
  }

  return res;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) return false;
  if (isTokenExpired(token)) {
    logout();
    return false;
  }
  return true;
}

export function isAdmin() {
  return getUser()?.role === 'admin';
}
