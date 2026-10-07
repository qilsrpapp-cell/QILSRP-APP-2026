import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  const target = isAuthenticated() ? '/dashboard' : '/login';

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <h1>404</h1>
        <p>That page doesn't exist.</p>
        <button onClick={() => navigate(target)}>
          {isAuthenticated() ? 'Back to Dashboard' : 'Back to Login'}
        </button>
      </div>
    </div>
  );
}
