import User from '../model/User.js';
import Storage from '../util/Storage.js';

/**
 * Handles login/registration against the real server (/user/login,
 * /user/register) and keeps the logged-in user + JWT in localStorage.
 */
export default class AuthController {
  constructor(apiClient) {
    this.api = apiClient;
    const storedUser = Storage.getUser();
    this.currentUser = storedUser ? new User(storedUser) : null;
  }

  get isAuthenticated() {
    return Boolean(Storage.getToken() && this.currentUser);
  }

  async login(contact, password) {
    let data = { password }
    // Check if the contact is an email
    if (/@/.test(contact)) {
      data.email = contact.trim()
    }
    else {
      data.mobile = parseInt(contact)
    }
    const response = await this.api.post('/user/login', data);
    const user = new User({ user_id: response.user_id, name: response.name, email: response.email, role: response.role, cohort: response.cohort });
    Storage.setToken(response.token);
    Storage.setUser(user);
    this.currentUser = user;
    return user;
  }

  async register({ name, email, mobile, password, cohort, role, auth }) {
    return this.api.post('/user/register', { name, email, mobile, password, cohort, role }, { auth });
  }

  logout() {
    Storage.clearToken();
    Storage.clearUser();
    this.currentUser = null;
  }
}
