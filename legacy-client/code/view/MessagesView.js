import { escapeHtml } from '../util/dom.js';

/**
 * Shows every conversation the current user belongs to - their cohort's
 * group chat (created automatically server-side), any ad-hoc group chats,
 * and 1:1 direct messages - plus a small form for starting a new group or
 * direct chat.
 */
export default class MessagesView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  async mount() {
    const user = this.app.auth.currentUser;
    const conversations = await this.app.messages.listConversations();

    // "Start a new chat" form is always shown, regardless of whether the
    // user already has conversations.
    let html = `
      <h2>Messages</h2>
      <div class="card">
        <h3>Start New Chat</h3>
        <label>Type</label>
        <select id="msg-new-type">
          <option value="group">Group Chat</option>
          <option value="direct">Direct</option>
        </select>
        <label>Name (group chats only)</label>
        <input type="text" id="msg-new-name" placeholder="e.g. Weekend Planning" />
        <label>Member email(s) - comma separated</label>
        <input type="text" id="msg-new-members" placeholder="someone@email.com" />
        <button data-action="create-conversation">Start Chat</button>
      </div>
    `;

    if (conversations.length === 0) {
      html += '<p>No conversations yet.</p>';
      this.container.innerHTML = html;
      this._bindNewChatForm();
      return;
    }

    // Load every conversation's messages in parallel, then render each as
    // its own chat card.
    const sections = await Promise.all(conversations.map(async conversation => {
      const messages = await this.app.messages.listMessages(conversation.id);
      const title = conversation.displayName(user.email);

      return `
        <div class="card" data-conversation-id="${conversation.id}">
          <h3>${escapeHtml(title)}</h3>
          <div class="msg-list">
            ${messages.map(m => `<div class="msg"><strong>${escapeHtml(m.sender)}:</strong> ${escapeHtml(m.text)}</div>`).join('') || '<i>No messages.</i>'}
          </div>
          <div class="msg-input-row">
            <input type="text" data-conversation-input="${conversation.id}" placeholder="Type a message..." />
            <button data-action="send-message" data-id="${conversation.id}">Send</button>
          </div>
        </div>
      `;
    }));

    html += sections.join('');
    this.container.innerHTML = html;

    this._bindNewChatForm();

    this.container.querySelectorAll('[data-action="send-message"]').forEach(button => {
      button.addEventListener('click', () => this.sendMessage(Number(button.dataset.id)));
    });
  }

  _bindNewChatForm() {
    const createBtn = this.container.querySelector('[data-action="create-conversation"]');
    if (createBtn) createBtn.addEventListener('click', () => this.createConversation());
  }

  async createConversation() {
    const type = this.container.querySelector('#msg-new-type').value;
    const name = this.container.querySelector('#msg-new-name').value.trim();
    const membersRaw = this.container.querySelector('#msg-new-members').value.trim();
    const memberEmails = membersRaw.split(',').map(email => email.trim()).filter(Boolean);

    if (memberEmails.length === 0) { alert('Enter at least one member email.'); return; }
    if (type === 'direct' && memberEmails.length !== 1) { alert('Direct chats need exactly one other member.'); return; }

    try {
      await this.app.messages.createConversation(type, memberEmails, name || undefined);
      await this.mount();
    } catch (error) {
      alert(error.message || 'Could not start that chat.');
    }
  }

  async sendMessage(conversationId) {
    const input = this.container.querySelector(`[data-conversation-input="${conversationId}"]`);
    const text = input.value.trim();
    if (!text) return;

    await this.app.messages.send(conversationId, text);
    await this.mount();
  }
}
