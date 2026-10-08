import { authFetch } from './auth';
import { API_BASE } from '../config';

export async function verifyUser(email) {
  const res = await authFetch(`${API_BASE}/user/verify/${encodeURIComponent(email)}`, {
    method: 'PUT',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to verify user.');
  }

  return data;
}

export async function updateUser(currentEmail, { name, email, mobile, cohort, role }) {
  const res = await authFetch(`${API_BASE}/user/${encodeURIComponent(currentEmail)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, mobile, cohort, role }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update user.');
  }

  return data;
}

export async function deleteUser(email) {
  const res = await authFetch(`${API_BASE}/user/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete user.');
  }

  return data;
}
