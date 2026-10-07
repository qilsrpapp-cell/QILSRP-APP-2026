import express from 'express'
import { auth, optionalAuth } from '../middleware/authorisation.js'
import { verifyAdmin } from '../middleware/authorisation.js'
import { verifyCohortData } from '../middleware/data-verification.js'

const router = express.Router()

/**
 * The endpoint at which admins can create a new cohort
 */
router.post('/', auth, verifyAdmin, verifyCohortData, (req, res, next) => {
  const name = req.body.name

  // Determine if cohort already exists in table
  req.db.from("cohort").where("name", "=", name)
    .then(cohorts => {
      if (cohorts.length > 0) {
        // If cohort does exist, return error response
        let e = Error("Cohort already exists")
        e.status = 409
        throw e

      } else {
        // If cohort does not exist, insert into table
        return req.db.from("cohort").insert({ name })

      }
    })
    .then(() => {
      res.status(201).json({ message: "Cohort created" })

    })
    .catch(e => next(e))
})

router.get('/', optionalAuth, (req, res, next) => {
  let cohorts
  req.db('cohort')
    .then(dbRes => {
      cohorts = dbRes

      // Find the user count
      return req.db('user')
        .select('cohort')
        .count('user_id', { as: 'userCount' })
        .whereNot({
          role: 'admin'
        })
        .groupBy('cohort')

    })
    .then(dbRes => {
      dbRes.forEach(cohortWCount => {
        // Rename key
        cohortWCount.name = cohortWCount.cohort;
        delete cohortWCount.cohort;
      })

      // Find the relevant cohort
      if (req.role == 'admin') {
        cohorts.forEach(cohort => {
          for (let i = 0; i < dbRes.length; i++) {
            if (cohort.name == dbRes[i].name) {
              cohort.userCount = dbRes[i].userCount
              break

            }
            // No users have this cohort
            cohort.userCount = 0
            
          }
        })
      }
      res.json(cohorts)

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which an admin can delete a cohort
 */
router.delete('/:name', auth, verifyAdmin, (req, res, next) => {
  // Check if any users still belong to the cohort
  req.db('user')
    .count('*')
    .where('cohort', req.params.name)
    .then(count => {
      if (count[0]['count(*)'] != 0) {
        let e = Error("There are still users belonging to this cohort")
        e.status = 400
        throw e

      }
      return req.db('cohort')
        .where('name', req.params.name)
        .del()

    })
    .then(count => {
      // Check if such a cohort exists
      if (count != 1) {
        let e = Error("Cohort not found")
        e.status = 404
        throw e

      }

      res.json({ message: `Cohort with name ${req.params.name} has been deleted` })

    })
    .catch(e => next(e))
})

export default router
