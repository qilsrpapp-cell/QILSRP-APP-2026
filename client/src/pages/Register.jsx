import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import { register } from '../services/auth';
import './Register.css';
import { resolveAsset } from '../utils/assets';

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
// Matches the backend's Australian mobile format (04XXXXXXXX or +614XXXXXXXX)
const MOBILE_RULE = /^(?:\+?614\d{8}|04\d{8})$/;

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rangerGroup: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const [profileImage, setProfileImage] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      setProfileImage(URL.createObjectURL(file));
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setProfileFile(file);
      setProfileImage(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { firstName, lastName, email, phone, rangerGroup, role, password, confirmPassword } = form;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !rangerGroup.trim() || !role || !password || !confirmPassword) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const normalisedPhone = phone.replace(/\s/g, '');
    if (!MOBILE_RULE.test(normalisedPhone)) {
      setError('Please enter a valid Australian mobile number, e.g. 0412 345 678.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!PASSWORD_RULE.test(password)) {
      setError('Password must be at least 8 characters and include an upper case letter, a number, and a special character.');
      return;
    }

    setLoading(true);
    try {
      // Profile picture is not sent — backend has no upload support for it yet
      await register({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        mobile: normalisedPhone,
        password,
        cohort: rangerGroup.trim(),
        role,
      });
      navigate('/login', { state: { justRegistered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">

      <div className="reg-ring reg-ring-1" />
      <div className="reg-ring reg-ring-2" />
      <div className="reg-ring reg-ring-3" />

      <div className="register-content">

        <div className="register-branding">
          <img src={logo} alt="QILSRP Logo" className="register-logo" />
          <h1 className="register-brand-title">QILSRP</h1>
          <p className="register-brand-sub">Queensland Indigenous Land and Sea Rangers Platform</p>
        </div>

        <div className="register-card">
          <div className="register-card-header">
            <div>
              <h2>Account Set Up</h2>
              <p className="mandatory-note">* Denotes mandatory fields</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              <div className="form-col">
                <label>First Name *</label>
                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Enter first name" disabled={loading} />

                <label>Email Address *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter email address" disabled={loading} />

                <label>Phone Number *</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 0412 345 678" autoComplete="tel" disabled={loading} />

                <label>Ranger Group *</label>
                <input type="text" name="rangerGroup" value={form.rangerGroup} onChange={handleChange} placeholder="Enter ranger group" disabled={loading} />

                <label>Role *</label>
                <select name="role" value={form.role} onChange={handleChange} disabled={loading}>
                  <option value="" disabled>Select a role</option>
                  <option value="ranger">Ranger</option>
                  <option value="student">Student</option>
                </select>

                <label>Create Password *</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Create a password" autoComplete="new-password" disabled={loading} />
              </div>

              <div className="form-col">
                <label>Last Name *</label>
                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Enter last name" disabled={loading} />

                <label>Profile Picture</label>
                <div
                  className="image-upload"
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  <div className="image-upload-left">
                    <p>Drag and drop an image, or select one from your device</p>
                    <label className="select-image-btn">
                      Select Image
                      <input type="file" accept="image/*" onChange={handleImageSelect} hidden disabled={loading} />
                    </label>
                  </div>
                  <div className="image-preview">
                    {profileImage
                      ? <img src={profileImage} alt="Preview" />
                      : <span>+ Add</span>
                    }
                  </div>
                </div>

                <label>Confirm Password *</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm your password" autoComplete="new-password" disabled={loading} />
              </div>

            </div>

            <div className="form-footer">
              <div className="password-rules">
                <p>To create a strong password, make it long, unpredictable and unique.</p>
                <p>Your password <strong>must</strong> contain:</p>
                <ul>
                  <li>At least 8 characters</li>
                  <li>At least 1 upper case letter</li>
                  <li>At least 1 number</li>
                  <li>At least 1 special character e.g. @, $, &</li>
                </ul>
              </div>

              <div className="form-footer-right">
                {error && <p className="register-error">{error}</p>}
                <button type="submit" className="create-btn" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
                <p>Already have an account? <span className="login-link" onClick={() => navigate('/login')}>Sign in</span></p>
              </div>
            </div>
          </form>
        </div>

        <div className="register-footer">
          <img
            src={resolveAsset('/src/assets/qld-gov.png')}
            alt="Queensland Government"
            className="register-footer-logo"
          />
        </div>

      </div>
    </div>
  );
}