import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  getEvents, getUpcomingEvents, addEvent, updateEvent, deleteEvent,
  getEventMembers, addEventMembers, removeEventMembers,
} from '../services/events';
import { getUsers } from '../services/users';
import './Calendar.css';

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const VIEW_MODE_KEY = 'qilsrp.calendarViewMode';
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROLE_OPTIONS = ['ranger', 'student', 'admin'];

function formatHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// Local calendar date as yyyy-mm-dd (not toISOString, which shifts to UTC)
function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatEventDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function to24HourTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '';
  let [, h, m, ap] = match;
  h = parseInt(h, 10);
  if (/pm/i.test(ap) && h !== 12) h += 12;
  if (/am/i.test(ap) && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

// Monday-start grid of cells for the month, padded to 6 full rows
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length < 42) cells.push(null);

  return cells;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatWeekRangeLabel(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

  if (sameMonth) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  if (sameYear) {
    return `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()].slice(0, 3)} ${weekStart.getFullYear()} – ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
}

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

// Returns the hour (0-23) for an event's time, or null if all-day
function getEventHour(timeStr) {
  if (!timeStr) return null;
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes < 0) return null;
  return Math.floor(minutes / 60);
}

export default function CalendarPage() {
  const today = new Date();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_KEY) || 'month');
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dayAgenda, setDayAgenda] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [culturalOnly, setCulturalOnly] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const notifRef = useRef(null);
  const datePickerRef = useRef(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({name:'', date: toIsoDate(viewDate), time:'', description:'', location:'' });
  const [eventFormError, setEventFormError] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState(new Set());

  async function loadUsers() {
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch {
      setAllUsers([]);
    }
  }

  function idsForGroup(field, value) {
    return allUsers.filter(u => u[field] === value).map(u => u.user_id);
  }

  function isGroupSelected(field, value) {
    const ids = idsForGroup(field, value);
    return ids.length > 0 && ids.every(id => selectedMemberIds.has(id));
  }

  function toggleGroup(field, value) {
    const ids = idsForGroup(field, value);
    if (ids.length === 0) return;
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }

  function addMember(userId) {
    setSelectedMemberIds(prev => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }

  function removeMember(userId) {
    setSelectedMemberIds(prev => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  async function syncEventMembers(eventId) {
    const toAdd = [...selectedMemberIds].filter(id => !existingMemberIds.has(id));
    const toRemove = [...existingMemberIds].filter(id => !selectedMemberIds.has(id));
    if (toAdd.length > 0) await addEventMembers(eventId, toAdd);
    if (toRemove.length > 0) await removeEventMembers(eventId, toRemove);
  }

  const cohortOptions = useMemo(
    () => [...new Set(allUsers.map(u => u.cohort).filter(Boolean))],
    [allUsers]
  );

  const roleOptions = useMemo(
    () => [...new Set([...ROLE_OPTIONS, ...allUsers.map(u => u.role).filter(Boolean)])],
    [allUsers]
  );

  const searchResults = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return [];
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [allUsers, memberSearch]);

  const assignedUsers = useMemo(
    () => allUsers.filter(u => selectedMemberIds.has(u.user_id)),
    [allUsers, selectedMemberIds]
  );

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError('');
    try {
      const [allEvents, upcoming] = await Promise.all([getEvents(), getUpcomingEvents(6)]);
      setEvents(allEvents);
      setUpcomingEvents(upcoming);
    } catch (error) {
      setEventsError(error.message);
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, []);

  const [lastSelectedEvent, setLastSelectedEvent] = useState(selectedEvent);
  if (selectedEvent != lastSelectedEvent) {
    setLastSelectedEvent(selectedEvent);
    setConfirmingDelete(false);
  }

  const monthGrid = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );
  const weekStart = useMemo(() => getWeekStart(viewDate), [viewDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const pickerGrid = useMemo(
    () => buildMonthGrid(pickerMonth.getFullYear(), pickerMonth.getMonth()),
    [pickerMonth]
  );

  const searchTerm = search.trim().toLowerCase();

  function matchesFilters(ev) {
    if (culturalOnly && !ev.cultural) return false;
    if (searchTerm && !ev.title.toLowerCase().includes(searchTerm)) return false;
    return true;
  }

  const visibleUpcoming = useMemo(
    () => upcomingEvents.filter(matchesFilters),
    [upcomingEvents, culturalOnly, searchTerm]
  );

  const periodEventCount = useMemo(() => {
    if (viewMode === 'month') {
      const y = viewDate.getFullYear(), m = viewDate.getMonth();
      return events.filter(e => {
        const d = new Date(`${e.date}T00:00:00`);
        return d.getFullYear() === y && d.getMonth() === m;
      }).filter(matchesFilters).length;
    }
    if (viewMode === 'week') {
      const startIso = toIsoDate(weekStart);
      const endIso = toIsoDate(weekDays[6]);
      return events.filter(e => e.date >= startIso && e.date <= endIso).filter(matchesFilters).length;
    }
    const iso = toIsoDate(viewDate);
    return events.filter(e => e.date === iso).filter(matchesFilters).length;
  }, [events, viewDate, viewMode, weekStart, weekDays, culturalOnly, searchTerm]);

  const periodCountLabel = viewMode === 'month'
    ? `${periodEventCount} event${periodEventCount === 1 ? '' : 's'} this month`
    : viewMode === 'week'
      ? `${periodEventCount} event${periodEventCount === 1 ? '' : 's'} this week`
      : `${periodEventCount} event${periodEventCount === 1 ? '' : 's'} today`;

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Arrow keys switch period, 'T' jumps to today, unless typing or a modal is open
  useEffect(() => {
    function handleKeyDown(e) {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (typing || selectedEvent || dayAgenda) return;

      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key.toLowerCase() === 't') goToToday();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, dayAgenda, viewMode]);



  function goToPrev() {
    setViewDate(d => {
      const nd = new Date(d);
      if (viewMode === 'month') nd.setMonth(nd.getMonth() - 1);
      else if (viewMode === 'week') nd.setDate(nd.getDate() - 7);
      else nd.setDate(nd.getDate() - 1);
      return nd;
    });
  }

  function goToNext() {
    setViewDate(d => {
      const nd = new Date(d);
      if (viewMode === 'month') nd.setMonth(nd.getMonth() + 1);
      else if (viewMode === 'week') nd.setDate(nd.getDate() + 7);
      else nd.setDate(nd.getDate() + 1);
      return nd;
    });
  }

  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  function toggleDatePicker() {
    setPickerMonth(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
    setDatePickerOpen(o => !o);
  }

  function selectPickerDate(date) {
    setViewDate(date);
    setDatePickerOpen(false);
  }

  function eventsFor(date) {
    if (!date) return [];
    const iso = toIsoDate(date);
    return events
      .filter(e => e.date === iso)
      .filter(matchesFilters)
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }

  function openCreateEventModal() {
    setEditingEventId(null);
    setEventForm({ name: '', date: toIsoDate(viewDate), time: '', description: '', location: '' });
    setEventFormError('');
    setMemberSearch('');
    setSelectedMemberIds(new Set());
    setExistingMemberIds(new Set());
    setShowEventModal(true);
    loadUsers();
  }

  async function openEditEventModal(event) {
    setEditingEventId(event.id);
    setEventForm({
      name: event.title,
      date: event.date,
      time: event.time ? to24HourTime(event.time) : '',
      description: event.description,
      location: event.location
    });
    setEventFormError('');
    setMemberSearch('');
    setSelectedEvent(null);
    setShowEventModal(true);
    loadUsers();

    try {
      const members = await getEventMembers(event.id);
      const ids = new Set(members.map(m => m.user_id));
      setSelectedMemberIds(ids);
      setExistingMemberIds(ids);
    } catch {
      setSelectedMemberIds(new Set());
      setExistingMemberIds(new Set());
    }
  }

  function closeEventModal() {
    if (savingEvent) return;
    setShowEventModal(false);
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target;
    setEventForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmitEvent(event) {
    event.preventDefault();
    setEventFormError('');

    const { name, date, time, description, location } = eventForm;
    if (!name.trim() || !date || !location.trim() || !description.trim()) {
      setEventFormError('Please fill in all required fields.');
      return;
    }

    setSavingEvent(true);
    try {
      const payload = { name: name.trim(), date, time, location: location.trim(), description: description.trim() };
      if (editingEventId) {
        await updateEvent(editingEventId, payload);
        await syncEventMembers(editingEventId);
      } else {
        const created = await addEvent(payload);
        if (created.eventId && selectedMemberIds.size > 0) {
          await addEventMembers(created.eventId, [...selectedMemberIds]);
        }
      }
      await loadEvents();
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      setEventFormError(error.message || 'Failed to save event.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(id) {
    setDeletingEvent(true);
    try {
      await deleteEvent(id);
      await loadEvents();
      setSelectedEvent(null);
      setConfirmingDelete(false);
    } catch (error) {
      alert(error.message || 'Failed to delete event.');
    } finally {
      setDeletingEvent(false);
    }
  }

  const todayIso = toIsoDate(today);
  const MAX_VISIBLE_PILLS = 2;

  const headerLabel = viewMode === 'month'
    ? `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
    : viewMode === 'week'
      ? formatWeekRangeLabel(weekStart)
      : formatEventDate(toIsoDate(viewDate));

  const isAtToday = viewMode === 'day'
    ? toIsoDate(viewDate) === todayIso
    : viewMode === 'week'
      ? toIsoDate(weekStart) === toIsoDate(getWeekStart(today))
      : viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

  const dayAllEvents = viewMode === 'day' ? eventsFor(viewDate) : [];
  const dayAllDayEvents = dayAllEvents.filter(e => !e.time);
  const dayTimedEvents = dayAllEvents.filter(e => e.time);

  return (
    <div className="cal-layout">
      <Sidebar />

      <div className="cal-content">

        <div className="cal-topbar">
          <div className="cal-topbar-title">
            <h1>Calendar</h1>
            <p>Keep track of ranger events, training and important dates.</p>
          </div>

          <div className="cal-topbar-right" ref={notifRef}>
            <input
              className="cal-search"
              type="text"
              placeholder="Search events"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <button className="cal-notif-btn" onClick={() => setNotifOpen(o => !o)}>
              🔔
              {upcomingEvents.length > 0 && (
                <span className="cal-notif-badge">{upcomingEvents.length}</span>
              )}
            </button>

            {notifOpen && (
              <div className="cal-notif-dropdown">
                <div className="cal-notif-dropdown-header">Upcoming events</div>
                {upcomingEvents.length === 0 ? (
                  <p className="cal-notif-empty">No upcoming events.</p>
                ) : (
                  upcomingEvents.map(ev => (
                    <button
                      key={ev.id}
                      className="cal-notif-item"
                      onClick={() => { setSelectedEvent(ev); setNotifOpen(false); }}
                    >
                      <span className={`cal-notif-dot ${ev.cultural ? 'cultural' : ''}`} />
                      <span>
                        <span className="cal-notif-item-title">{ev.title}</span>
                        <span className="cal-notif-item-date">{formatEventDate(ev.date)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <button
              className="cal-add-btn"
              onClick={openCreateEventModal}
            >
              + Add Event
            </button>
          </div>
        </div>

        <div className="cal-body">

          <div className="cal-main">
            <div className="cal-card cal-main-card">

              <div className="cal-nav">
                <div className="cal-nav-side" />

                <div className="cal-nav-center">
                  <button className="cal-nav-arrow" onClick={goToPrev} aria-label="Previous">‹</button>
                  <h2>{headerLabel}</h2>
                  <button className="cal-nav-arrow" onClick={goToNext} aria-label="Next">›</button>
                </div>

                <div className="cal-nav-side cal-nav-controls">
                  <div className="cal-view-toggle">
                    {['day', 'week', 'month'].map(mode => (
                      <button
                        key={mode}
                        className={`cal-view-btn ${viewMode === mode ? 'active' : ''}`}
                        onClick={() => setViewMode(mode)}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="cal-datepicker-wrapper" ref={datePickerRef}>
                    <button className="cal-jump-date" onClick={toggleDatePicker}>
                      {viewDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </button>

                    {datePickerOpen && (
                      <div className="cal-datepicker-popover">
                        <div className="cal-datepicker-nav">
                          <button
                            className="cal-nav-arrow"
                            onClick={() => setPickerMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            aria-label="Previous month"
                          >
                            ‹
                          </button>
                          <span>{MONTH_LABELS[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}</span>
                          <button
                            className="cal-nav-arrow"
                            onClick={() => setPickerMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            aria-label="Next month"
                          >
                            ›
                          </button>
                        </div>

                        <div className="cal-datepicker-grid">
                          {WEEKDAY_LABELS.map(label => (
                            <div key={label} className="cal-datepicker-weekday">{label.slice(0, 1)}</div>
                          ))}
                          {pickerGrid.map((date, i) => {
                            if (!date) return <div key={i} className="cal-datepicker-day-blank" />;
                            const iso = toIsoDate(date);
                            const isSelected = iso === toIsoDate(viewDate);
                            const isToday = iso === todayIso;
                            return (
                              <button
                                key={i}
                                className={`cal-datepicker-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
                                onClick={() => selectPickerDate(date)}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          className="cal-datepicker-today"
                          onClick={() => selectPickerDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}
                        >
                          Jump to today
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="cal-today-btn" onClick={goToToday} disabled={isAtToday}>
                    Today
                  </button>
                </div>
              </div>

              {eventsLoading && <p className="cal-loading-state">Loading events...</p>}
              {!eventsLoading && eventsError && <p className="cal-error-state">{eventsError}</p>}

              {/* ---- Month view ---- */}
              {viewMode === 'month' && (
                <div className="cal-grid">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div key={label} className={`cal-weekday-label ${i >= 5 ? 'weekend' : ''}`}>{label}</div>
                  ))}

                  {monthGrid.map((date, i) => {
                    if (!date) return <div key={i} className="cal-cell cal-cell-blank" />;

                    const iso = toIsoDate(date);
                    const dayEvents = eventsFor(date);
                    const visible = dayEvents.slice(0, MAX_VISIBLE_PILLS);
                    const overflow = dayEvents.length - visible.length;
                    const isToday = iso === todayIso;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <div key={i} className={`cal-cell ${isToday ? 'cal-cell-today' : ''} ${isWeekend ? 'cal-cell-weekend' : ''}`}>
                        <span className="cal-cell-daynum">
                          {isToday ? <span className="cal-today-badge">{date.getDate()}</span> : date.getDate()}
                        </span>
                        <div className="cal-cell-events">
                          {visible.map(ev => (
                            <button
                              key={ev.id}
                              className={`cal-event-pill ${ev.cultural ? 'cultural' : ''}`}
                              onClick={() => setSelectedEvent(ev)}
                            >
                              {ev.time && <span className="cal-event-pill-time">{ev.time}</span>}
                              <span className="cal-event-pill-title">{ev.title}</span>
                            </button>
                          ))}
                          {overflow > 0 && (
                            <button className="cal-event-more" onClick={() => setDayAgenda(iso)}>
                              +{overflow} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ---- Week view ---- */}
              {viewMode === 'week' && (
                <div className="cal-week-timegrid">
                  <div className="cal-week-scrollarea">
                    <div className="cal-week-innergrid">

                      <div className="cal-week-corner" style={{ gridRow: 1, gridColumn: 1 }} />
                      {weekDays.map((date, i) => {
                        const iso = toIsoDate(date);
                        const isToday = iso === todayIso;
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <div
                            key={`head-${iso}`}
                            className={`cal-week-header-col ${isWeekend ? 'weekend' : ''}`}
                            style={{ gridRow: 1, gridColumn: i + 2 }}
                          >
                            <span className="cal-week-col-weekday">{WEEKDAY_LABELS[(date.getDay() + 6) % 7].slice(0, 3)}</span>
                            {isToday ? <span className="cal-today-badge">{date.getDate()}</span> : <span className="cal-cell-daynum">{date.getDate()}</span>}
                          </div>
                        );
                      })}

                      <div className="cal-week-allday-label" style={{ gridRow: 2, gridColumn: 1 }}>All day</div>
                      {weekDays.map((date, i) => {
                        const iso = toIsoDate(date);
                        const allDayEvents = eventsFor(date).filter(e => !e.time);
                        return (
                          <div key={`allday-${iso}`} className="cal-week-allday-col" style={{ gridRow: 2, gridColumn: i + 2 }}>
                            {allDayEvents.map(ev => (
                              <button
                                key={ev.id}
                                className={`cal-event-pill ${ev.cultural ? 'cultural' : ''}`}
                                onClick={() => setSelectedEvent(ev)}
                              >
                                <span className="cal-event-pill-title">{ev.title}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}

                      {HOURS.map((hour, hIdx) => (
                        <Fragment key={hour}>
                          <div className="cal-hour-label" style={{ gridRow: hIdx + 3, gridColumn: 1 }}>
                            {formatHourLabel(hour)}
                          </div>
                          {weekDays.map((date, i) => {
                            const iso = toIsoDate(date);
                            const hourEvents = eventsFor(date).filter(e => getEventHour(e.time) === hour);
                            return (
                              <div
                                key={`${hour}-${iso}`}
                                className="cal-week-hour-cell"
                                style={{ gridRow: hIdx + 3, gridColumn: i + 2 }}
                              >
                                {hourEvents.map(ev => (
                                  <button
                                    key={ev.id}
                                    className={`cal-event-pill ${ev.cultural ? 'cultural' : ''}`}
                                    onClick={() => setSelectedEvent(ev)}
                                  >
                                    <span className="cal-event-pill-time">{ev.time}</span>
                                    <span className="cal-event-pill-title">{ev.title}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </Fragment>
                      ))}

                    </div>
                  </div>
                </div>
              )}

              {/* ---- Day view ---- */}
              {viewMode === 'day' && (
                <div className="cal-week-timegrid">
                  <div className="cal-week-scrollarea">
                    <div className="cal-day-innergrid">

                      <div className="cal-day-allday-label" style={{ gridRow: 1, gridColumn: 1 }}>All day</div>
                      <div className="cal-day-allday-col" style={{ gridRow: 1, gridColumn: 2 }}>
                        {dayAllDayEvents.length === 0 ? (
                          <span className="cal-day-allday-empty">No all-day events</span>
                        ) : (
                          dayAllDayEvents.map(ev => (
                            <button
                              key={ev.id}
                              className={`cal-event-pill ${ev.cultural ? 'cultural' : ''}`}
                              onClick={() => setSelectedEvent(ev)}
                            >
                              <span className="cal-event-pill-title">{ev.title}</span>
                            </button>
                          ))
                        )}
                      </div>

                      {HOURS.map((hour, hIdx) => {
                        const hourEvents = dayTimedEvents.filter(ev => getEventHour(ev.time) === hour);
                        return (
                          <Fragment key={hour}>
                            <div className="cal-hour-label" style={{ gridRow: hIdx + 2, gridColumn: 1 }}>
                              {formatHourLabel(hour)}
                            </div>
                            <div className="cal-day-hour-cell" style={{ gridRow: hIdx + 2, gridColumn: 2 }}>
                              {hourEvents.map(ev => (
                                <button
                                  key={ev.id}
                                  className={`cal-day-event-card ${ev.cultural ? 'cultural' : ''}`}
                                  onClick={() => setSelectedEvent(ev)}
                                >
                                  <span className="cal-day-event-time">{ev.time}</span>
                                  <span className="cal-day-event-title">{ev.title}</span>
                                  {ev.description && (
                                    <span className="cal-day-event-desc">{ev.description}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </Fragment>
                        );
                      })}

                    </div>
                  </div>
                </div>
              )}

              <div className="cal-legend">
                <span className="cal-legend-item">
                  <span className="cal-legend-dot" /> Ranger event
                </span>
                <span className="cal-legend-item">
                  <span className="cal-legend-dot cultural" /> Culturally significant date
                </span>
                <label className="cal-legend-checkbox">
                  <input
                    type="checkbox"
                    checked={culturalOnly}
                    onChange={e => setCulturalOnly(e.target.checked)}
                  />
                  Cultural dates only
                </label>
                <span className="cal-legend-hint">← / → to move · T for today</span>
              </div>

            </div>
          </div>

          <div className="cal-side">
            <div className="cal-card cal-upcoming-card">
              <h2>Upcoming Events</h2>
              <p className="cal-period-count">{periodCountLabel}</p>
              {visibleUpcoming.length === 0 ? (
                <p className="cal-empty-state">
                  {culturalOnly ? 'No upcoming culturally significant dates.' : 'No upcoming events scheduled. New events will appear here once added.'}
                </p>
              ) : (
                <div className="cal-upcoming-list">
                  {visibleUpcoming.map(ev => (
                    <button
                      key={ev.id}
                      className="cal-upcoming-item"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <div className={`cal-upcoming-datebox ${ev.cultural ? 'cultural' : ''}`}>
                        <span className="cal-upcoming-daynum">{new Date(`${ev.date}T00:00:00`).getDate()}</span>
                        <span className="cal-upcoming-monthabbr">
                          {MONTH_LABELS[new Date(`${ev.date}T00:00:00`).getMonth()].slice(0, 3)}
                        </span>
                      </div>
                      <div className="cal-upcoming-info">
                        <span className="cal-upcoming-title">{ev.title}</span>
                        <span className="cal-upcoming-meta">
                          {formatShortDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {selectedEvent && (
        <div className="cal-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h2>{selectedEvent.title}</h2>
              <div className="cal-modal-header-actions">
                <button className="cal-modal-edit-btn" onClick={() => openEditEventModal(selectedEvent)} disabled={confirmingDelete}>
                  Edit
                </button>
                <button
                  className="cal-modal-delete-btn"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={confirmingDelete || deletingEvent}
                >
                  Delete
                </button>
                <button className="cal-modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
              </div>
            </div>

            <div className="cal-modal-body">
              {confirmingDelete && (
               <div className="cal-delete-confirm">
                 <p>Delete <strong>{selectedEvent.title}</strong>? This can't be undone.</p>
                 <div className="cal-delete-confirm-actions">
                   <button
                     type="button"
                     className="cal-delete-confirm-cancel"
                     onClick={() => setConfirmingDelete(false)}
                     disabled={deletingEvent}
                   >
                     Cancel
                   </button>
                   <button
                     type="button"
                     className="cal-delete-confirm-yes"
                     onClick={() => handleDeleteEvent(selectedEvent.id)}
                     disabled={deletingEvent}
                   >
                     {deletingEvent ? 'Deleting…' : 'Yes, delete'}
                   </button>
                 </div>
               </div>
             )}
              {selectedEvent.cultural && (
                <div className="cal-cultural-notice">
                  This is a culturally significant date.
                </div>
              )}
              <p className="cal-modal-date">
                {formatEventDate(selectedEvent.date)}
                {selectedEvent.time ? ` · ${selectedEvent.time}` : ''}
              </p>
              {selectedEvent.location && (
                <p className="cal-modal-location">📍 {selectedEvent.location}</p>
              )}
              {selectedEvent.description && (
                <p className="cal-modal-desc">{selectedEvent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {dayAgenda && (
        <div className="cal-modal-overlay" onClick={() => setDayAgenda(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h2>{formatEventDate(dayAgenda)}</h2>
              <button className="cal-modal-close" onClick={() => setDayAgenda(null)}>✕</button>
            </div>
            <div className="cal-modal-body">
              <div className="cal-agenda-list">
                {eventsFor(new Date(`${dayAgenda}T00:00:00`)).map(ev => (
                  <button
                    key={ev.id}
                    className="cal-agenda-item"
                    onClick={() => { setSelectedEvent(ev); setDayAgenda(null); }}
                  >
                    <span className={`cal-notif-dot ${ev.cultural ? 'cultural' : ''}`} />
                    <span>
                      <span className="cal-notif-item-title">{ev.title}</span>
                      {ev.time && <span className="cal-notif-item-date">{ev.time}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="cal-modal-overlay" onClick={closeEventModal}>
          <div className="cal-modal cal-modal-form" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h2>{editingEventId ? 'Edit Event' : 'Create Event'}</h2>
              <button className="cal-modal-close" onClick={closeEventModal}>✕</button>
            </div>

            <form className="cal-event-form" onSubmit={handleSubmitEvent}>
              <div className="cal-form-field">
                <label htmlFor="event-name">Event Name *</label>
                <input
                  id="event-name"
                  type="text"
                  name="name"
                  value={eventForm.name}
                  onChange={handleEventFormChange}
                  placeholder="e.g. Ranger Training"
                  disabled={savingEvent}
                />
              </div>

              <div className="cal-form-row">
                <div className="cal-form-field">
                  <label htmlFor="event-date">Date *</label>
                  <input
                    id="event-date"
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleEventFormChange}
                    disabled={savingEvent}
                  />
                </div>
                <div className="cal-form-field">
                  <label htmlFor="event-time">Time</label>
                  <input
                    id="event-time"
                    type="time"
                    name="time"
                    value={eventForm.time}
                    onChange={handleEventFormChange}
                    disabled={savingEvent}
                  />
                </div>
              </div>

              <div className="cal-form-field">
                <label htmlFor="event-location">Location *</label>
                <input
                  id="event-location"
                  type="text"
                  name="location"
                  value={eventForm.location}
                  onChange={handleEventFormChange}
                  placeholder="e.g. Ranger Training Centre"
                  disabled={savingEvent}
                />
              </div>

              <div className="cal-form-field">
                <label htmlFor="event-description">Description *</label>
                <textarea
                  id="event-description"
                  name="description"
                  rows={3}
                  value={eventForm.description}
                  onChange={handleEventFormChange}
                  placeholder="Provide a brief description of the event."
                  disabled={savingEvent}
                />
              </div>

              <div className="cal-form-field">
                <label>Assign To</label>

                <div className="cal-assign-groups">
                  <div className="cal-assign-group">
                    <span className="cal-assign-group-title">Whole cohort</span>
                    {cohortOptions.length === 0 ? (
                      <p className="cal-assign-empty">No cohorts loaded.</p>
                    ) : (
                      cohortOptions.map(c => (
                        <label key={c} className="cal-assign-check">
                          <input
                            type="checkbox"
                            checked={isGroupSelected('cohort', c)}
                            onChange={() => toggleGroup('cohort', c)}
                            disabled={savingEvent}
                          />
                          {c}
                        </label>
                      ))
                    )}
                  </div>
                  <div className="cal-assign-group">
                    <span className="cal-assign-group-title">Whole role</span>
                    {roleOptions.map(r => (
                      <label key={r} className="cal-assign-check">
                        <input
                          type="checkbox"
                          checked={isGroupSelected('role', r)}
                          onChange={() => toggleGroup('role', r)}
                          disabled={savingEvent || idsForGroup('role', r).length === 0}
                        />
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  className="cal-assign-search"
                  placeholder="Search users by name or email"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  disabled={savingEvent}
                />

                {memberSearch.trim() && (
                  <div className="cal-assign-results">
                    {searchResults.length === 0 ? (
                      <p className="cal-assign-empty">No users found.</p>
                    ) : (
                      searchResults.map(u => {
                        const alreadyAdded = selectedMemberIds.has(u.user_id);
                        return (
                          <div key={u.user_id} className="cal-assign-item">
                            <span className="cal-assign-name">{u.name}</span>
                            <span className="cal-assign-meta">{u.role} · {u.cohort}</span>
                            <button
                              type="button"
                              className="cal-assign-add-btn"
                              onClick={() => addMember(u.user_id)}
                              disabled={savingEvent || alreadyAdded}
                            >
                              {alreadyAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <span className="cal-assign-group-title">Assigned users</span>
                <div className="cal-assign-list">
                  {assignedUsers.length === 0 ? (
                    <p className="cal-assign-empty">No users assigned yet. Search above to add people.</p>
                  ) : (
                    assignedUsers.map(u => (
                      <div key={u.user_id} className="cal-assign-item">
                        <span className="cal-assign-name">{u.name}</span>
                        <span className="cal-assign-meta">{u.role} · {u.cohort}</span>
                        <button
                          type="button"
                          className="cal-assign-remove-btn"
                          onClick={() => removeMember(u.user_id)}
                          disabled={savingEvent}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <p className="cal-assign-count">{selectedMemberIds.size} assigned</p>
              </div>

              {eventFormError && <p className="cal-form-error">{eventFormError}</p>}

              <button type="submit" className="cal-form-submit" disabled={savingEvent}>
                {savingEvent ? 'Saving…' : editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}