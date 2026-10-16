/**
 * Validates that the user data in the body of the request
 * is in the correct format
 * @returns An error if either field is null
 */
const verifyUserLoginData = (req, res, next) => {
  const { email, mobile, password } = req.body ?? {}

  if (!password) {
    let e = Error("Request body incomplete, password is required")
    e.status = 400
    throw e

  }

  if (!email && !mobile) {
    let e = Error("Request body incomplete, one of email or mobile is required")
    e.status = 400
    throw e

  }

  next()
}

/**
 * Enforces strong password requirements on the given password
 */
const verifyPassword = (password) => {
  if (password.length < 8) {
    let e = Error("Password must contain at least 8 characters")
    e.status = 400
    throw e

  }

  if (!/[A-Z]/.test(password)) {
    let e = Error("Password must contain a capital letter")
    e.status = 400
    throw e

  }

  if (!/[0-9]/.test(password)) {
    let e = Error("Password must contain a number")
    e.status = 400
    throw e

  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    let e = Error("Password must contain a special character")
    e.status = 400
    throw e

  }
}

/**
 * Normalises phone numbers to be domestic format with no whitepsaces
 */
const normaliseMobile = (mobile) => {
  // Remove all whitespace
  mobile = mobile.replace(/\s/g, '')

  // Make the number domestic format if it isn't already
  if (mobile.startsWith("+614")) {
    mobile = "0" + mobile.substring(3)
  }

  return mobile;
}

/**
 * Verifies an input mobile number to ensure it is a valid australian number. Assumes the mobile number is domestic and contains no whitespace.
 * @param {} mobile 
 */
const verifyMobile = (mobile) => {
  // Ensure the mobile number begins with 04 (domestic Australian mobile number) and contains 8 additional numbers
  if (!/^04\d{8}$/.test(mobile)) {
    let e = Error("Mobile number must be a valid Australian mobile number")
    e.status = 400
    throw e
  }
}

const roles = ['student', 'ranger', 'admin']

/**
 * Validates that the user data in the body of the request
 * is in the correct format
 * @returns An error if any field is null
 */
const verifyUserData = (req, res, next) => {
  const { name, email, mobile, role } = req.body ?? {}

  // Cohort is optional: a blank value is stored as NULL, a supplied one is checked below
  const cohort = typeof req.body?.cohort === 'string' && req.body.cohort.trim() ? req.body.cohort.trim() : null
  if (req.body) req.body.cohort = cohort

  if (req.url == '/register') {
    // Registration has an additional password field
    const password = req.body.password ?? null

    if (!name || !password || !role) {
      let e = Error("Request body incomplete: name, password, and role are required.")
      e.status = 400
      throw e

    }

    verifyPassword(password)

  }
  else {

    if (!name || !role) {
      let e = Error("Request body incomplete: name and role are required.")
      e.status = 400
      throw e

    }
  }

  if (email) {
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email)) {
      let e = Error("Email must be a valid email")
      e.status = 400
      throw e

    }
  }

  if (mobile) {
    const normalisedMobile = normaliseMobile(mobile);
    verifyMobile(normalisedMobile)
    // Update body with the normalised mobile that definitely contains no whitespace and is in domestic format
    req.body.mobile = normalisedMobile;

  }
  else if (!email) {
    let e = Error("Request body incomplete: one of email address or mobile number is required.")
    e.status = 400
    throw e

  }

  if (!roles.includes(role)) {
    let e = Error("Role must be one of 'student', 'ranger', or 'admin'")
    e.status = 400
    throw e

  }

  if (role != "admin" && cohort) {
    // Check if cohort exists
    req.db('cohort')
      .count('*')
      .where('name', cohort)
      .then(count => {
        if (count[0]['count(*)'] != 1) {
          let e = Error("Cohort does not exist")
          e.status = 400
          throw e

        }

        next()

      })
      .catch(e => next(e))

  }
  else {
    next()

  }

}

/**
 * Validates that the password data in the body of the request
 * is in the correct format and fits password requirements
 * @returns An error if either field is null or if newPassword is weak
 */
const verifyUserPasswordData = (req, res, next) => {
  const { currentPassword, newPassword } = req.body ?? {}

  if (!currentPassword || !newPassword) {
    let e = Error("Request body incomplete, both currentPassword and newPassword are required")
    e.status = 400
    throw e

  }

  try {
    verifyPassword(newPassword)

  }
  catch (e) {
    e.status = 400
    throw e

  }

  next()
}

/**
 * Validates the format of a resource title, enforcing character restrictions and other rules
 */
const verifyResourceTitle = (title) => {
  if (title.length > 255) {
    throw new Error("Resource title must not exceed 255 characters")
  }

  if (title.trim() === "") {
    throw new Error("Resource title must not be empty")
  }

  if (/[<>:"/|\\?*]/.test(title)) {
    throw new Error('Resource title contains invalid characters. Restricted characters: < > : " / | \\ ? *')
  }
}

/**
 * Validates a provided access level, throwing an error if it is not one of the recognised roles
 * @param {*} accessLevel - Provided access level to check 
 */
const verifyValidAccessLevel = (accessLevel) => {
  if (!roles.includes(accessLevel)) {
    const errorMessage = "Access level must be one of: " + roles.map(role => `'${role}'`).join(", ")
    throw new Error(errorMessage)
  }
}

/**
 * Validates that a list of cohorts are all valid cohorts. Requires a database connection to be passed to obtain existing cohorts.
 * @param {} cohorts - list of cohorts to validate
 * @param {*} db  - database connection to find existing cohorts
 */
const verifyValidCohorts = async (cohorts, db) => {
  if (!Array.isArray(cohorts)) {
    throw new Error("Cohorts must be an array")
  }

  // Get all cohorts mentioned in the list of cohorts
  const rows = await db.from("cohort").select("name").whereIn("name", cohorts)

  // If rows are a different length, one or more cohorts were not found.
  if (rows.length !== cohorts.length) {
    throw new Error("One or more cohorts specified does not exist")
  }
}
/**
 * Verifies the information provided for a resource being added to the database, throwing an error if some information is invalid.
 * @returns 
 */
const verifyResourceData = (req, res, next) => {
  const { title, type, extension, mimeType, parentID, cohorts, accessLevel } = req.body ?? {}

  if (!title || !type || !extension || !mimeType || !parentID || !accessLevel) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, some required fields are missing. Required fields: title, type, extension, mimeType, parentID, accessLevel"
    })
    return
  }

  try {
    verifyResourceTitle(title)
  }
  catch (e) {
    res.status(400).json({
      error: true,
      message: e.message
    })
    return
  }

  const types = ['video', 'audio', 'image', 'pdf', 'document', 'spreadsheet', 'presentation'];

  if (!types.includes(type.toLowerCase())) {
    res.status(400).json({
      error: true,
      message: "Resource type must be one of 'video', 'audio', 'image', 'pdf', 'document', 'spreadsheet' or 'presentation'"
    })
    return
  }

  // Check if cohorts exist in the db
  try {
    verifyValidCohorts(cohorts, req.db)
  }
  catch (e) {
    res.status(400).json({
      error: true,
      message: e.message
    })
    return
  }


  // Check if accessLevel is a valid value, currently must be one of the roles
  try {
    verifyValidAccessLevel(accessLevel.toLowerCase())
  }
  catch (e) {
    res.status(400).json({
      error: true,
      message: e.message
    })
    return
  }

  // TODO: Check mimeType and extension match the type of resource being uploaded

  next()
}

const verifyResourceEditData = (req, res, next) => {
  const { title, cohorts, accessLevel } = req.body ?? {}

  if (!title && !cohorts && !accessLevel) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, at least one of title or accessLevel must be provided"
    })
    return
  }

  // Check if title is valid, if it is provided
  if (title) {
    try {
      verifyResourceTitle(title)
    }
    catch (e) {
      res.status(400).json({
        error: true,
        message: e.message
      })
      return
    }
  }

  // Check if accessLevel is a valid value, if it is provided. Currently must be one of the roles
  if (accessLevel) {
    try {
      verifyValidAccessLevel(accessLevel.toLowerCase())
    }
    catch (e) {
      res.status(400).json({
        error: true,
        message: e.message
      })
      return
    }
  }

  // Check if provided cohorts are valid, if provided
  if (cohorts) {
    try {
      verifyValidCohorts(cohorts, req.db)
    }
    catch (e) {
      res.status(400).json({
        error: true,
        message: e.message
      })
      return
    }
  }

  next()
}

/* Validates that the cohort in the body of the request is in the correct format
* @returns An error if the name field is invalid
*/
const verifyCohortData = (req, res, next) => {
  const { name } = req.body ?? {}

  if (!name) {
    let e = Error("Request body incomplete: name is required.")
    e.status = 400
    throw e

  }

  next()
}

/**
 * Validates the format and length of a folders name.
 * @param {string} name - the name of the folder
 */
const verifyFolderName = (name) => {
  if (name.length > 128) {
    throw new Error("Folder name must not exceed 128 characters")
  }

  if (name.trim() === "") {
    throw new Error("Folder name must not be empty")
  }

  if (/[<>:"/|\\?*]/.test(name)) {
    throw new Error('Folder name contains invalid characters. Restricted characters: < > : " / | \\ ? *')
  }
}

/**
 * Validates the information provided for a folder being added to the database, throwing an error if some information is invalid.
 * @returns an erorr if some information is invalid
 */
const verifyFolderData = (req, res, next) => {
  const { name, parentID, cohorts, accessLevel } = req.body ?? {}

  // parentID cannot be null for any folder but the root, which has been pre-established in the table.
  if (!name || !parentID || !accessLevel) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, some required fields are missing. Required fields: name, parentID, accessLevel"
    })
  }

  try {
    verifyFolderName(name)
  }
  catch (e) {
    res.status(400).json({
      error: true,
      message: e.message
    })
    return
  }

  // Check if cohorts exist in the db
  try {
    verifyValidCohorts(cohorts, req.db)
  }
  catch (e) {
    res.status(400).json({
      error: true,
      message: e.message
    })
    return
  }

  // Check if accessLevel is a valid value, currently must be one of the roles
  if (!roles.includes(accessLevel)) {
    res.status(400).json({
      error: true,
      message: "Access level must be one of 'student', 'ranger', or 'admin'"
    })
    return
  }

  next()
}

/** Validates that the event in the body of the request is in the correct format
 * @returns An error if any field is null or if the date is invalid
 */
const verifyEventData = (req, res, next) => {
  const { name, datetime, location, description } = req.body ?? {}

  if (!name || !datetime || !location || !description) {
    let e = Error("Request body incomplete: name, datetime, location, and description are required.")
    e.status = 400
    throw e

  }

  // Determine if datetime is valid
  const format = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
  const datetimeDate = new Date(Date.parse(datetime) + 36000000) // Local time
  const datetimeTimestamp = datetimeDate.getTime()
  try {
    const invalidDatetime = datetimeDate.toISOString() != datetime.slice(0, 10) + "T" + datetime.slice(11, 17) + ":00.000Z" // This in itself can also throw an error
    if (!datetime.match(format) || isNaN(datetimeTimestamp) || invalidDatetime) { throw Error() }

  }
  catch (e) {
    e = Error("Invalid input: datetime must be a real time in format YYYY-MM-DD HH:MM.")
    e.status = 400
    throw e

  }

  if (datetimeTimestamp < Date.now() + 36000000) {
    let e = Error("Invalid input: datetime must be a time in the future.")
    e.status = 400
    throw e

  }

  next()
}

/**
 * Validates that the user ids in the body of the request is in the correct format
 * @returns An error if the format is incorrect or any value is not an integer
 */
const verifyEventMemberData = (req, res, next) => {
  const user_ids = req.body
  const error_message = "Request body invalid: the array of user IDs must be integers"
  try {
    if (typeof user_ids[0] != "number") {
      throw Error(error_message)

    }
    user_ids.forEach(id => {
      if (typeof id != "number") {
        throw Error(error_message)

      }
    });
    next()

  }
  catch (e) {
    e.status = 400
    next(e)

  }
}

export { verifyUserLoginData, verifyUserData, verifyUserPasswordData, verifyCohortData, verifyResourceData, verifyResourceEditData, verifyFolderData, verifyEventData, verifyEventMemberData }
