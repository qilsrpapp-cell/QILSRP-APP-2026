const TOKEN_KEY = 'qilsrp.token';
const USER_KEY = 'qilsrp.user';

/**
 * Thin wrapper around localStorage used for session data (auth token,
 * logged-in user) and for the local feature repositories.
 */
export default class Storage {
  static getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  static setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  static getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  static clearUser() {
    localStorage.removeItem(USER_KEY);
  }

  static getCollection(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }

  static setCollection(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
