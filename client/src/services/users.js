import { authFetch } from "./auth";
import { API_BASE } from '../config';

export async function getUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await authFetch(`${API_BASE}/user/${query}`);
    const data = await res.json().catch(() => ([]));

    if (!res.ok)
        throw new Error(data.message || 'Failed to load users.');

    return data;
}
