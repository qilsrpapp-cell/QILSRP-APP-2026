import Storage from './Storage.js';

/**
 * Generic browser-persisted collection used by feature controllers that do
 * not yet have a matching server endpoint (cohorts, events,
 * messages, resources). Every method returns a Promise so a controller can
 * be repointed at ApiClient later without changing its public interface or
 * the views that consume it.
 */
export default class LocalRepository {
  constructor(key, seed = []) {
    this.key = key;
    if (Storage.getCollection(key, null) === null) {
      Storage.setCollection(key, seed);
    }
  }

  _read() {
    return Storage.getCollection(this.key, []);
  }

  _write(rows) {
    Storage.setCollection(this.key, rows);
  }

  async all() {
    return this._read();
  }

  async find(id) {
    return this._read().find(row => row.id === id) ?? null;
  }

  async insert(row) {
    const rows = this._read();
    const id = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    const record = { ...row, id };
    rows.push(record);
    this._write(rows);
    return record;
  }

  async update(id, patch) {
    const rows = this._read();
    const index = rows.findIndex(row => row.id === id);
    if (index === -1) throw new Error('Record not found');
    rows[index] = { ...rows[index], ...patch };
    this._write(rows);
    return rows[index];
  }

  async remove(id) {
    this._write(this._read().filter(row => row.id !== id));
  }
}
