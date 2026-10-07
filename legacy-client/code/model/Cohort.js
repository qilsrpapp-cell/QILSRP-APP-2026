export default class Cohort {
  constructor({ name, userCount } = {}) {
    this.name = name;
    this.userCount = userCount
  }
}

/*//Old, more detailed implementation
export default class Cohort {
  constructor({ id, name, rangerName, members = [] } = {}) {
    this.id = id;
    this.name = name;
    this.rangerName = rangerName;
    this.members = members;
  }

  hasMember(email) {
    return this.members.includes(email);
  }
}
*/