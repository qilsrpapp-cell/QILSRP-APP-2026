export default class User {
  constructor({ user_id, name, email, mobile, role, status, created, cohort } = {}) {
    this.user_id = user_id
    this.name = name;
    this.email = email;
    this.mobile = mobile;
    this.role = role;
    this.status = status;
    this.created = created;
    this.cohort = cohort;
  }

  hasRole(role) {
    return (this.role || '').toLowerCase() === role.toLowerCase();
  }

  get isAdmin() {
    return this.hasRole('admin');
  }

  get isRanger() {
    return this.hasRole('ranger');
  }

  get isStudent() {
    return this.hasRole('student');
  }
}
