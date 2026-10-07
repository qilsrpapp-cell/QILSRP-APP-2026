import express from 'express'
import { auth } from '../middleware/authorisation.js'

const router = express.Router()

/**
 * Makes sure a cohort-type conversation exists for the given cohort name,
 * and that the given user is a member of it. There's no separate endpoint
 * that provisions cohort conversations - they're created the first time
 * someone from that cohort asks for their conversation list.
 */
const ensureCohortConversation = (db, cohortName, userId) => {
  return db('conversation')
    .select('conversation_id')
    .where({ type: 'cohort', name: cohortName })
    .first()
    .then(existing => {
      if (existing) return existing.conversation_id

      return db('conversation')
        .insert({ type: 'cohort', name: cohortName, created_by: userId })
        .then(([conversationId]) => conversationId)
    })
    .then(conversationId => {
      return db('conversation_member')
        .insert({ conversation_id: conversationId, user_id: userId })
        .onConflict(['conversation_id', 'user_id'])
        .ignore()
        .then(() => conversationId)
    })
}

/**
 * Lists every conversation (cohort, group, direct) the current user belongs
 * to.
 */
router.get('/', auth, (req, res, next) => {
  const userId = req.user_id
  const cohortStep = req.cohort ? ensureCohortConversation(req.db, req.cohort, userId) : Promise.resolve()

  cohortStep
    .then(() => {
      return req.db('conversation as c')
        .join('conversation_member as cm', 'cm.conversation_id', 'c.conversation_id')
        .select('c.conversation_id', 'c.type', 'c.name')
        .where('cm.user_id', userId)
    })
    .then(conversations => {
      // Also attach every member of each conversation (name + email), so the
      // client can work out who to display for a 'direct' chat, which has
      // no name of its own.
      const conversationIds = conversations.map(c => c.conversation_id)
      if (conversationIds.length === 0) return conversations

      return req.db('conversation_member as cm')
        .join('user as u', 'u.user_id', 'cm.user_id')
        .select('cm.conversation_id', 'u.name', 'u.email')
        .whereIn('cm.conversation_id', conversationIds)
        .then(memberRows => {
          const membersByConversation = {}
          memberRows.forEach(row => {
            if (!membersByConversation[row.conversation_id]) membersByConversation[row.conversation_id] = []
            membersByConversation[row.conversation_id].push({ name: row.name, email: row.email })
          })

          return conversations.map(c => ({
            ...c,
            members: membersByConversation[c.conversation_id] || [],
          }))
        })
    })
    .then(conversations => {
      res.json(conversations)
    })
    .catch(e => {
      console.log(e.message)
      res.status(500).json({ error: true })
    })
})

/**
 * Creates a new group or direct conversation with the given members.
 * (Cohort conversations are provisioned automatically via GET /, not here.)
 */
router.post('/', auth, (req, res, next) => {
  const { type, name, memberEmails } = req.body ?? {}

  if (type !== 'group' && type !== 'direct') {
    res.status(400).json({ error: true, message: "type must be 'group' or 'direct'" })
    return
  }

  if (!Array.isArray(memberEmails) || memberEmails.length === 0) {
    res.status(400).json({ error: true, message: 'memberEmails must be a non-empty array' })
    return
  }

  if (type === 'direct' && memberEmails.length !== 1) {
    res.status(400).json({ error: true, message: 'direct conversations need exactly one other member' })
    return
  }

  const creatorId = req.user_id
  let memberIds

  req.db('user').select('user_id').whereIn('email', memberEmails)
    .then(rows => {
      if (rows.length !== memberEmails.length) {
        throw new Error('One or more members were not found')
      }
      memberIds = [...new Set([creatorId, ...rows.map(r => r.user_id)])]

      if (type !== 'direct') return null

      // Reuse an existing direct conversation between these two users, if one exists
      return req.db('conversation as c')
        .join('conversation_member as cm', 'cm.conversation_id', 'c.conversation_id')
        .select('c.conversation_id')
        .where('c.type', 'direct')
        .whereIn('cm.user_id', memberIds)
        .groupBy('c.conversation_id')
        .havingRaw('COUNT(DISTINCT cm.user_id) = ?', [memberIds.length])
        .first()
    })
    .then(existing => {
      if (existing) {
        res.json({ conversationId: existing.conversation_id })
        return null
      }

      return req.db('conversation')
        .insert({ type, name: name || null, created_by: creatorId })
        .then(([conversationId]) => {
          return req.db('conversation_member')
            .insert(memberIds.map(user_id => ({ conversation_id: conversationId, user_id })))
            .then(() => conversationId)
        })
    })
    .then(conversationId => {
      if (conversationId) res.status(201).json({ conversationId })
    })
    .catch(e => {
      if (e.message === 'One or more members were not found') {
        res.status(400).json({ error: true, message: e.message })
      } else {
        console.log(e.message)
        res.status(500).json({ error: true })
      }
    })
})

export default router
