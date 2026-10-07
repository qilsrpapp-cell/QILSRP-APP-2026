import express from 'express'
import { verifyEventData, verifyEventMemberData } from '../middleware/data-verification.js'
import { auth, optionalAuth, verifyAdmin } from '../middleware/authorisation.js'

const router = express.Router()

/**
 * The endpoint at which a new event can be posted
 */
router.post('/', auth, verifyAdmin, verifyEventData, (req, res, next) => {
  const { name, datetime, location, description } = req.body
  let eventId
  req.db.from("event")
    .insert({
      event_id: null,
      user_id: req.user_id,
      name,
      datetime,
      location,
      description,

    })
    .then(dbRes => {
      eventId = dbRes[0]
      return req.db.from("event_member").insert({
        event_id: eventId,
        user_id: req.user_id,
        confirmed: 1
      })

    })
    .then(() => {
      res.status(201).json({ message: "Event with ID " + eventId + " successfully created" })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which users can retrieve their event info
 */
router.get('/', auth, (req, res, next) => {
  let eventConfirmation = []

  req.db("event_member")
    .select(['event_id', 'confirmed'])
    .where('user_id', req.user_id)
    .then(dbRes => {
      // Initialise event ids and event confirmation variables for later
      let eventIds = []
      for (let i = 0; i < dbRes.length; i++) {
        eventIds[i] = dbRes[i].event_id
      }
      eventConfirmation = dbRes

      return req.db('event')
        .select("*")
        .whereIn('event_id', eventIds)

        // Year/month filtering
        .andWhere(function () {
          if (req.query.year != undefined) {
            if (req.query.month != undefined) {
              this.where('datetime', '>=', req.query.year + "-" + req.query.month + "-01")

            }
            else {
              // Just the year
              this.where('datetime', '>=', req.query.year + "-01-01")

            }
          }

        })
        .andWhere(function () {
          // Maximums
          if (req.query.year != undefined) {
            if (req.query.month != undefined) {
              let year = parseInt(req.query.year)
              let nextMonth = parseInt(req.query.month) + 1
              // Check for overflow
              if (nextMonth == 13) {
                year++
                nextMonth = 1
              }
              this.where('datetime', '<', year.toString() + "-" + nextMonth.toString() + "-01")

            }
            else {
              this.where('datetime', '<', (parseInt(req.query.year) + 1).toString() + "-01-01")

            }
          }
        })
    })
    .then(events => {
      let eventCreatorIds = []
      for (let i = 0; i < events.length; i++) {
        // Convert to local timezone by adding 10 hours
        const localDatetime = new Date(Date.parse(events[i].datetime) + 36000000).toISOString()
        events[i].datetime = localDatetime.slice(0, 10) + " " + localDatetime.slice(11, 16)

        // Add confirmed data
        for (let j = 0; j < eventConfirmation.length; j++) {
          if (events[i].event_id == eventConfirmation[j].event_id) {
            events[i].confirmed = (eventConfirmation[j].confirmed == 1) ? true : false
            break

          }
        }

        // Get user ids
        eventCreatorIds[i] = events[i].user_id
      }

      // Add event creator names
      req.db('user')
        .select('user_id', 'name')
        .whereIn('user_id', eventCreatorIds)
        .then(creators => {
          for (let i = 0; i < events.length; i++) {
            for (let j = 0; j < creators.length; j++) {
              if (events[i].user_id == creators[j].user_id) {
                events[i].user = creators[j].name
                break

              }
            }
          }
          res.json(events)

        })
    })
    .catch(e => {
      if (e.sqlMessage.startsWith("Incorrect DATETIME value: ")) {
        console.log(e.sqlMessage)
        e.message = "Likely an invalid year/month value. Please contact the devs if this is incorrect."
        e.status = 400
      }
      next(e)
    })

})

/**
 * The endpoint at which the user can edit the event's details
 */
router.put('/:id', auth, verifyEventData, (req, res, next) => {
  const { name, datetime, location, description } = req.body

  // Check if such a event exists
  req.db('event')
    .select('*')
    .where({ event_id: req.params.id, user_id: req.user_id })
    .update({ name, datetime, location, description })
    .then(count => {
      if (count != 1) {
        let e = Error("Event not found")
        e.status = 404
        throw e

      }
      res.json({ message: `Event with ID ${req.params.id} has been updated` })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which the user can delete the event
 */
router.delete('/:id', auth, (req, res, next) => {
  req.db("event")
    .where({ event_id: req.params.id, user_id: req.user_id })
    .then(event => {
      // Check if such an event exists
      if (event.length != 1) {
        let e = Error("Event not found")
        e.status = 404
        throw e

      }
      // Remove references to event
      return req.db('event_member')
        .where("event_id", req.params.id)
        .del()

    })
    .then(() => {
      return req.db('event')
        .where("event_id", req.params.id)
        .del()

    })
    .then(() => {
      res.json({ message: `Event with ID ${req.params.id} has been deleted` })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which members can be invited to an event
 */
router.post('/:id/members', auth, verifyAdmin, verifyEventMemberData, (req, res, next) => {
  req.db("event")
    .where({ event_id: req.params.id })
    .then(event => {
      // Check if such an event exists
      if (event.length != 1) {
        let e = Error("Event not found")
        e.status = 404
        throw e

      }
      // Add members
      let data = []
      req.body.forEach(user_id => {
        data.push({ event_id: req.params.id, user_id, confirmed: 0 })
      });

      return req.db('event_member')
        .insert(data)

    })
    .then(() => {
      res.json({ message: "Added members to the event successfully" })

    })
    .catch(e => {
      if ('errno' in e) {
        // Check for duplicates
        if (e.errno == 1062) {
          e.message = "One or more users are already invited to this event"
          e.status = 400

        }
      }

      next(e)

    })
})

/**
 * The endpoint at which users can retrieve event membership info
 */
router.get('/:id/members', auth, (req, res, next) => {
  let eventConfirmation = []
  const user_fields = ["user_id", "name", "email", "mobile", "role"]

  // Check that this user created/was invited to this event
  req.db("event_member")
    .where({ event_id: req.params.id, user_id: req.user_id })
    .then(event => {
      if (event.length != 1) {
        let e = Error("Event not found")
        e.status = 404
        throw e

      }

      return req.db("event_member")
        .select(['user_id', 'confirmed'])
        .where('event_id', req.params.id)

    })
    .then(dbRes => {
      // Initialise user ids and event confirmation variables for later
      let userIds = []
      for (let i = 0; i < dbRes.length; i++) {
        userIds[i] = dbRes[i].user_id
      }
      eventConfirmation = dbRes

      return req.db('user')
        .select(user_fields)
        .whereIn('user_id', userIds)

    })
    .then(users => {
      for (let i = 0; i < users.length; i++) {
        // Add confirmed data
        for (let j = 0; j < eventConfirmation.length; j++) {
          if (users[i].user_id == eventConfirmation[j].user_id) {
            users[i].confirmed = (eventConfirmation[j].confirmed == 1) ? true : false
            break

          }
        }
      }

      res.json(users)

    })
    .catch(e => next(e))

})

/**
 * The endpoint at which members can be invited to an event
 */
router.delete('/:id/members', auth, verifyAdmin, verifyEventMemberData, (req, res, next) => {
  req.db("event")
    .where({ event_id: req.params.id })
    .then(event => {
      // Check if such an event exists
      if (event.length != 1) {
        let e = Error("Event not found")
        e.status = 404
        throw e

      }
      // Delete members
      return req.db('event_member')
        .whereIn('user_id', req.body)
        .del()

    })
    .then(() => {
      res.json({ message: "Removed members from the event successfully" })

    })
    .catch(e => next(e))
})

/**
 * The endpoint at which a pending event can be confirmed by the invited user
 */
router.post('/:id/confirm', auth, (req, res, next) => {
  req.db.from("event_member")
    .select("confirmed")
    .where({
      event_id: req.params.id,
      user_id: req.user_id,
      confirmed: 0
    })
    .update('confirmed', 1)
    .then(result => {
      if (result != 1) {
        let e = Error("Event not found or is not pending confirmation")
        e.status = 404
        throw e

      }

      res.json({ message: `Event with id ${req.params.id} has been confirmed` })

    })
    .catch(e => next(e))
})

export default router
