import { authFetch } from './auth';
import { API_BASE } from '../config';

// Parses "h:mm AM/PM" into minutes for same-day sorting. All-day events sort first.
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 9999;
  let [, h, m, ap] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (/pm/i.test(ap) && h !== 12) h += 12;
  if (/am/i.test(ap) && h === 12) h = 0;
  return h * 60 + m;
}

// Local calendar date as yyyy-mm-dd (not toISOString, which shifts to UTC)
function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayTime(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

function buildDateTime(date, time) {
  return `${date} ${time || '00:00'}`;
}

function mapAPIEvent(e) {
  const [date, time] = e.datetime.split(' ');
  const hasTime = time && time !== '00:00:00';
  return {
    id: e.event_id,
    title: e.name,
    date,
    time: hasTime ? formatDisplayTime(time.slice(0, 5)) : null,
    description: e.description,
    location: e.location,
    confirmed: e.confirmed,
    cultural: false, // not provided by the API
  };
}

export async function getEvents() {
  const res = await authFetch(`${API_BASE}/event`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok)
    throw new Error(data.message || 'Failed to load events.');

  return data.map(mapAPIEvent);
}

export async function getEventsForDate(isoDate) {
  const events = await getEvents();
  return events.filter(e => e.date === isoDate);
}

export async function getUpcomingEvents(limit = 5) {
  const todayIso = toIsoDate(new Date());
  const events = await getEvents();
  return events
    .filter(e => e.date >= todayIso)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    })
    .slice(0, limit);
}

export async function getEventMembers(id) {
  const res = await authFetch(`${API_BASE}/event/${id}/members`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load event members.');
  return data;
}

export async function addEventMembers(id, userIds) {
  const res = await authFetch(`${API_BASE}/event/${id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userIds),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to assign members to event.');
  return data;
}

export async function removeEventMembers(id, userIds) {
  const res = await authFetch(`${API_BASE}/event/${id}/members`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userIds),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to remove members from event.');
  return data;
}

function extractEventId(message) {
  const match = message?.match(/ID (\d+)/i);
  return match ? Number(match[1]) : null;
}

export async function addEvent({ name, date, time, location, description }) {
  const res = await authFetch(`${API_BASE}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      datetime: buildDateTime(date, time),
      location,
      description,
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || 'Failed to Create event.');

  return { ...data, eventId: extractEventId(data.message) };
}

export async function updateEvent(id, { name, date, time, location, description }) {
  const res = await authFetch(`${API_BASE}/event/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      datetime: buildDateTime(date, time),
      location,
      description,
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || 'Failed to update event.');

  return data;
}

export async function deleteEvent(id) {
  const res = await authFetch(`${API_BASE}/event/${id}`, {
    method: 'DELETE',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || 'Failed to delete event.');

  return data;
}
