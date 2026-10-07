import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import { login, getLoginLockStatus } from '../services/auth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(
    sessionStorage.getItem('qilsrp_notice_acknowledged') === 'true'
  );
  const navigate = useNavigate();

  function handleAcknowledge() {
    sessionStorage.setItem('qilsrp_notice_acknowledged', 'true');
    setNoticeAcknowledged(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    const lockStatus = getLoginLockStatus(email.trim());
    if (lockStatus.locked) {
      setError(`Too many failed attempts. Try again in ${Math.ceil(lockStatus.remainingMs / 1000)}s.`);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Incorrect email or password.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-ring login-ring-1" />
      <div className="login-ring login-ring-2" />
      <div className="login-ring login-ring-3" />

      {!noticeAcknowledged && (
        <div className="cultural-notice-overlay">
          <div className="cultural-notice-card">
            <div className="cultural-notice-icon">🌿</div>
            <h2>Cultural Content Notice</h2>
            <p>
              This platform may contain images, names, voices, or recordings of
              Aboriginal and Torres Strait Islander peoples who have passed away.
              All content is shared with the permission of community members, and
              intellectual property remains with the communities who shared it.
            </p>
            <p>
              Some content may also depict culturally sensitive places or knowledge.
              Please engage with this material respectfully.
            </p>
            <button className="notice-acknowledge-btn" onClick={handleAcknowledge}>
              I understand — continue
            </button>
          </div>
        </div>
      )}

      <div className="login-content">

        <div className="login-branding">
          <img src={logo} alt="QILSRP Logo" className="login-logo" />
          <h1 className="login-brand-title">QILSRP</h1>
          <p className="login-brand-sub">Queensland Indigenous Land and Sea Rangers Platform</p>
        </div>

        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to access the platform</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <div className="checkbox-row">
              <label>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <label>
                <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
                Show password
              </label>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="admin-note">Need access? Contact your administrator</p>
          <p className="register-note">
            Don't have an account?{' '}
            <span className="register-link" onClick={() => navigate('/register')}>Sign up</span>
          </p>
        </div>

        <div className="login-footer">
          <img
            src="/src/assets/qld-gov.png"
            alt="Queensland Government"
            className="login-footer-logo"
          />
        </div>

      </div>
    </div>
  );
}