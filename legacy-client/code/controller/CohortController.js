import Cohort from '../model/Cohort.js';

/**
 * Cohort management
 */
export default class UserController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async post(name) {
    return this.api.post('/cohort/', { name }, { auth: true });
  }

  async list(auth) {
    const rows = await this.api.get('/cohort/', { auth });
    return rows.map(row => new Cohort(row));
  }

  async remove(name) {
    return this.api.delete(`/cohort/${encodeURIComponent(name)}`, {}, { auth: true });
  }

  async listForUser(user) {
    if (!user.isAdmin) {
      return [{ name: user.cohort }];
    }

    const all = await this.list();
    return all;
  }
}
