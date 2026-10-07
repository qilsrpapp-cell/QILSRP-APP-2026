export default class Folder {
    constructor({ id, name, parentID = null, cohorts =[], accessLevel = null, creationDate = null, path = [] } = {}) {
        this.id = id;
        this.name = name;
        this.parentID = parentID;
        this.cohorts = cohorts;
        this.accessLevel = accessLevel ?? 'student'; // Default access level is 'student' if not provided
        this.creationDate = creationDate ?? new Date().toISOString();
        this.path = path;
    }

    // Check if a user has permission to access this folder.
    // TODO: Implement more robust system including cohort exclusions?
    canAccess(user) {
        switch (this.accessLevel) {
        case 'admin':
            return user.isAdmin;
        case 'ranger':
            return user.isRanger || user.isAdmin; // User is ranger or higher
        case 'student':
            return true; // All users can access student-level folders.
        default:
            return false; // Unknown access level, deny access by default.
        }
    }
}