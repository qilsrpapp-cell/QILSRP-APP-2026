import { escapeHtml } from '../util/dom.js';

export default class SettingsView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  async mount() {
    const user = this.app.auth.currentUser;

    this.container.innerHTML = `
      <h2>Settings</h2>
      <div class="card">
        <h3>Account</h3>
        <p>Name: ${escapeHtml(user.name)}</p>
        <p>Role: ${escapeHtml(user.role)}</p>
        <p>Email: ${escapeHtml(user.email)}</p>
      </div>
      <div class="card">
        <h3>Change Password</h3>
        <label>Current Password</label><input type="password" id="chpass-current" />
        <label>New Password</label><input type="password" id="chpass-new" />
        <button data-action="chpass">Confirm</button>
        <p id="chpass-error" class="error-text"></p>
      </div>
      <div class="card">
        <h3>Preferences</h3>
        <label><input type="checkbox" checked /> Push Notifications</label><br/>
        <label><input type="checkbox" /> Offline Mode</label>
      </div>
      <div class="card">
        <h3>About</h3>
        <p>Junior Ranger App</p>
        <p>QILSRP / QUT Team 184</p>
      </div>
      <br/>
      <button data-action="logout">Logout</button>
    `;

    const changePasswordBtn = this.container.querySelector('[data-action="chpass"]');
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => this.changePassword());

    this.container.querySelector('[data-action="logout"]').addEventListener('click', () => {
      this.app.pages.events.event_id = null // Reset to event overview page
      this.app.logout()
    });
  }

  async changePassword() {
    const currentPassword = this.container.querySelector('#chpass-current').value.trim();
    const newPassword = this.container.querySelector('#chpass-new').value.trim();
    const errorEl = this.container.querySelector('#chpass-error');
    errorEl.style.display = 'none';

    if (!currentPassword || !newPassword ) { alert('Current and new password are required.'); return; }

    try {
      await this.app.settings.changePassword(currentPassword, newPassword);
      await this.mount();
      alert("Password updated successfully")
    } catch (error) {
      errorEl.textContent = error.message || 'Password editing failed.';
      errorEl.style.display = 'block';
    }
  }
}
