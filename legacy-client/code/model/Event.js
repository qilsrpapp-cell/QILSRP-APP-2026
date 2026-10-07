export default class Event {
  constructor({ event_id, user_id, user, name, datetime, location, description, confirmed } = {}) {
    this.event_id = event_id
    this.user_id = user_id
    this.user = user
    this.name = name;
    this.datetime = datetime;
    this.location = location
    this.description = description;
    this.confirmed = confirmed
  }
}
