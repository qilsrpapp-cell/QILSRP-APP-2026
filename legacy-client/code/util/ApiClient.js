import Storage from './Storage.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Wraps fetch() for talking to the Express/knex server: attaches JSON
 * headers, optionally attaches the bearer token, and normalises error
 * responses into ApiError so callers can branch on e.status.
 */
export default class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = Storage.getToken();
      if (!token) throw new ApiError('Not authenticated', 401);
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(data?.message || response.statusText, response.status);
    }

    return data;
  }

  get(path, options) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  put(path, body, options) {
    return this.request(path, { ...options, method: 'PUT', body });
  }

  delete(path, body, options) {
    return this.request(path, { ...options, method: 'DELETE', body });
  }
}
