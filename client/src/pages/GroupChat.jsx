import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatSidebar from '../components/ChatSidebar';
import ChatMessage from '../components/ChatMessage';
import { getUser } from '../services/auth';
import { getConversations, createConversation, getMessages, sendMessage } from '../services/messages';
import './GroupChat.css';

const TYPE_ICON = { cohort: '🌿', group: '💬', direct: '👤' };

export default function GroupChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [activeChat, setActiveChat] = useState(id || null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(() => {
    setListLoading(true);
    setListError('');
    getConversations()
      .then(data => setConversations(data))
      .catch(err => setListError(err.message || 'Failed to load chats.'))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (id && id !== String(activeChat)) setActiveChat(id);
  }, [id]);

  function selectChat(conversationId) {
    setActiveChat(conversationId);
    navigate(`/chat/${conversationId}`, { replace: true });
  }

  const loadMessages = useCallback(() => {
    if (!activeChat) return;
    setMessagesLoading(true);
    setMessagesError('');
    getMessages(activeChat)
      .then(data => setMessages(data))
      .catch(err => setMessagesError(err.message || 'Failed to load messages.'))
      .finally(() => setMessagesLoading(false));
  }, [activeChat]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const selectedChat = conversations.find(c => String(c.conversation_id) === String(activeChat));

  async function handleSend() {
    if (!input.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      await sendMessage(activeChat, input.trim());
      setInput('');
      loadMessages();
    } catch (err) {
      setMessagesError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend();
  }

  async function handleAddChat() {
    const name = window.prompt('Name this group chat:');
    if (!name || !name.trim()) return;

    const emailsRaw = window.prompt('Invite members by email (comma-separated):');
    if (!emailsRaw || !emailsRaw.trim()) return;

    const memberEmails = emailsRaw.split(',').map(e => e.trim()).filter(Boolean);
    if (memberEmails.length === 0) return;

    try {
      const { conversationId } = await createConversation({ type: 'group', name: name.trim(), memberEmails });
      loadConversations();
      selectChat(conversationId);
    } catch (err) {
      alert(err.message || 'Failed to create chat.');
    }
  }

  function groupLabel(conversation) {
    if (conversation.name) return conversation.name;
    const other = (conversation.members || []).find(m => m.email !== user?.email);
    return other?.name || 'Direct Message';
  }

  function membersLabel(conversation) {
    const count = conversation.members?.length || 0;
    return `Members: ${count}`;
  }

  return (
    <div className="gc-layout">
      <Sidebar />

      <div className="gc-main">
        {listLoading ? (
          <div className="gc-placeholder"><p>Loading chats…</p></div>
        ) : !selectedChat ? (
          <div className="gc-placeholder">
            <p>{listError || 'Select a group chat from the right to get started.'}</p>
          </div>
        ) : (
          <div className="gc-window">
            <div className="gc-group-header">
              <div className="gc-group-icon">{TYPE_ICON[selectedChat.type] || '💬'}</div>
              <div className="gc-group-info">
                <h2>{groupLabel(selectedChat)}</h2>
                <p>{membersLabel(selectedChat)}</p>
                <p>{(selectedChat.members || []).map(m => m.name).join(', ')}</p>
              </div>
            </div>

            <div className="gc-messages">
              {messagesLoading && <p className="gc-status">Loading messages…</p>}
              {!messagesLoading && messagesError && <p className="gc-status gc-status-error">{messagesError}</p>}
              {!messagesLoading && !messagesError && messages.length === 0 && (
                <p className="gc-status">No messages yet — say hello!</p>
              )}
              {!messagesLoading && messages.map(msg => (
                <ChatMessage
                  key={msg.message_id}
                  author={msg.sender}
                  text={msg.text}
                  time={new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  isOwn={msg.senderEmail === user?.email}
                />
              ))}
            </div>

            <div className="gc-input-row">
              <input
                className="gc-input"
                type="text"
                placeholder="New Message"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button className="gc-send-btn" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ChatSidebar
        conversations={conversations}
        activeChat={activeChat}
        onSelect={selectChat}
        onAddChat={handleAddChat}
        currentUserEmail={user?.email}
        loading={listLoading}
        error={listError}
      />
    </div>
  );
}
