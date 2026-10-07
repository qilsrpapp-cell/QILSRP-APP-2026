import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getUser, authFetch } from '../services/auth';
import './Profile.css';

export default function Profile() {
  const loggedInUser = getUser();

  const localProfileKey = `qilsrp.profile.local.${loggedInUser?.email || 'unknown'}`;
  const localProfileData = JSON.parse(
    localStorage.getItem(localProfileKey) || '{}'
  );
 const loggedInName = loggedInUser?.name || '';
 const nameParts = loggedInName.trim().split(' ');
 const initialProfile = {
     firstName: nameParts[0] || '',
     lastName: nameParts.slice(1).join(' ') || '',
     rangerGroup:
     loggedInUser?.cohort ||
     'Not yet assigned',
     mobConnection: localProfileData.mobConnection || '',
     joinedDate: loggedInUser?.joinedDate || '',
     role: loggedInUser?.role || '',
     email: loggedInUser?.email || '',
     phone: localProfileData.phone || '',
     bio: localProfileData.bio || ''
     };

 const [user, setUser] = useState(initialProfile);
 const [profilePicture, setProfilePicture] = useState(
     localProfileData.profilePicture || ''
     );


  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [cohorts, setCohorts] = useState([]);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState(initialProfile);
  const [editError, setEditError] = useState('');

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
      currentPassword: '',
      newPassword: '',
       confirmPassword: ''
         });


  const [passwordError, setPasswordError] = useState('');
  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      setProfileError('');

    try {
      const cohortResponse = await authFetch('http://localhost:3000/cohort/');
      const cohortData = await cohortResponse.json().catch(() => []);

      if (cohortResponse.ok && Array.isArray(cohortData)) {
        setCohorts(cohortData);
      }
        const response = await authFetch(
            `http://localhost:3000/user?email=${encodeURIComponent(loggedInUser?.email || '')}`
            );
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to retrieve profile data.'
          );
        }

        const apiUser = data[0];

        if (!apiUser) {
          throw new Error('Unable to find the signed-in user in the profile data.');
        }

     const apiNameParts = (apiUser.name || '').trim().split(' ');
     const integratedProfile = {
         ...initialProfile,
          firstName: apiNameParts[0] || '',
           lastName: apiNameParts.slice(1).join(' ') || '',
           email: apiUser.email || '',
           role: apiUser.role || initialProfile.role,
           rangerGroup:
           apiUser.cohort ||
           initialProfile.rangerGroup
           };
       setUser(integratedProfile);
       setEditForm(integratedProfile);

} catch (error) {
console.error('Profile retrieval failed:', error)
setProfileError(error.message);
} finally {
setProfileLoading(false);
}
}

loadProfile();
 }, []);

  const localActivityKey =
    `qilsrp.profile.activity.${loggedInUser?.email || 'unknown'}`;

  const [recentActivity, setRecentActivity] = useState(() => {
    return JSON.parse(
      localStorage.getItem(localActivityKey) || '[]'
    );
  });

function addRecentActivity(message, email = loggedInUser?.email) {
    const newActivity = {
      message,
      timestamp: new Date().toISOString()
    };

    setRecentActivity(previousActivity => {
      const updatedActivity = [
        newActivity,
        ...previousActivity
      ].slice(0, 5);

  const activityKey =
  `qilsrp.profile.activity.${email || 'unknown'}`;

  localStorage.setItem(
      activityKey,
      JSON.stringify(updatedActivity)
      );
  return updatedActivity;
  });
}


  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm(previousForm => ({
      ...previousForm,
      [name]: value
      }));
  }

async function handleProfileSave(event) {
  event.preventDefault();
  setEditError('');

  if (!editForm.firstName.trim()) {
    setEditError('First name is required.');
    return;
  }

  if (!editForm.email.trim()) {
    setEditError('Email address is required.');
    return;
  }

  const fullName = [
    editForm.firstName.trim(),
    editForm.lastName.trim()
  ]
    .filter(Boolean)
    .join(' ');

    const cohort =
    editForm.rangerGroup === 'Not yet assigned'
    ? ''
    : editForm.rangerGroup.trim();

    try{
const response = await authFetch(
    `http://localhost:3000/user/${loggedInUser.user_id}`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: fullName,
      email: editForm.email.trim(),
      cohort: cohort,
      role: user.role.toLowerCase()
    })
  }
);

const data = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(
    data.message || 'Unable to update profile.'
  );
}
const updatedUser = {
    ...user,
    firstName: editForm.firstName.trim(),
    lastName: editForm.lastName.trim(),
    email: editForm.email.trim(),
    mobConnection: editForm.mobConnection.trim(),
    phone: editForm.phone.trim(),
    bio: editForm.bio.trim(),
    rangerGroup: cohort
    };

setUser(updatedUser);
setEditForm(updatedUser);

const savedProfile = JSON.parse(
    localStorage.getItem(localProfileKey) || '{}'
    );

localStorage.setItem(
  localProfileKey,
  JSON.stringify({

...savedProfile,
    mobConnection: updatedUser.mobConnection,
    phone: updatedUser.phone,
    bio: updatedUser.bio
    })
);
    if (updatedUser.email !== user.email) {
        const newProfileKey = `qilsrp.profile.local.${updatedUser.email}`;

    localStorage.setItem(
        newProfileKey,
        localStorage.getItem(localProfileKey) || '{}'
        );
    localStorage.removeItem(localProfileKey);

    const newActivityKey =
    `qilsrp.profile.activity.${updatedUser.email}`

    localStorage.setItem(
        newActivityKey,
        localStorage.getItem(localActivityKey) || '[]'
        );
    localStorage.removeItem(localActivityKey);
    }


localStorage.setItem(
    'qilsrp.user',
    JSON.stringify({
        user_id: loggedInUser?.user_id,
        name: fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        cohort: updatedUser.rangerGroup
        })
    );

addRecentActivity('Updated profile information', updatedUser.email);
setShowEditProfile(false);
} catch (error) {
    setEditError(error.message);
    }
}

function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm(previousForm => ({
      ...previousForm,
      [name]: value
    }));
  }

  function isStrongPassword(password) {
    const hasMinimumLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialCharacter = /[^A-Za-z0-9]/.test(password);

    return (
      hasMinimumLength &&
      hasUppercase &&
      hasNumber &&
      hasSpecialCharacter
    );
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    setPasswordError('');

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError('Please complete all password fields.');
      return;
    }

    if (!isStrongPassword(passwordForm.newPassword)) {
      setPasswordError(
        'The new password must contain at least 8 characters, one uppercase letter, one number and one special character.'
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    try {
      const response = await authFetch(
        'http://localhost:3000/user/password',
        {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to update password.'
        );
      }

      alert('Password updated successfully.');
      addRecentActivity('Changed account password');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setShowChangePassword(false);
    } catch (error) {
      setPasswordError(error.message);
    }
  }

  function handleProfilePictureChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

if (file.size > 2 * 1024 * 1024) {
    alert('Profile picture must be smaller than 2 MB.');
    return;
    }

const reader = new FileReader();

reader.onload = () => {
    const imageData = reader.result;


    setProfilePicture(imageData);

    const savedProfile = JSON.parse(
        localStorage.getItem(localProfileKey) || '{}'
    );

    localStorage.setItem(
        localProfileKey,
        JSON.stringify({
            ...savedProfile,
            profilePicture: imageData
            })
        );
    };
reader.readAsDataURL(file);

  }

return (
<div className="profile-layout">
<Sidebar />

<main className="profile-content">
    {profileError && (
        <p className="profile-form-error">
            {profileError}
            </p>
            )}
        {profileLoading && (
            <p>Loading profile...</p>
            )}

        <section className="profile-header-card">
            <div className="profile-header-user">
                <label className="profile-avatar-wrapper">
                    {profilePicture ? (
                        <img
                        src={profilePicture}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="profile-avatar"
                        />
                        ) : (
                            <div className="profile-avatar profile-avatar-initials">
                                {user.firstName?.charAt(0).toUpperCase()}
                                {user.lastName?.charAt(0).toUpperCase()}
                                </div>
                            )}

                    <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="profile-avatar-input"
                    />

            <span className="profile-avatar-overlay">
                Change
                </span>
                </label>

            <div>

      <h1>
        {user.firstName}
        {user.lastName && ` ${user.lastName}`}
      </h1>

      <p className="profile-group">
          {user.rangerGroup || 'Not yet assigned'}
          </p>

      <p>
          Joined {user.joinedDate || 'Not provided'}
          </p>

      <p>{user.role || 'Not provided'}</p>
      </div>
      </div>

  <button
    type="button"
    className="profile-edit-button"
    onClick={() => {
      setEditForm(user);
      setEditError('');
      setShowEditProfile(true);
    }}
  >

  Edit Profile
  </button>
  </section>

<div className="profile-main-grid">
  <section className="profile-card">
    <h2>Profile Details</h2>

    <div className="profile-detail">
      <strong>First Name</strong>
      <span>{user.firstName || 'Not provided'}</span>
    </div>

    <div className="profile-detail">
      <strong>Last Name</strong>
      <span>{user.lastName || 'Not provided'}</span>
    </div>

    <div className="profile-detail">
      <strong>Mob Connection</strong>
      <span>{user.mobConnection || 'Not provided'}</span>
    </div>

    <div className="profile-detail">
      <strong>Email Address</strong>
      <span>{user.email || 'Not provided'}</span>
    </div>

    <div className="profile-detail">
      <strong>Phone Number</strong>
      <span>{user.phone || 'Not provided'}</span>
    </div>

    <div className="profile-detail">
      <strong>Ranger Group</strong>
      <span>{user.rangerGroup || 'Not yet assigned'}</span>
    </div>

    <div className="profile-detail profile-bio">
      <strong>Bio</strong>
      <span>{user.bio || 'No bio has been added yet.'}</span>
    </div>
  </section>

  <div className="profile-right-column">
    <section className="profile-card">

      <h2>Recent Activity</h2>
      {recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
              <div
            className="profile-activity"
            key={`${activity.timestamp}-${index}`}
          >
            <strong>{activity.message}</strong>
            <span>
              {new Date(activity.timestamp).toLocaleString()}
            </span>
          </div>
        ))
      ) : (
        <div className="profile-activity">
          No recent activity yet.
        </div>
      )}
    </section>

    <section className="profile-card profile-security">
      <div>
        <h2>Security Settings</h2>
        <p>Update your account password.</p>
      </div>

      <button
        type="button"
        className="profile-change-button"
        onClick={() => {
          setPasswordError('');

          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });

          setShowChangePassword(true);
        }}
      >

        Change
      </button>
    </section>
  </div>
</div>
</main>

{showEditProfile && (
<div className="profile-modal-overlay">
  <div className="profile-modal">
    <div className="profile-modal-header">
      <h2>Edit Profile</h2>

      <button
        type="button"
        className="profile-modal-close"
        onClick={() => setShowEditProfile(false)}
      >
        ×
      </button>
    </div>

    <form onSubmit={handleProfileSave}>
      <div className="profile-form-grid">
        <label>
          First Name *
          <input
            type="text"
            name="firstName"
            value={editForm.firstName}
            onChange={handleEditChange}
          />
        </label>

        <label>
          Last Name
          <input
            type="text"
            name="lastName"
            value={editForm.lastName}
            onChange={handleEditChange}
          />
        </label>

        <label>
          Email Address *
          <input
            type="email"
            name="email"
            value={editForm.email}
            onChange={handleEditChange}
          />
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            name="phone"
            value={editForm.phone}
            onChange={handleEditChange}
          />
        </label>

        <label>
          Ranger Group
          <select
            className="profile-select"
            name="rangerGroup"
            value={
              editForm.rangerGroup === 'Not yet assigned'
                ? ''
                : editForm.rangerGroup
                }
            onChange={handleEditChange}
            disabled={user.role?.toLowerCase() !== 'admin'}
          >

          <option value="" disabled>Select a Ranger Group</option>

            {cohorts.map(cohort => (
              <option key={cohort.name} value={cohort.name}>
                {cohort.name}
              </option>
            ))}
          </select>
        </label>

       <label>
         Mob Connection
         <input
           type="text"
           name="mobConnection"
           value={editForm.mobConnection}
           onChange={handleEditChange}
         />
       </label>

        <label>
          Role
          <input
            type="text"
            name="role"
            value={editForm.role}
            disabled
          />
        </label>

        <label className="profile-full-width-field">
          Bio
          <textarea
            name="bio"
            value={editForm.bio}
            rows="4"
            onChange={handleEditChange}
          />
        </label>
      </div>

      {editError && (
        <p className="profile-form-error">
          {editError}
        </p>
      )}

      <div className="profile-modal-actions">
        <button
          type="button"
          className="profile-cancel-button"
          onClick={() => setShowEditProfile(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="profile-edit-button"
        >
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>
)}

{showChangePassword && (
<div className="profile-modal-overlay">
  <div className="profile-modal profile-password-modal">
    <div className="profile-modal-header">
      <h2>Change Password</h2>

      <button
        type="button"
        className="profile-modal-close"
        onClick={() => setShowChangePassword(false)}
      >
        ×
      </button>
    </div>

    <form onSubmit={handlePasswordSubmit}>
      <label>
        Current Password
        <input
          type="password"
          name="currentPassword"
          value={passwordForm.currentPassword}
          onChange={handlePasswordChange}
        />
      </label>

      <label>
        New Password
        <input
          type="password"
          name="newPassword"
          value={passwordForm.newPassword}
          onChange={handlePasswordChange}
        />
      </label>

      <label>
        Confirm New Password
        <input
          type="password"
          name="confirmPassword"
          value={passwordForm.confirmPassword}
          onChange={handlePasswordChange}
        />
      </label>

      <div className="profile-password-requirements">
        <p>Your new password must contain:</p>

        <ul>
          <li>At least 8 characters</li>
          <li>At least 1 uppercase letter</li>
          <li>At least 1 number</li>
          <li>At least 1 special character</li>
        </ul>
      </div>

      {passwordError && (
        <p className="profile-form-error">
          {passwordError}
        </p>
      )}

      <div className="profile-modal-actions">
        <button
          type="button"
          className="profile-cancel-button"
          onClick={() => setShowChangePassword(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="profile-change-button"
        >
          Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
)}
</div>
);
}