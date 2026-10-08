import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import logo from '../assets/logo.jpg';
import { getUser, authFetch, isAdmin } from '../services/auth';
import { getConversations } from '../services/messages';
import {fetchResources, fetchCohorts, fetchResourceDownloadUrl, createResourceUpload, uploadResourceFile, getResourceFileMetadata} from '../services/resources';
import './Dashboard.css';
import { API_BASE } from '../config';

function getInitials(name) {
  if (!name) return 'R';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return initials.toUpperCase();
}

export default function Dashboard() {
  const user = getUser();
  const displayName = user?.name || 'Ranger';
  const localProfileKey = `qilsrp.profile.local.${user?.email || 'unknown'}`;
  const localProfileData = JSON.parse(
      localStorage.getItem(localProfileKey) || '{}'
      );
  const profilePicture = localProfileData.profilePicture || '';
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPermissionChecked, setUploadPermissionChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAccessLevel, setUploadAccessLevel] = useState('student');
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohorts, setSelectedCohorts] = useState([]);

  useEffect(() => {
    async function loadCohorts() {
        try {
            const data = await fetchCohorts();
            setAvailableCohorts(data);
            } catch (error) {
                console.error('Failed to load cohorts:', error);
                }
            }

    loadCohorts();
    }, []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  function openUploadModal() {
      setShowUploadModal(true);
      setUploadPermissionChecked(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadAccessLevel('student');
      setSelectedCohorts([]);
      setUploadError('');
      }

  async function handleDashboardUpload() {
if (!uploadTitle.trim() || !selectedFile || !uploadPermissionChecked || uploading) {
    return;
    }
if (!isAdmin() && !user?.cohort) {
    setUploadError('Your account has no assigned cohort. Please contact an administrator.');
    return;
    }
if (selectedCohorts.length === 0) {
    setUploadError('Please select at least one cohort.');
    return;
    }
if (!isAdmin() && (uploadAccessLevel === 'admin' ||
    (user?.role === 'student' && uploadAccessLevel !== 'student'))) {
        setUploadError('You cannot assign this access level.');
        return;
        }

    setUploading(true);
    setUploadError('');
    let resourceCreated = false;
    try {
        const fileMetadata = getResourceFileMetadata(selectedFile);
        const cohortsToSubmit = isAdmin()
          ? selectedCohorts
          : selectedCohorts.filter(name => name === user?.cohort);
          if (cohortsToSubmit.length === 0) {
              throw new Error('Please select your assigned cohort.');
              }
              const { uploadURL } = await createResourceUpload({
                  title: uploadTitle.trim(),
                  type: fileMetadata.type,
                  extension: fileMetadata.extension,
                  mimeType: fileMetadata.mimeType,
                  parentID: 1,
                  accessLevel: uploadAccessLevel,
                  cohorts: cohortsToSubmit
                  });
              resourceCreated = true;

      await uploadResourceFile(uploadURL, selectedFile);
      const updatedResources = await fetchResources();
      setResourceCount(updatedResources.length);
      setDashboardResources(updatedResources);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadPermissionChecked(false);
      setUploadAccessLevel('student');
      setSelectedCohorts([]);
      setUploadSuccess(true);
    } catch (error) {
        setUploadError(
            resourceCreated
            ? 'Resource was created, but the file upload or refresh failed. Please check the Resources page before retrying.'
            : error.message || 'Failed to upload resource.'
            );
    } finally {
        setUploading(false);
        }
    }

async function handleDashboardDownload(resource) {
  try {
    const downloadURL = await fetchResourceDownloadUrl(resource.id);
    const response = await fetch(downloadURL);

    if (!response.ok) {
        throw new Error('Failed to download resource.');
        }
    const blob = await response.blob();
    const fileURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = resource.title || 'resource';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(fileURL);

    } catch (error) {
        console.error('Dashboard resource download error:', error);
        }
    }

  const [deceasedWarning, setDeceasedWarning] = useState(false);
  const [events, setEvents] = useState([]);
  const [resourceCount, setResourceCount] = useState(null);
  const [dashboardResources, setDashboardResources] = useState([]);
  const latestDashboardResources = [...dashboardResources]
  .sort((a, b) => new Date(b.date) - new Date(a.date));

  const [conversations, setConversations] = useState([]);
  const [conversationsError, setConversationsError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadResourceCount() {
        try {
            const resources = await fetchResources();

            if (!cancelled) {
                setResourceCount(resources.length);
                setDashboardResources(resources);
                }
            } catch (error) {
                console.error('Dashboard resource count error:', error);
                }
            }

        loadResourceCount();
        return () => {
            cancelled = true;
            };
        }, []);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(err => setConversationsError(err.message || 'Failed to load chats.'));
  }, []);

  function chatLabel(conversation) {
    if (conversation.name) return conversation.name;
    const other = (conversation.members || []).find(m => m.email !== user?.email);
    return other?.name || 'Direct Message';
  }

    useEffect(() => {
      async function loadEvents() {
        try {
            const response = await authFetch(`${API_BASE}/event/`);

          if (!response.ok) {
              throw new Error('Unable to load dashboard events.');
              }
          const data = await response.json();
          setEvents(
            Array.isArray(data)
              ? data
                  .filter(event => new Date(event.datetime.replace(' ', 'T')) >= new Date())
                  .sort((a, b) =>
                    new Date(a.datetime.replace(' ', 'T')) -
                    new Date(b.datetime.replace(' ', 'T'))
                  )
              : []
          );
        } catch (error) {
          console.error('Dashboard event error:', error);
        }
      }

      loadEvents();
      }, []);

    const timeString = now.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
        });
    const dateString = now.toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
        });
  return (
    <div className="db-layout">
      <Sidebar />

      <div className="db-content">

        <div className="db-topbar">
          <div className="db-topbar-welcome">
            <img src={logo} alt="QILSRP Logo" style={{ height: 56 }} />
            <div className="db-welcome-text">
              <span>Welcome Back! {displayName}</span>
              <span>Stay connected with your ranger team.</span>
            </div>
          </div>
         <div className="db-topbar-right">
           {(isAdmin() || user?.role === 'ranger') && (
           <button
           className="db-upload-btn"
             onClick={openUploadModal}
           >
             Upload Resource
           </button>
           )}
           <input type="file" ref={fileInputRef} hidden onChange={e => setSelectedFile(e.target.files[0])} />
         </div>
        </div>

        <div className="db-body">

          <div className="db-main">

            <div className="db-card">
              <div className="db-card-header">
                <h2>Summary</h2>
                <div className="db-datetime">
                  <span className="db-time">{timeString}</span>
                  <span className="db-date">{dateString}</span>
                </div>
              </div>
              <div className="db-summary-grid">
                <div className="db-recent-activity">
                  <h3>Recent Activity</h3>
                  <div className="db-activity-item">
                    <span className="db-activity-icon">📁</span>
                    <span className="db-activity-link">
                        {resourceCount !== null ? `${resourceCount} resources available` : 'Loading resources...'}
                        </span>
                  </div>
                  <div className="db-activity-item" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
                    <span className="db-activity-icon">💬</span>
                    <span className="db-activity-link">Go to group chats</span>
                  </div>
                  <div className="db-activity-item">
                      <span className="db-activity-icon">📝</span>
                      <span className="db-activity-link">8 new posts</span>
                      </div>
                </div>
                <div className="db-latest-updates">
                    <h3>Latest Updates</h3>
                    <ul>
                        <li>Wildlife workshop added</li>
                        <li>New ranger files uploaded</li>
                        <li>Team meeting announced</li>
                        </ul>
                    </div>
              </div>
              <div className="db-summary-btns">
                <button className="db-summary-btn" onClick={() => navigate('/resources')}>SHARED RESOURCES</button>
                <button className="db-summary-btn" onClick={() => navigate('/calendar')}>UPCOMING EVENTS</button>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <h2>QUICK ACTIONS</h2>
              </div>
              <div className="db-actions-grid">
                <div className="db-action-card" onClick={() => navigate('/resources')} style={{ cursor: 'pointer' }}>
                  <div className="db-action-icon">↑</div>
                  <div className="db-action-title">Add Resource</div>
                  <div className="db-action-desc">Upload documents, photos and videos</div>
                </div>
                <div className="db-action-card" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
                  <div className="db-action-icon">💬</div>
                  <div className="db-action-title">Chat</div>
                  <div className="db-action-desc">Access recent group discussion</div>
                </div>
              </div>
            </div>

            <div className="db-card">
              <h2>Featured Post</h2>
              {deceasedWarning && (
                <div className="db-deceased-warning">
                  ⚠ This post may contain images or names of people who have passed away
                </div>
              )}
              <div className="db-featured-post">
                <div className="db-post-image">🐨</div>
                <div className="db-post-content">
                  <p className="db-post-author"><strong>Emily</strong> <span>6h</span></p>
                  <p className="db-post-text">A koala sighting was reported near Sector 3 this morning.</p>
                  <div className="db-post-actions">
                    <span>👍 11</span>
                    <span>💬 3</span>
                    <span>🔖</span>
                  </div>
                </div>
              </div>
              <div className="db-carousel-dots">
                <span className="dot active"></span>
              </div>
              <div className="db-post-flag-row">
                <label className="db-flag-label">
                  <input
                    type="checkbox"
                    checked={deceasedWarning}
                    onChange={e => setDeceasedWarning(e.target.checked)}
                  />
                  Flag: may include content about people who have passed
                </label>
              </div>
            </div>

          </div>

          <div className="db-right">

            <div className="db-card">
              <div className="db-profile">
                  <div className="db-profile-pic">
                      {profilePicture ? (
                          <img src={profilePicture} alt={displayName} />
                          ) : (
                              <span>{getInitials(displayName)}</span>
                              )}
                          </div>
                <div className="db-profile-info">
                  <h3>{displayName}</h3>
                  <p className="db-profile-group">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</p>
                  <p>{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="db-card">
              <h2>Group Chat Preview</h2>
              <div className="db-chat-list">
                {conversationsError && <p className="db-chat-msg">{conversationsError}</p>}
                {!conversationsError && conversations.length === 0 && (
                  <p className="db-chat-msg">No chats yet.</p>
                )}
                {conversations.slice(0, 3).map(conversation => (
                  <div
                    key={conversation.conversation_id}
                    className="db-chat-item"
                    onClick={() => navigate(`/chat/${conversation.conversation_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="db-chat-avatar">{conversation.type === 'cohort' ? '🌿' : '💬'}</div>
                    <div>
                      <p className="db-chat-name">{chatLabel(conversation)}</p>
                      <p className="db-chat-msg">{(conversation.members || []).length} member{(conversation.members || []).length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="db-card">
              <h2>Download Resources</h2>
              <div className="db-downloads">
                  {latestDashboardResources.slice(0, 2).map(resource => (
                      <div
                      key={resource.id}
                      className="db-download-item"
                      onClick={() => handleDashboardDownload(resource)}
                      style={{ cursor: 'pointer' }}
                  >
                      <span>{resource.title}</span>
                      <span className="db-download-icon">↗</span>
                      </div>
                  ))}
              </div>
            </div>

          </div>

        </div>
      </div>
        {uploadSuccess && (
          <div className="res-upload-overlay">
            <div className="res-upload-success-modal">
              <div className="res-upload-success-icon">✓</div>
              <h2>Resource Uploaded</h2>
              <p>Your resource was uploaded successfully.</p>
              <button
                className="res-upload-success-btn"
                onClick={() => setUploadSuccess(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      {showUploadModal && (
        <div className="db-modal-overlay"
        onClick={() => {
            if (!uploading) {
            setShowUploadModal(false);
            }
        }}
    >
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-header">
              <h2>Upload resource</h2>
              <button className="db-modal-close" onClick={() => setShowUploadModal(false)} disabled={uploading}>✕</button>
            </div>
            <div className="db-upload-notice">
              <p className="db-upload-notice-title">📋 Before you upload</p>
              <ul>
                <li>Confirm you have permission from the people or community featured in this content</li>
                <li>Intellectual property remains with the group who shared their stories or information</li>
                <li>Content can be edited or removed at any time on request</li>
                <li>Do not upload anything relating to Men's or Women's Business without clear community approval</li>
              </ul>
            </div>
            <div className="db-modal-body">
              <div className="db-modal-access">
                <label htmlFor="dashboard-resource-title">
                  Resource Title
                </label>
                <input
                  id="dashboard-resource-title"
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Enter resource title"
                  disabled={uploading}
                  required
                />
              </div>

              <button className="db-modal-file-btn" onClick={() => fileInputRef.current.click()}>
                {selectedFile ? `✓ ${selectedFile.name}` : '↑ Choose file'}
              </button>
              <div className="db-modal-access">
                <label htmlFor="dashboard-upload-access">
                  Who can access this resource?
                </label>

                <select
                  id="dashboard-upload-access"
                  value={uploadAccessLevel}
                  onChange={(e) => setUploadAccessLevel(e.target.value)}
                >
                  <option value="student">
                    Students, Rangers and Admins
                  </option>
                  {(isAdmin() || user?.role === 'ranger') && (
                    <option value="ranger">
                      Rangers and Admins
                    </option>
                  )}
                  {isAdmin() && (
                    <option value="admin">
                      Admins only
                    </option>
                  )}
                </select>
              </div>

                <div className="db-modal-access">
                  <label>Select Cohorts</label>

                  {availableCohorts.filter(cohort => isAdmin() || cohort.name === user?.cohort).map(cohort => (
                    <label key={cohort.name} className="db-cohort-option">
                      <input
                        type="checkbox"
                        checked={selectedCohorts.includes(cohort.name)}
                        onChange={e => {
                            setSelectedCohorts(previous =>
                                e.target.checked
                                ? [...previous, cohort.name]
                                : previous.filter(name => name !== cohort.name)
                                );
                            }}
                        disabled={uploading}
                      />
                      {cohort.name}
                    </label>
                  ))}
                </div>

                <label className="db-modal-permission-check">
                <input
                  type="checkbox"
                  checked={uploadPermissionChecked}
                  onChange={e => setUploadPermissionChecked(e.target.checked)}
                />
                I confirm I have permission to share this content
              </label>
              {uploadError && (
                <p className="db-upload-error" role="alert">
                  {uploadError}
                </p>
              )}
              <button
              className="db-modal-submit-btn"
              disabled={!uploadPermissionChecked || !selectedFile || uploading}
              onClick={handleDashboardUpload}
              >
              {uploading ? 'Uploading...' : 'Upload'}
             </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}