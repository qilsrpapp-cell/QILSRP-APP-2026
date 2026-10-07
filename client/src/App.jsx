import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import ResourceDetails from './pages/ResourceDetails';
import CalendarPage from './pages/Calendar';
import GroupChat from './pages/GroupChat';
import UserManager from './pages/UserManager';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { isAuthenticated, isAdmin } from './services/auth';

// Sends unauthenticated users to /login
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// Admin-only pages (User Manager) also require isAuthenticated first —
// an unauthenticated visit should land on /login, not /dashboard.
function AdminRoute({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return isAdmin() ? children : <Navigate to="/dashboard" replace />;
}

// Sends already-logged-in users straight to /dashboard
function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={ <PublicRoute><Login /></PublicRoute> } />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={ <ProtectedRoute><Dashboard /></ProtectedRoute> } />
        <Route path="/calendar" element={ <ProtectedRoute><CalendarPage /></ProtectedRoute> } />
        <Route path="/resources" element={ <ProtectedRoute><Resources /></ProtectedRoute> } />
        <Route path="/resources/:id" element={ <ProtectedRoute><ResourceDetails /></ProtectedRoute> } />
        <Route path="/chat" element={ <ProtectedRoute><GroupChat /></ProtectedRoute> } />
        <Route path="/chat/:id" element={ <ProtectedRoute><GroupChat /></ProtectedRoute> } />
        <Route path="/profile" element={ <ProtectedRoute><Profile /></ProtectedRoute> } />
        <Route path="/admin/users" element={ <AdminRoute><UserManager /></AdminRoute> } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}