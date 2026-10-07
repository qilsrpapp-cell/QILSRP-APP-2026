import { escapeHtml } from '../util/dom.js';

export default class EventsView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  yearFilter = null
  monthFilter = null

  event_id = null

  nameFilter = null
  emailFilter = null
  cohortFilter = null
  roleFilter = null

  async mount() {
    const user = this.app.auth.currentUser

    if (!this.event_id) {
      const events = await this.app.event.list(this.yearFilter, this.monthFilter)

      let html = '<h2>Events</h2>'

      if (user.isAdmin) {
        html += `
        <div class="card">
          <h3>Create Event</h3>
          <label>Name</label><input type="text" id="post-event-name" />
          <label>Date</label><input type="datetime-local" id="post-event-date" />
          <label>Location</label><input type="text" id="post-event-location" />
          <label>Description</label><textarea id="post-event-description" rows="2"></textarea>
          <button data-action="post-event">Add Event</button>
          <p id="post-event-error" class="error-text"></p>
        </div>
      `;
      }

      html += `
      <div class="card">
        <h3>Events</h3>
        <label>Year</label><input type="number" id="fil-year" />
        <label>Month (01-12)</label><input type="number" id="fil-month" /><br>
        <button data-action="filter" style="margin-top: 10px;">⌕ Filter</button>
        <button data-action="reset-filters" class="horizontal-gap">Reset Filter</button>
        <table>
          <thead><tr><th>Creator</th><th>Name</th><th>Date</th><th>Location</th><th>Description</th><th>Conf.</th><th>Action</th></tr></thead>
          <tbody>
            ${events.map(event => `
              <tr data-id="${escapeHtml(event.event_id)}">
                <td>${escapeHtml(event.user)}</td>
                <td>${escapeHtml(event.name)}</td>
                <td>${escapeHtml(event.datetime)}</td>
                <td>${escapeHtml(event.location)}</td>
                <td>${escapeHtml(event.description)}</td>
                <td>${event.confirmed ? "✅" : "❌"}</td>
                <td style="width: 97px">
                  ${event.user_id == user.user_id ? `<button data-action="edit-event" data-id="${escapeHtml(event.event_id)}">✎ Edit</button>` : ""}
                  ${event.user_id == user.user_id ? `<button data-action="delete-event" data-id="${escapeHtml(event.event_id)}">🗑 Delete</button>` : ""}
                  ${!event.confirmed ? `<button data-action="confirm" data-id="${escapeHtml(event.event_id)}">✓ Confirm</button>` : ""}
                  <button data-action="member" data-id="${escapeHtml(event.event_id)}">☺︎ Members</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;

      this.container.innerHTML = html;

      const postEventBtn = this.container.querySelector('[data-action="post-event"]');
      if (postEventBtn) postEventBtn.addEventListener('click', () => this.postEvent());

      const filterBtn = this.container.querySelector('[data-action="filter"]');
      if (filterBtn) filterBtn.addEventListener('click', () => this.filterEvents());

      const resetFiltersBtn = this.container.querySelector('[data-action="reset-filters"]');
      if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => this.resetFilters());

      this.container.querySelectorAll('[data-action="edit-event"]').forEach(button => {
        button.addEventListener('click', () => this.editEvent(button.dataset.id));
      });

      this.container.querySelectorAll('[data-action="delete-event"]').forEach(button => {
        button.addEventListener('click', () => this.deleteEvent(button.dataset.id));
      });

      this.container.querySelectorAll('[data-action="confirm"]').forEach(button => {
        button.addEventListener('click', () => this.confirm(button.dataset.id));
      });

      this.container.querySelectorAll('[data-action="member"]').forEach(button => {
        button.addEventListener('click', () => this.showMembers(button.dataset.id));
      });

    }
    else {
      // Member management
      const [members, cohorts] = await Promise.all([
        this.app.event.members(this.event_id),
        this.app.cohort.list(true),
      ]);
      const roles = ['student', 'ranger', 'admin']
      let member_ids = []
      members.forEach(m => {
        member_ids.push(m.user_id)
      })
      let users = null
      if (user.isAdmin) {
        // TODO: Add Mobile Filtering
        users = await this.app.users.list(this.nameFilter, this.emailFilter, null, null, this.cohortFilter, this.roleFilter)
      }

      this.container.innerHTML = `
        <div class="card">
          <h3>Event Members</h3>
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Confirmed</th></tr></thead>
            <tbody>
              ${members.map(m => `
                  <td>${m.email ? m.email : m.mobile}</td>
                  <td>${escapeHtml(m.name)}</td>
                  <td>${escapeHtml(m.role)}</td>
                  <td>${m.confirmed ? "✅" : "❌"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      if (user.isAdmin)
        this.container.innerHTML += `
          <div class="card">
            <div class="flexbox">
              <h3>Manage Invitees</h3>
              <button data-action="show-filters" class="right-align">⌕ Filter</button>
              <button data-action="reset-filters" class="horizontal-gap">Reset Filter</button>
            </div>
            <div id="filters" style="display:none;">
              <label>Name</label><input type="text" id="fil-name" />
              <label>Email</label><input type="text" id="fil-email" />
              <label>Cohort</label>
              ${cohorts.map(c => `
                <input type="radio" id="${escapeHtml(c.name)}" name="fil-cohort" value="${escapeHtml(c.name)}" /><label for="${escapeHtml(c.name)}" style="display:inline;">${escapeHtml(c.name)}</label><br>
              `).join('')}
              <label style="margin-top: 10px;">Role</label>
              ${roles.map(r => `
                <input type="radio" id="${escapeHtml(r)}" name="fil-role" value="${escapeHtml(r)}" /><label for="${escapeHtml(r)}" style="display:inline;">${escapeHtml(String(r).charAt(0).toUpperCase() + String(r).slice(1))}</label><br>
                `).join('')}
              <button data-action="filter" style="margin-top: 10px;">Filter</button>
            </div>
            <h4>Invite New Users</h4>
            ${users.map(u => `
              ${!member_ids.includes(u.user_id) ? `
                <input type="checkbox" id="${escapeHtml(u.user_id)}" name="invitees" value="${escapeHtml(u.user_id)}">
                <label for="${escapeHtml(u.user_id)}" style="display:inline;">
                  ${escapeHtml(u.name)} (${escapeHtml(u.role || '-')}) - ${u.email ? u.email : u.mobile}
                </label><br>` : ""}
            `).join('')}
            <br>
            <button data-action="invite-users">Invite</button>
            <h4>Remove Users From Event</h4>
            ${users.map(u => `
              ${member_ids.includes(u.user_id) ? `<input type="checkbox" id="${escapeHtml(u.user_id)}" name="deletees" value="${escapeHtml(u.user_id)}"><label for="${escapeHtml(u.user_id)}" style="display:inline;">${escapeHtml(u.name)} (${escapeHtml(u.role || '-')}) - ${escapeHtml(u.email)}</label><br>` : ""}
            `).join('')}
            <br>
            <button data-action="delete-users">Remove</button>
          </div>
        `;

      this.container.innerHTML += `<button data-action="back">Back</button>`

      const showFiltersBtn = this.container.querySelector('[data-action="show-filters"]');
      if (showFiltersBtn) showFiltersBtn.addEventListener('click', () => this.showFilters());

      const resetFiltersBtn = this.container.querySelector('[data-action="reset-filters"]');
      if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => this.resetUserFilters());

      const filterBtn = this.container.querySelector('[data-action="filter"]');
      if (filterBtn) filterBtn.addEventListener('click', () => this.filterUsers());

      const inviteBtn = this.container.querySelector('[data-action="invite-users"]');
      if (inviteBtn) inviteBtn.addEventListener('click', () => this.inviteUsers());

      const deleteBtn = this.container.querySelector('[data-action="delete-users"]');
      if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteUsers());

      const backBtn = this.container.querySelector('[data-action="back"]');
      if (backBtn) backBtn.addEventListener('click', () => this.back());
    }
  }

  async postEvent() {
    const name = this.container.querySelector('#post-event-name').value.trim();
    const date = this.container.querySelector('#post-event-date').value.trim();
    const location = this.container.querySelector('#post-event-location').value.trim();
    const description = this.container.querySelector('#post-event-description').value.trim();
    const errorEl = this.container.querySelector('#post-event-error');
    errorEl.style.display = 'none';

    if (!name || !date || !location || !description) { alert('Name, date, location, and description are required.'); return; }

    try {
      await this.app.event.post(name, date.slice(0, 10) + " " + date.slice(11, 17), location, description);
      await this.mount();
      alert("Event successfully created")
    } catch (error) {
      errorEl.textContent = error.message || 'Creating a new event failed.';
      errorEl.style.display = 'block';
    }
  }

  async filterEvents() {
    this.yearFilter = this.container.querySelector('#fil-year').value.trim();
    this.monthFilter = this.container.querySelector('#fil-month').value.trim();
    await this.mount();
  }

  async resetFilters() {
    this.yearFilter = null
    this.monthFilter = null
    await this.mount();

  }

  async editEvent(event_id) {
    const name = prompt('New name for this event:');
    if (!name) return;
    const datetime = prompt('Updated date for this event in YYYY-MM-DD HH:MM format:');
    if (!datetime) return;
    const location = prompt('Updated location for this event:');
    if (!location) return;
    const description = prompt('Updated description for this event:');
    if (!description) return;

    try {
      await this.app.event.update(event_id, { name, datetime, location, description });
      await this.mount();
      alert("Event successfully updated")

    } catch (error) {
      alert(error.message || 'Creating a new event failed.')

    }

  }

  async deleteEvent(id) {
    if (!confirm(`Delete event ${id}? This cannot be undone.`)) return;
    await this.app.event.remove(id);
    await this.mount();

  }

  async confirm(id) {
    if (!confirm(`Confirm you will be attending this event?`)) return;
    await this.app.event.confirm(id);
    await this.mount();
  }

  async showMembers(id) {
    this.event_id = id
    await this.mount()
    window.scrollTo(0, 0)
  }

  async showFilters() {
    const filters = this.container.querySelector('#filters');
    if (filters.style.display === 'none') {
      filters.style.display = 'block';

    }
    else {
      filters.style.display = 'none';

    }
  }

  async resetUserFilters() {
    this.nameFilter = null
    this.emailFilter = null
    this.cohortFilter = null
    this.roleFilter = null
    await this.mount();

  }

  async filterUsers() {
    this.nameFilter = this.container.querySelector('#fil-name').value.trim();
    this.emailFilter = this.container.querySelector('#fil-email').value.trim();
    try {
      this.cohortFilter = this.container.querySelector('input[name="fil-cohort"]:checked').value;
    } catch (e) {
      this.cohortFilter = undefined
    }
    try {
      this.roleFilter = document.querySelector('input[name="fil-role"]:checked').value;
    } catch (e) {
      this.roleFilter = undefined
    }
    await this.mount();
  }

  async inviteUsers() {
    let invitees = this.container.querySelectorAll('input[name="invitees"]:checked');
    let invitee_ids = [];
    invitees.forEach((checkbox) => {
      invitee_ids.push(parseInt(checkbox.value));
    });
    await this.app.event.invite(this.event_id, invitee_ids);
    await this.mount()
  }

  async deleteUsers() {
    let deletees = this.container.querySelectorAll('input[name="deletees"]:checked');
    let deletee_ids = [];
    deletees.forEach((checkbox) => {
      deletee_ids.push(parseInt(checkbox.value));
    });
    await this.app.event.removeMembers(this.event_id, deletee_ids);
    await this.mount()
  }

  async back() {
    this.event_id = null
    await this.mount()
    window.scrollTo(0, 0)
  }
}
