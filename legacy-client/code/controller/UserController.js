import User from '../model/User.js';

/**
 * Admin-facing user management, backed by the real /user endpoints.
 */
export default class UserController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list(name, email, mobile, status, cohort, role) {
    let searchParams = ''
    let operator = "?";

    if (name) {
      searchParams += `${operator}name=${name}`
      operator = "&"
    }
    if (email) {
      searchParams += `${operator}email=${email}`
      operator = "&"
    }
    if (mobile) {
      searchParams += `${operator}mobile=${mobile}`
      operator = "&"
    }
    if (status) {
      searchParams += `${operator}status=${status}`
      operator = "&"
    }
    if (cohort) {
      searchParams += `${operator}cohort=${cohort}`
      operator = "&"
    }
    if (role) {
      searchParams += `${operator}role=${role}`
      operator = "&"
    }

    const rows = await this.api.get('/user/' + searchParams, { auth: true });
    return rows.map(row => new User(row));
  }

  async update(id, { name, email, mobile, cohort, role }) {
    return this.api.put(`/user/${encodeURIComponent(id)}`, { name, email, mobile, cohort, role }, { auth: true });
  }

  async remove(id) {
    return this.api.delete(`/user/${encodeURIComponent(id)}`, {}, { auth: true });
  }

  async verify(id) {
    return this.api.put(`/user/verify/${encodeURIComponent(id)}`, {}, { auth: true })
  }
}
