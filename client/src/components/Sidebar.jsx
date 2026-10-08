import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getUser } from '../services/auth';
import './Sidebar.css';
import { resolveAsset } from '../utils/assets';

// `built: true` items have a real route in App.jsx; the rest render disabled
const navItems = [
  { label: 'DASHBOARD',  path: '/dashboard',  icon: '/src/assets/icons/Dashboard.png',   built: true },
  { label: 'RESOURCES',  path: '/resources',  icon: '/src/assets/icons/Resources.png',   built: true },
  { label: 'GROUP CHAT', path: '/chat',        icon: '/src/assets/icons/Group Chat.png', built: true },
  { label: 'POSTS',      path: '/posts',       icon: '/src/assets/icons/Posts.png',       built: false },
  { label: 'CALENDAR',   path: '/calendar',   icon: '/src/assets/icons/Calendar.png',     built: true },
  { label: 'WORKSHOPS',  path: '/workshops',   icon: '/src/assets/icons/Workshops.png',   built: false },
  { label: 'DOWNLOADS',  path: '/downloads',   icon: '/src/assets/icons/Downloads.png',   built: false },
  { label: 'PROFILE',    path: '/profile',     icon: '/src/assets/icons/Profile.png',     built: true },
  { label: 'SETTINGS',   path: '/settings',    icon: '/src/assets/icons/Settings.png',    built: false },
  { label: 'HELP',       path: '/help',        icon: '/src/assets/icons/Help.png',        built: false },
];

// Admin-only — backend also gates /user GET/verify/edit/delete to admins
const adminNavItem = { label: 'USER MANAGER', path: '/admin/users', icon: '/src/assets/icons/Profile.png', built: true };

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = getUser();
  const [search, setSearch] = useState('');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleNavClick(item) {
    if (!item.built) return;
    navigate(item.path);
  }

  const allItems = user?.role === 'admin' ? [...navItems, adminNavItem] : navItems;

  const visibleItems = search.trim()
    ? allItems.filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : allItems;

  return (
    <div className="sidebar">
      <div className="sidebar-title">QILSRP</div>
      <input
        className="sidebar-search"
        type="text"
        placeholder="Search"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <button
            key={item.label}
            className={`sidebar-btn ${location.pathname.startsWith(item.path) ? 'active' : ''} ${!item.built ? 'sidebar-btn-disabled' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <img className="sidebar-btn-icon" src={resolveAsset(item.icon)} alt="" />
            <span className={!item.built ? 'sidebar-btn-wip' : ''}>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">{user.role}</span>
          </div>
        )}
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
        <img src={resolveAsset('/src/assets/qld-gov.png')} alt="Queensland Government" className="sidebar-footer-logo" />
      </div>
    </div>
  );
}