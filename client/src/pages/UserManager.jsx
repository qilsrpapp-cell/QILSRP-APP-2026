import { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { getUsers } from '../services/users';
import { verifyUser, updateUser, deleteUser } from '../services/admin';
import { getUser } from '../services/auth';
import './UserManager.css';

const ROLES = ['student', 'ranger', 'admin'];
const STATUSES = ['Pending', 'Active'];

// Backend requires name/email/mobile/cohort/role all present on PUT /user/:email,
// so editing starts from the full row rather than just the changed field.
function emptyEditForm(user) {
  return {
    name: user.name || '',
    email: user.email || '',
    mobile: user.mobile || '',
    cohort: user.cohort || '',
    role: user.role || 'student',
  };
}

export default function UserManager() {
  const me = getUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [busyEmail, setBusyEmail] = useState(''); // email currently mid-action (verify/delete/save)
  const [actionError, setActionError] = useState('');

  const [editingEmail, setEditingEmail] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const filters = {};
    if (statusFilter) filters.status = statusFilter;
    if (cohortFilter.trim()) filters.cohort = cohortFilter.trim();
    if (roleFilter) filters.role = roleFilter;

    getUsers(filters)
      .then(setUsers)
      .catch(err => setError(err.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [statusFilter, cohortFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify(email) {
    setBusyEmail(email);
    setActionError('');
    try {
      await verifyUser(email);
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to verify user.');
    } finally {
      setBusyEmail('');
    }
  }

  async function handleDelete(email) {
    if (email === me?.email) {
      setActionError("You can't delete your own account from here.");
      return;
    }
    if (!window.confirm(`Delete the account for ${email}? This cannot be undone.`)) return;

    setBusyEmail(email);
    setActionError('');
    try {
      await deleteUser(email);
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to delete user.');
    } finally {
      setBusyEmail('');
    }
  }

  function startEdit(user) {
    setEditingEmail(user.email);
    setEditForm(emptyEditForm(user));
    setActionError('');
  }

  function cancelEdit() {
    setEditingEmail(null);
    setEditForm(null);
  }

  async function saveEdit(originalEmail) {
    setBusyEmail(originalEmail);
    setActionError('');
    try {
      await updateUser(originalEmail, editForm);
      cancelEdit();
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to update user.');
    } finally {
      setBusyEmail('');
    }
  }

  return (
    <div className="um-layout">
      <Sidebar />

      <div className="um-content">
        <div className="um-header">
          <h1>User Manager</h1>
          <p>Verify pending accounts, edit profiles, or remove users.</p>
        </div>

        <div className="um-card">
        <div className="um-filters">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by cohort"
            value={cohortFilter}
            onChange={e => setCohortFilter(e.target.value)}
          />
          <button className="um-refresh-btn" onClick={load}>Refresh</button>
        </div>

        {actionError && <p className="um-error">{actionError}</p>}

        <div className="um-table-wrap">
          {loading ? (
            <p className="um-status">Loading users…</p>
          ) : error ? (
            <p className="um-status um-status-error">{error}</p>
          ) : users.length === 0 ? (
            <p className="um-status">No users match these filters.</p>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Cohort</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isEditing = editingEmail === user.email;
                  const isBusy = busyEmail === user.email;
                  return (
                    <tr key={user.email}>
                      {isEditing ? (
                        <>
                          <td><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                          <td><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></td>
                          <td><input value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} /></td>
                          <td><input value={editForm.cohort} onChange={e => setEditForm({ ...editForm, cohort: e.target.value })} /></td>
                          <td>
                            <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td>{user.status || '—'}</td>
                          <td>{user.created || '—'}</td>
                          <td className="um-actions">
                            <button className="um-save-btn" disabled={isBusy} onClick={() => saveEdit(user.email)}>
                              {isBusy ? 'Saving…' : 'Save'}
                            </button>
                            <button className="um-cancel-btn" disabled={isBusy} onClick={cancelEdit}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.mobile || '—'}</td>
                          <td>{user.cohort || '—'}</td>
                          <td className="um-role-cell">{user.role}</td>
                          <td>
                            <span className={`um-status-pill ${user.status === 'Active' ? 'um-status-active' : 'um-status-pending'}`}>
                              {user.status || '—'}
                            </span>
                          </td>
                          <td>{user.created || '—'}</td>
                          <td className="um-actions">
                            {user.status === 'Pending' && (
                              <button className="um-verify-btn" disabled={isBusy} onClick={() => handleVerify(user.email)}>
                                {isBusy ? 'Verifying…' : 'Verify'}
                              </button>
                            )}
                            <button className="um-edit-btn" disabled={isBusy} onClick={() => startEdit(user)}>Edit</button>
                            <button className="um-delete-btn" disabled={isBusy} onClick={() => handleDelete(user.email)}>
                              {isBusy ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
