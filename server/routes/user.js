import express from 'express'
import { verifyUserData } from '../middleware/data-verification.js'
import argon2 from 'argon2'
import { auth, optionalAuth, verifyAdmin } from '../middleware/authorisation.js'

const router = express.Router()

/**
 * The endpoint at which a new user can be registered
 */
router.post('/register', optionalAuth, verifyUserData, (req, res, next) => {
  const { name, email, mobile, password, cohort, role } = req.body

  // Check if the user is an administrator
  let status = "Pending"
  if (req.email != undefined && req.role == 'admin') {
    status = "Active"
  }

  // Determine if user already exists in table
  req.db.from("user").select("*").where("email", "=", email)
    .then(users => {
      if (users.length > 0) {
        // If user does exist, return error response
        let e = Error("User already exists")
        e.status = 409
        throw e

      } else {
        // If user does not exist, insert into table
        return argon2.hash(password)

      }
    })
    .then(password_hash => {
      let currentDate = new Date()

      return req.db.from("user").insert({
        user_id: null,
        name,
        email,
        mobile,
        password_hash,
        status,
        created: currentDate.toISOString().slice(0, 19).replace('T', ' '),
        role,
        cohort
      })

    })
    .then(() => {
      res.status(201).json({ message: "User created. If you are not an admin please wait to be verified." })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which a pending user can be verified by an admin
 */
router.put('/verify/:id', auth, verifyAdmin, (req, res, next) => {

  req.db.from("user")
    .select("status")
    .where({ user_id: req.params.id, status: "Pending" })
    .update('status', 'Active')
    .then(result => {

      if (result != 1) {
        let e = Error("User not found or is not pending verification")
        e.status = 404
        throw e

      }

      res.json({ message: `User has been verified` })
    
    })
    .catch(e => next(e))
})

/**
 * The endpoint at which users can retrieve select user info
 */
router.get('/', auth, (req, res, next) => {
  let fields = ['user_id', 'name', 'email', 'mobile', 'role']
  if (req.role == "admin") {
    fields = fields.concat(['status', 'created', 'cohort'])
  }

  req.db('user')
    .select(fields)

    // Filters
    .where(function () {
      if (req.query.name != undefined) {
        this.where('name', req.query.name)

      }
    })
    .andWhere(function () {
      if (req.query.email != undefined) {
        this.where('email', req.query.email)

      }
    })
    .andWhere(function () {
      if (req.query.mobile != undefined) {
        this.where('mobile', req.query.mobile)

      }
    })
    .andWhere(function () {
      if (req.query.status != undefined && req.role == "admin") {
        this.where('status', req.query.status)

      }
      else if (req.role != "admin") { 
        // Return only verified users
        this.where('status', "Active")

      }
    })
    .andWhere(function () {
      if (req.query.cohort != undefined && req.role == "admin") {
        this.where('cohort', req.query.cohort)

      }
      else if (req.role != "admin") {
        // Return only users within the user's cohort
        this.where('cohort', req.cohort)

      }
    })
    .andWhere(function () {
      if (req.query.role != undefined) {
        this.where('role', req.query.role)

      }
    })

    .then(cohort_members => {
      if (req.role == "admin") {
        cohort_members.forEach(member => {
          // Convert created time to local timezone by adding 10 hours
          const createdLocal = new Date(Date.parse(member.created) + 72000000).toISOString()
          member.created = createdLocal.slice(0, 10) + " " + createdLocal.slice(11, 19)
        })
      }

      res.json(cohort_members)

    })
    //.catch(e => next(e))
})

/**
 * The endpoint at which the user or an admin can edit their details
 */
router.put('/:id', auth, verifyUserData, (req, res, next) => {
  const { name, email, mobile, cohort, role } = req.body

  // Check if such a user exists
  req.db('user')
    .count('*')
    .where({ "user_id": req.params.id })
    .then(count => {
      if (count[0]['count(*)'] != 1) {
        let e = Error("User not found")
        e.status = 404
        throw e

      }

      if (req.user_id != req.params.id && req.role != "admin") {
        let e = Error("Forbidden")
        e.status = 403
        throw e

      }

      return req.db('user')
        .where('user_id', req.params.id)
        .update({ name, email, mobile, cohort, role })

    })
    .then(() => {
      res.json({ message: `User ${name} has been updated` })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which the user or an admin can delete their account
 */
router.delete('/:id', auth, (req, res, next) => {
  if (req.user_id != req.params.id && req.role != "admin") {
    let e = Error("Forbidden")
    e.status = 403
    throw e

  }

  req.db('user')
    .where('user_id', req.params.id)
    .del()
    .then(count => {
      // Check if such a user exists
      if (count != 1) {
        let e = Error("User not found")
        e.status = 404
        throw e

      }

      res.json({ message: `User has been deleted` })

    })
    .catch(e => next(e))
})

export default router
