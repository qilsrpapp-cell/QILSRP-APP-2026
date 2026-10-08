import { authFetch } from './auth';
import { API_BASE } from '../config';

export async function getConversations() {
  const res = await authFetch(`${API_BASE}/conversation`);
  const data = await res.json().catch(() => ([]));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load chats.');
  }

  return data;
}

export async function createConversation({ type, name, memberEmails }) {
  const res = await authFetch(`${API_BASE}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name, memberEmails }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to create chat.');
  }

  return data;
}

export async function getMessages(conversationId) {
  const res = await authFetch(`${API_BASE}/conversation/${conversationId}/messages`);
  const data = await res.json().catch(() => ([]));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load messages.');
  }

  return data;
}

export async function sendMessage(conversationId, text) {
  const res = await authFetch(`${API_BASE}/conversation/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to send message.');
  }

  return data;
}
