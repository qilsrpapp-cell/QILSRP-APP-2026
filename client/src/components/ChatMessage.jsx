import './ChatMessage.css';

export default function ChatMessage({ author, avatar, text, time, isOwn }) {
  return (
    <div className={`chat-msg ${isOwn ? 'own' : ''}`}>
      {avatar ? (
        <img className="chat-msg-avatar-img" src={avatar} alt={author} />
      ) : (
        <div className="chat-msg-avatar">👤</div>
      )}
      <div className="chat-msg-body">
        <div className="chat-msg-bubble">{text}</div>
        <div className="chat-msg-meta">{author} · {time}</div>
      </div>
    </div>
  );
}