import './ChatSidebar.css';

// Direct chats have no stored `name`, so fall back to the other member's name
function displayName(conversation, currentUserEmail) {
  if (conversation.name) return conversation.name;
  const other = (conversation.members || []).find(m => m.email !== currentUserEmail);
  return other?.name || 'Direct Message';
}

export default function ChatSidebar({ conversations, activeChat, onSelect, onAddChat, currentUserEmail, loading, error }) {
  return (
    <div className="chat-sidebar">
      <h2>My Group Chats</h2>
      <div className="chat-sidebar-list">
        {loading && <p className="chat-sidebar-status">Loading chats…</p>}
        {!loading && error && <p className="chat-sidebar-status chat-sidebar-error">{error}</p>}
        {!loading && !error && conversations.length === 0 && (
          <p className="chat-sidebar-status">No chats yet.</p>
        )}
        {!loading && !error && conversations.map(conversation => (
          <button
            key={conversation.conversation_id}
            className={`chat-sidebar-btn ${activeChat === conversation.conversation_id ? 'active' : ''}`}
            onClick={() => onSelect(conversation.conversation_id)}
          >
            {displayName(conversation, currentUserEmail)}
          </button>
        ))}
      </div>
      <button className="chat-sidebar-add" onClick={onAddChat}>+ Add New Chat</button>
    </div>
  );
}
