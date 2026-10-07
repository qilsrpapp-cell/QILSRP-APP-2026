import { escapeHtml } from '../util/dom.js';

export default class CohortsView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  async mount() {
    const user = this.app.auth.currentUser
    if (!user.isAdmin) {
      this.container.innerHTML = '<p>Access denied.</p>';
      return;
    }

    const cohorts = await this.app.cohort.list(true)

    let html =
      `<h2>Cohorts</h2>
        <div class="card">
          <h3>Create Cohort</h3>
          <label>Name</label><input type="text" id="post-cohort-name" />
          <button data-action="post-cohort">Add Cohort</button>
          <p id="post-cohort-error" class="error-text"></p>
        </div>
      
      <div class="card">
        <h3>Cohorts</h3>
        <table>
          <thead><tr><th>Name</th><th>Members</th><th>Action</th></tr></thead>
          <tbody>
            ${cohorts.map(cohort => `
              <tr data-id="${escapeHtml(cohort.name)}">
              <td>${escapeHtml(cohort.name)}</td>
              <td>${escapeHtml(cohort.userCount)}</td>
                <td>
                  <button data-action="delete-cohort" data-id="${escapeHtml(cohort.name)}">🗑 Delete</button>
                </td>
              </tr>
            `).join('')}
           </tbody>
        </table>
        <p id="edit-cohort-error" class="error-text"></p>
      </div>
    `;

    this.container.innerHTML = html;

    const postCohortBtn = this.container.querySelector('[data-action="post-cohort"]');
    if (postCohortBtn) postCohortBtn.addEventListener('click', () => this.postCohort());

    this.container.querySelectorAll('[data-action="delete-cohort"]').forEach(button => {
      button.addEventListener('click', () => this.deleteCohort(button.dataset.id));
    });
  }

  async postCohort() {
    const name = this.container.querySelector('#post-cohort-name').value.trim();
    const errorEl = this.container.querySelector('#post-cohort-error');
    errorEl.style.display = 'none';

    if (!name) { alert('Name is required.'); return; }

    try {
      await this.app.cohort.post(name);
      await this.mount();
      alert("Cohort successfully created")
    } catch (error) {
      errorEl.textContent = error.message || 'Creating a new cohort failed.';
      errorEl.style.display = 'block';
    }
  }

  async deleteCohort(name) {
    const errorEl = this.container.querySelector('#edit-cohort-error');
    if (!confirm(`Delete cohort ${name}? This cannot be undone.`)) return;
    try {
      await this.app.cohort.remove(name);
      await this.mount();
    } catch (error) {
      errorEl.textContent = error.message || 'Deleting a cohort failed.';
      errorEl.style.display = 'block';
    }
  }
}
