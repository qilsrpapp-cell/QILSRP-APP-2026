import User from '../model/User.js';
import Storage from '../util/Storage.js';

/**
 * Handles password changing (so far)
 */
export default class SettingsController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async changePassword(currentPassword, newPassword) {
    return this.api.put('/user/password', { currentPassword, newPassword }, { auth: true });
  }
}
