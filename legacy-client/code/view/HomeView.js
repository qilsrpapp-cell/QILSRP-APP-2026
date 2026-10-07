import { escapeHtml } from '../util/dom.js';

export default class HomeView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  async mount() {
    const user = this.app.auth.currentUser;
    const [events, cohorts] = await Promise.all([
      this.app.event.list(null, null),
      this.app.cohort.listForUser(user)
    ]);

    // Find the earliest event but still in the future
    const currentTimestamp = Date.now()
    let smallestTimestamp = Number.MAX_SAFE_INTEGER
    let earliestEvent = null
    events.forEach(e => {
      let eventTimestamp = Date.parse(e.datetime)
      if (eventTimestamp > currentTimestamp && eventTimestamp < smallestTimestamp && e.confirmed ) {
        smallestTimestamp = eventTimestamp
        earliestEvent = e
      }
    });

    this.container.innerHTML = `
      <h2>Home</h2>
      <p>Welcome, ${escapeHtml(user.name)}.</p>

      <div class="card">
        <h3>Next Event</h3>
        <p>${earliestEvent ? `${earliestEvent.name} (${earliestEvent.datetime}) at ${earliestEvent.location}` : "No planned events"}</p>
      </div>

      <div class="card">
        <h3>My Cohorts</h3>
        ${cohorts.length ? cohorts.map(cohort => `<p>${escapeHtml(cohort.name)}</p>`).join('') : '<p>No cohorts.</p>'}
      </div>
    `;
  }
}
