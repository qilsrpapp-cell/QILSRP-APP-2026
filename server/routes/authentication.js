import express from 'express'
import { verifyUserLoginData, verifyUserPasswordData } from '../middleware/data-verification.js'
import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import { auth } from '../middleware/authorisation.js'


/**
 * Retrieves the secret used when validating JWT tokens from .env
 */
const JWT_SECRET = process.env.JWT_SECRET

const router = express.Router()

/**
 * The endpoint at which users can log in and retrieve a JWT token
 */
router.post('/login', verifyUserLoginData, (req, res, next) => {
  const { email, mobile, password } = req.body
  let user_id, name, role, status, cohort 

  // Determine if user already exists in table
  req.db.from("user").select("*")
    .where(function () {
      if (!mobile) {
        this.where("email", "=", email)

      }
      else {
        this.where("mobile", "=", mobile)

      }
    })
    .then(users => {
      if (users.length === 0) {
        let e = Error("Incorrect email/mobile or password")
        e.status = 401;
        throw e

      }
      // If user does exist, verify if passwords match
      const hash = users[0].password_hash
      user_id = users[0].user_id // Will refactor all of this once branches are merged
      name = users[0].name
      role = users[0].role
      status = users[0].status
      cohort = users[0].cohort
      return argon2.verify(hash, password)

    })
    .then(match => {
      if (match) {
        // Passwords match, check if user status is active
        return status

      } else {
        // If passwords do not match, return error response
        let e = Error('Incorrect email/mobile or password');
        e.status = 401;
        throw e
      }
    })
    .then(status => {
      if (status == "Active") {
        // Return JWT
        const expiresIn = 86400
        const exp = Math.floor(Date.now() / 1000) + expiresIn
        const token = jwt.sign({ exp, user_id, email, role, cohort }, process.env.JWT_SECRET)
        res.json({
          token,
          tokenType: "Bearer",
          expiresIn,
          user_id,
          name,
          email,
          role,
          cohort
        })

      }
      else if (status == "Pending") {
        let e = Error("User has not yet been verified by an administrator")
        e.status = 403
        throw e 

      }
      else {
        let e = Error("User status is not active")
        e.status = 403
        throw e

      }
    })
    .catch(e => next(e))
})

/**
 * The endpoint at which the current user can change their password
 */
router.put('/password', auth, verifyUserPasswordData, (req, res, next) => {
  const { currentPassword, newPassword } = req.body

  req.db.from("user")
    .select("password_hash")
    .where("email", "=", req.email)
    .then(users => {
      // Verify if passwords match
      const hash = users[0].password_hash
      return argon2.verify(hash, currentPassword)

    })
    .then(match => {
      if (match) {
        // Passwords match, update password
        return argon2.hash(newPassword)

      } else {
        // If passwords do not match, return error response
        let e = Error("Incorrect password")
        e.status = 401
        throw e

      }
    })
    .then(password_hash => {
      return req.db.from("user").where("email", "=", req.email).update('password_hash', password_hash)

    })
    .then(() => {
      res.json({ message: "User password updated" })

    })
    .catch(e => next(e))
})

export default router
