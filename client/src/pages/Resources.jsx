import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ResourceCard from '../components/ResourceCard';
import logo from '../assets/logo.jpg';
import {fetchResources, fetchResourceDownloadUrl, createResourceUpload, uploadResourceFile, getResourceFileMetadata, getResourceFilterOptions, fetchCohorts} from '../services/resources';
import { isAdmin, getUser } from '../services/auth';
import './Resources.css';

export default function Resources() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [type, setType] = useState('All Types');
  const [dateSort, setDateSort] = useState('newest');
  const [nameSort, setNameSort] = useState('a-z');
  const [sortPriority, setSortPriority] = useState('date');
  const [showUpload, setShowUpload] = useState(false);
  useEffect(() => {
      if (location.state?.openUpload && (isAdmin() || getUser()?.role === 'ranger')) {
          setShowUpload(true);
          navigate(location.pathname, { replace: true, state: null });
          }
      }, [location.state, location.pathname, navigate]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAccessLevel, setUploadAccessLevel] = useState('student');
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohorts, setSelectedCohorts] = useState([]);
  useEffect(() => {
      async function loadCohorts() {
          try {
              const cohorts = await fetchCohorts();
              setAvailableCohorts(cohorts);
              } catch (err) {
                  console.error('Failed to load cohorts:', err);
                  }
              }
          loadCohorts();
           }, []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
      let cancelled = false;

      async function loadResources() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchResources();
        if (!cancelled) setResources(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load resources.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadResources();
    return () => { cancelled = true; };
  }, []);

const { categories, types } = useMemo(
    () => getResourceFilterOptions(resources),
    [resources],
  );
const filteredResources = useMemo(() => {
    const query = search.toLowerCase();
    const filtered = resources.filter(resource => {
        const matchesSearch =
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query);

           const matchesCategory =
           category === 'All Categories' || resource.category === category;

           const matchesType =
           type === 'All Types' || resource.type === type;
           return matchesSearch && matchesCategory && matchesType;
           });

         filtered.sort((a, b) => {
             if (sortPriority === 'name') {
                 if (nameSort === 'a-z') {
                     return a.title.localeCompare(b.title);
                      }
                  return b.title.localeCompare(a.title);
                  }
              const firstDate = new Date(a.date);
              const secondDate = new Date(b.date);

               if (dateSort === 'newest') {
                   return secondDate - firstDate;
                   }
               return firstDate - secondDate;
               });
           return filtered;
           }, [resources, search, category, type, dateSort, nameSort, sortPriority]);

        async function handleDownload(resource) {
            if (!resource) {
                return;
                 }
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
                 link.download = resource.title;
                 link.click();

                 URL.revokeObjectURL(fileURL);
                 } catch (err) {
                     alert(err.message || 'Failed to download resource.');
                     }
                 }

         function handleUpload() {
               setUploadError('');
               setSelectedCohorts([]);
               setShowUpload(true);
             }


         async function handleUploadSubmit(e) {
                 e.preventDefault();

         const user = getUser();
         const admin = isAdmin();

         if (!uploadTitle.trim()) {
             setUploadError('Please enter a resource title.');
              return;
              }

         if (!uploadFile) {
             setUploadError('Please select a file.');
              return;
            }

       if (!admin && !user?.cohort) {
           setUploadError('Your account has no assigned cohort. Please contact an administrator.');
           return;
           }

       if (selectedCohorts.length === 0) {
           setUploadError('Please select at least one cohort.');
           return;
           }

       if (!admin && uploadAccessLevel === 'admin') {
           setUploadError('You cannot assign this access level.');
           return;
           }
       if (user?.role === 'student' && uploadAccessLevel !== 'student') {
           setUploadError('You cannot assign this access level.');
           return;
           }

       setUploading(true);
       setUploadError('');

       let resourceCreated = false;

        try {
            const fileMetadata = getResourceFileMetadata(uploadFile);
            const { uploadURL } = await createResourceUpload({
                title: uploadTitle.trim(),
                 type: fileMetadata.type,
                  extension: fileMetadata.extension,
                  mimeType: fileMetadata.mimeType,
                  parentID: 1,
                  accessLevel: uploadAccessLevel,
                  cohorts: admin
                   ? selectedCohorts
                   : selectedCohorts.filter(name => name === user?.cohort)
                   });
               resourceCreated = true;

     await uploadResourceFile(uploadURL, uploadFile);

     const updatedResources = await fetchResources();
     setResources(updatedResources);
     setShowUpload(false);
     setUploadTitle('');
     setUploadFile(null);
     setUploadAccessLevel('student');
     setSelectedCohorts([]);

     setUploadSuccess(true);
    } catch (err) {
        if (resourceCreated) {
            setUploadError(
                'Resource was created, but the file upload failed. Please try again.'
            );
        } else {
            setUploadError(
                err.message || 'Failed to create resource.');
        }
    } finally {
      setUploading(false);
    }
  }

 function handleCohortChange(cohortName, checked) {
     if (checked) {
         setSelectedCohorts([...selectedCohorts, cohortName]);
         } else {
              setSelectedCohorts(
                  selectedCohorts.filter(name => name !== cohortName)
                  );
              }
           }
       const user = getUser();
       const admin = isAdmin();
       const visibleCohorts = availableCohorts.filter(cohort => {
           if (admin) {
               return true;
               }
           return cohort.name === user?.cohort;
           });
  return (

    <div className="res-layout">
      <Sidebar />

      <main className="res-content">
        <header className="res-header">
          <img src={logo} alt="Queensland Indigenous Land and Sea Rangers" className="res-logo" />

          <div className="res-search-row">
            <div className="res-search-wrap">
              <input
                className="res-search"
                type="search"
                placeholder="Search Resources"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="res-search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            {(isAdmin() || user?.role === 'ranger') && (
              <button
                type="button"
                className="res-upload-btn"
                onClick={handleUpload}
              >
                Upload
              </button>
            )}
          </div>
        </header>

        <section className="res-toolbar" aria-label="Resource filters">
          <div className="res-filters">
            <label className="res-filter">
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="res-filter">
              <select value={type} onChange={e => setType(e.target.value)}>
                {types.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="res-filter">
              <select
                value={dateSort}
                onChange={(e) => {
                  setDateSort(e.target.value);
                  setSortPriority('date');
                }}
              >
                <option value="newest">Date: Newest</option>
                <option value="oldest">Date: Oldest</option>
              </select>
            </label>
          </div>

          <div className="res-sort">
            <span>Sort By:</span>
            <label className="res-filter">
              <select
                value={nameSort}
                onChange={(e) => {
                  setNameSort(e.target.value);
                  setSortPriority('name');
                }}
              >
                <option value="a-z">Name (A-Z)</option>
                <option value="z-a">Name (Z-A)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="res-list" aria-label="Resource listings">
          {loading && <p className="res-status">Loading resources…</p>}

          {!loading && error && (
            <p className="res-status res-status--error">{error}</p>
          )}

          {!loading && !error && filteredResources.length === 0 && (
            <p className="res-status">No resources match your search or filters.</p>
          )}

          {!loading && !error && filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              image={resource.imageUrl}
              title={resource.title}
              description={resource.description}
              fileType={resource.fileType}
              fileSize={resource.fileSize}
              onDownload={() => handleDownload(resource)}
              onClick={() => navigate(`/resources/${resource.id}`)}
            />
          ))}
                </section>
              </main>

              {showUpload && (isAdmin() || user?.role === 'ranger') && (
                <div
                  className="res-upload-overlay"
                  onClick={() => {
                    if (!uploading) setShowUpload(false);
                  }}
                >
                  <div
                    className="res-upload-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resource-upload-title"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="res-upload-modal-header">
                      <h2 id="resource-upload-title">
                        Upload Resource
                      </h2>

                      <button
                        type="button"
                        className="res-upload-close"
                        onClick={() => setShowUpload(false)}
                        disabled={uploading}
                        aria-label="Close upload form"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleUploadSubmit}>
                      <label className="res-upload-field">
                        <span>Resource Title</span>

                        <input
                          type="text"
                          value={uploadTitle}
                          onChange={e => setUploadTitle(e.target.value)}
                          placeholder="Enter resource title"
                          disabled={uploading}
                          required
                        />
                      </label>

                      <label className="res-upload-field">
                        <span>File</span>

                        <input
                          type="file"
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setUploadFile(file);

                            if (file && !uploadTitle.trim()) {
                              const title = file.name.replace(/\.[^/.]+$/, '');
                              setUploadTitle(title);
                            }
                          }}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*,video/*,audio/*"
                          disabled={uploading}
                          required
                        />
                      </label>

                      <label className="res-upload-field">
                        <span>Who can access this resource?</span>

                        <select
                          value={uploadAccessLevel}
                          onChange={e => setUploadAccessLevel(e.target.value)}
                          disabled={uploading}
                        >
                        <option value="student">
                            Students, Rangers and Admins
                        </option>

                        {(admin || user?.role === 'ranger') && (
                            <option value="ranger">
                                Rangers and Admins
                            </option>
                        )}

                        {admin && (
                            <option value="admin">
                                Admins only
                            </option>
                            )}
                        </select>
                        </label>
                        <div className="res-upload-field">
                            <span>Select Cohorts</span>
                            {visibleCohorts.map(cohort => (
                                <label key={cohort.name} className="res-cohort-option">
                                    <input
                                    type="checkbox"
                                    checked={selectedCohorts.includes(cohort.name)}
                                    onChange={e =>
                                        handleCohortChange(cohort.name, e.target.checked)
                                        }
                                    disabled={uploading}
                                    />
                                    {cohort.name}

                            </label>
                        ))}
                     </div>

                     {uploadFile && (
                        <p className="res-upload-file">
                          Selected file: {uploadFile.name}
                        </p>
                      )}

                      {uploadError && (
                        <p className="res-upload-error">
                          {uploadError}
                        </p>
                      )}

                        <div className="res-upload-actions">
                          <button
                            type="button"
                            className="res-upload-cancel"
                            onClick={() => setShowUpload(false)}
                            disabled={uploading}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="res-upload-submit"
                            disabled={uploading}
                          >
                            {uploading ? 'Uploading...' : 'Upload Resource'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {uploadSuccess && (
                  <div
                    className="res-upload-overlay"
                    onClick={() => setUploadSuccess(false)}
                  >
                    <div
                      className="res-upload-success-modal"
                      role="dialog"
                      aria-modal="true"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="res-upload-success-icon">
                        ✓
                      </div>

                      <h2>Resource Uploaded</h2>

                      <p>Your resource was uploaded successfully.</p>

                      <button
                        type="button"
                        className="res-upload-success-btn"
                        onClick={() => setUploadSuccess(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }
