const SUPPORTED_TYPES = ['video', 'audio', 'image', 'pdf', 'document', 'spreadsheet', 'presentation'];

const SUPPORTED_ACCESS_LEVELS = ['student', 'ranger', 'admin']

/**
* Base Resource class that will cover any type of resource uploaded to the hub.
* Will most likely have several classes extending it for different resource types in the future.
*/
export default class Resource {
  constructor({ id, type, title, uploaderID, extension, mimeType, parentID, cohorts = [], accessLevel = null, creationDate = null } = {}) {
    if (!SUPPORTED_TYPES.includes(type.toLowerCase())) {
        throw new Error(`Resource type ${type.toLowerCase()} is not supported`);
    }

    // If access level is null, set to student by default. If access level is provided, check if it is valid.
    if (accessLevel) {
      if (!SUPPORTED_ACCESS_LEVELS.includes(accessLevel.toLowerCase())) {
        throw new Error(`Access level ${accessLevel.toLowerCase()} is not supported`);
      }
      else {
        this.accessLevel = accessLevel.toLowerCase();
      }
    } else {
      this.accessLevel = 'student'; // Default access level is student if not provided
    }

    this.id = id;
    this.type = type.toLowerCase(); // type of resource (video, audio, image, etc.).
    this.title = title;
    this.uploaderID = uploaderID;
    this.extension = extension;
    this.mimeType = mimeType;
    this.parentID = parentID; // ID of the folder this resource resides in.
    this.cohorts = cohorts;

    this.creationDate = creationDate ?? new Date().toISOString();
    // Or implement a separate filtering system with resourceIDs and tags.
  }

  isType(type) {
    return (this.type || '').toLowerCase() === type.toLowerCase();
  }

  // Check if a user has permission to access this resource.
  // TODO: Implement more robust system including cohort exclusions?
  canAccess(user) {
    switch (this.accessLevel) {
      case 'admin':
        return user.isAdmin;
      case 'ranger':
        return user.isRanger || user.isAdmin; // User is ranger or higher
      case 'student':
        return true; // All users can access student-level resources.
      default:
        return false; // Unknown access level, deny access by default.
    }
  }

  get isVideo() {
    return this.isType('video');
  }

  get isAudio() {
    return this.isType('audio');
  }

  get isImage() {
    return this.isType('image');
  }

  get isPDF() {
    return this.isType('pdf');
  }

  get isDocument() {
    return this.isType('document');
  }

  get isSpreadsheet() {
    return this.isType('spreadsheet');
  }
  
  get isPresentation() {
    return this.isType('presentation');
  }
}