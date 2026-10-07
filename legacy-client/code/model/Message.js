/**
 * A single chat message, as returned by GET/POST
 * /conversation/:conversationId/messages on the server. The constructor
 * accepts the raw snake_case row shape the server sends back and maps it
 * onto friendlier camelCase properties for the rest of the client to use.
 */
export default class Message {
  constructor({ message_id, text, created_at, sender, senderEmail } = {}) {
    this.id = message_id;
    this.text = text;
    this.sentAt = created_at;
    // Display name of whoever sent the message (e.g. "Sarah Ranger").
    this.sender = sender;
    // Email of whoever sent it - used to tell "my own messages" apart from
    // everyone else's when rendering the chat.
    this.senderEmail = senderEmail;
  }
}
