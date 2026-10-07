import Event from '../model/Event.js';

/**
 * Event management
 */
export default class UserController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async post(name, datetime, location, description) {
    return this.api.post('/event/', { name, datetime, location, description }, { auth: true });
  }

  async list(year, month) {
    let searchParams = ''

    if (year) {
      searchParams += `?year=${year}`

      if (month) {
        searchParams += `&month=${month}`

      }
    }


    const rows = await this.api.get('/event/' + searchParams, { auth: true });
    return rows.map(row => new Event(row));
  }

  async update(id, { name, datetime, location, description }) {
    return this.api.put(`/event/${encodeURIComponent(id)}`, { name, datetime, location, description }, { auth: true });
  }

  async remove(id) {
    return this.api.delete(`/event/${encodeURIComponent(id)}`, {}, { auth: true });
  }

  async invite(id, ids) {
    return this.api.post(`/event/${encodeURIComponent(id)}/members`, ids, { auth: true })
  }

  async members(id) {
    return this.api.get(`/event/${encodeURIComponent(id)}/members`, { auth: true })
  }

  async removeMembers(id, ids) {
    return this.api.delete(`/event/${encodeURIComponent(id)}/members`, ids, { auth: true })
  }

  async confirm(id) {
    return this.api.post(`/event/${encodeURIComponent(id)}/confirm`, {}, { auth: true })
  }
}
