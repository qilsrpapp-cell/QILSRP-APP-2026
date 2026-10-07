import jwt from 'jsonwebtoken'

/**
 * Attempts to authenticate the user
 * @returns An error if the provided token is invalid or not found
 */
const auth = (req, res, next) => {
  if (!('authorization' in req.headers) || !req.headers.authorization.match(/^Bearer /)) {
    let e = Error("Authorization header ('Bearer token') not found")
    e.status = 401
    throw e

  }
  const token = req.headers.authorization.replace(/^Bearer /, "")
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    req.user_id = decodedToken.user_id // Will refactor all of this once branches are merged (:
    req.email = decodedToken.email
    req.role = decodedToken.role
    req.cohort = decodedToken.cohort

  }
  catch (e) {
    if (e.name === 'TokenExpiredError') {
      let e = Error('JWT token has expired')
      e.status = 401
      throw e

    }
    else {
      let e = Error('Invalid JWT token')
      e.status = 401
      throw e

    }
    return
  }

  next()
}

/**
 * Attempts to authenticate the user if an authorization header is present
 * Useful when you want to give additional functionality for admins
 * @returns An error if the provided token is invalid
 */
const optionalAuth = (req, res, next) => {
  if ('authorization' in req.headers) {
    if (!req.headers.authorization.match(/^Bearer /)) {
      let e = Error("Authorization header is malformed")
      e.status = 401
      throw e

    }
    const token = req.headers.authorization.replace(/^Bearer /, "")

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
      req.user_id = decodedToken.user_id;
      req.email = decodedToken.email;
      req.role = decodedToken.role;
      req.cohort = decodedToken.cohort;

    }
    catch (e) {
      console.log(e.name)
      if (e.name === 'TokenExpiredError') {
        let e = Error('JWT token has expired')
        e.status = 401
        throw e

      } else {
        let e = Error('Invalid JWT token')
        e.status = 401
        throw e

      }
      return

    }
  }

  next()
}

/**
 * Verifies that the authenticated user is an administrator. If using, call this function after calling auth().
 * @returns An error if the currently authenticated user is not an administrator
 */
const verifyAdmin = (req, res, next) => {
  if (req.role != 'admin') {
    let e = Error("Current user is not authorised to perform this function")
    e.status = 403
    throw e

  }

  next()
}

/**
 * Finds the levels of access the user has and provides a req paramater containing an array of levels the user can access.
 * Must be called after auth or optinalAuth
 * @returns 
 */
const getAccessLevel = (req, res, next) => {
  let accessTo = [];

    switch (req.role) {
        case 'admin':
            accessTo = ['admin', 'ranger', 'student'];
            break;
        case 'ranger':
            accessTo = ['ranger', 'student'];
            break;
        case 'student':
            accessTo = ['student'];
            break;
        default:
            res.status(403).json({
                error: true,
                message: "Current user does not have a recognised role. Accepted roles: 'admin', 'ranger', 'student'"
            });
            return;
    }

    req.accessTo = accessTo;

    next()
}

export { auth, optionalAuth, verifyAdmin, getAccessLevel }