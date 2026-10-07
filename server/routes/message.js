import express from 'express'
import { auth } from '../middleware/authorisation.js'

const router = express.Router()

const isMember = (db, conversationId, userId) => {
  return db('conversation_member')
    .count('* as count')
    .where({ conversation_id: conversationId, user_id: userId })
    .first()
    .then(row => row.count > 0)
}

/**
 * Lists messages in a conversation, oldest first. The requester must be a
 * member of the conversation.
 */
router.get('/:conversationId/messages', auth, (req, res, next) => {
  const conversationId = req.params.conversationId
  const userId = req.user_id

  isMember(req.db, conversationId, userId)
    .then(member => {
      if (!member) throw new Error('Forbidden')

      return req.db('message as m')
        .join('user as u', 'u.user_id', 'm.sender_id')
        .select('m.message_id', 'm.text', 'm.created_at', 'u.name as sender', 'u.email as senderEmail')
        .where('m.conversation_id', conversationId)
        .orderBy('m.created_at', 'asc')
    })
    .then(messages => {
      res.json(messages)
    })
    .catch(e => {
      if (e.message === 'Forbidden') {
        res.status(403).json({ error: true, message: 'You are not a member of this conversation' })
      } else {
        console.log(e.message)
        res.status(500).json({ error: true })
      }
    })
})

/**
 * Sends a message into a conversation. The requester must be a member of
 * the conversation.
 */
router.post('/:conversationId/messages', auth, (req, res, next) => {
  const conversationId = req.params.conversationId
  const { text } = req.body ?? {}

  if (!text || !text.trim()) {
    res.status(400).json({ error: true, message: 'text is required' })
    return
  }

  const userId = req.user_id

  isMember(req.db, conversationId, userId)
    .then(member => {
      if (!member) throw new Error('Forbidden')

      return req.db('message').insert({
        conversation_id: conversationId,
        sender_id: userId,
        text: text.trim(),
      })
    })
    .then(() => {
      res.status(201).json({ message: 'Message sent' })
    })
    .catch(e => {
      if (e.message === 'Forbidden') {
        res.status(403).json({ error: true, message: 'You are not a member of this conversation' })
      } else {
        console.log(e.message)
        res.status(500).json({ error: true })
      }
    })
})

export default router
