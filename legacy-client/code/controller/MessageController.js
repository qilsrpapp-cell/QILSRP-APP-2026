import Message from '../model/Message.js';
import Conversation from '../model/Conversation.js';

/**
 * Talks to the real /conversation endpoints on the server. Replaces the
 * earlier localStorage-backed version now that the server has proper
 * conversation / conversation_member / message tables.
 *
 * A "conversation" covers all three kinds of chat the app supports -
 * cohort group chats, ad-hoc group chats, and 1:1 direct messages - since
 * they all share the same tables server-side. That means this controller
 * only needs one set of methods to cover all three; the `type` on each
 * Conversation is what tells the UI which kind it's looking at.
 */
export default class MessageController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Lists every conversation the current user belongs to (cohort, group,
   * and direct, all mixed together). Calling this also causes the server
   * to auto-create the user's cohort conversation the first time, so
   * there's no separate "join my cohort's chat" step needed on the client.
   * @returns {Promise<Conversation[]>}
   */
  async listConversations() {
    const rows = await this.api.get('/conversation/', { auth: true });
    return rows.map(row => new Conversation(row));
  }

  /**
   * Starts a new group or direct conversation. The current user is added
   * as a member automatically by the server - only the *other* members
   * need to be passed in.
   * @param {'group'|'direct'} type
   * @param {string[]} memberEmails - the other people to include. Must be
   *   exactly one email for a 'direct' conversation.
   * @param {string} [name] - display name for group chats; ignored for
   *   direct chats.
   * @returns {Promise<number>} the id of the created conversation. For
   *   'direct' chats, this reuses an existing conversation between the
   *   same two people instead of creating a duplicate.
   */
  async createConversation(type, memberEmails, name) {
    const data = await this.api.post('/conversation/', { type, memberEmails, name }, { auth: true });
    return data.conversationId;
  }

  /**
   * Lists every message in a conversation, oldest first.
   * Throws an ApiError with status 403 if the current user isn't a member
   * of the conversation.
   * @param {number} conversationId
   * @returns {Promise<Message[]>}
   */
  async listMessages(conversationId) {
    const rows = await this.api.get(`/conversation/${conversationId}/messages`, { auth: true });
    return rows.map(row => new Message(row));
  }

  /**
   * Sends a message into a conversation. Unlike the old localStorage
   * version, the sender doesn't need to be passed in - the server works
   * out who's sending it from the caller's auth token.
   * @param {number} conversationId
   * @param {string} text
   */
  async send(conversationId, text) {
    return this.api.post(`/conversation/${conversationId}/messages`, { text }, { auth: true });
  }
}
