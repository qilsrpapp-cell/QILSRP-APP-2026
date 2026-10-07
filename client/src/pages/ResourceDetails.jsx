import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {fetchResourceById,fetchResourceDownloadUrl,updateResource,deleteResource} from '../services/resources';
import { isAdmin } from '../services/auth';
import './ResourceDetails.css';
import Open from '../assets/icons/Open.png';

export default function ResourceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editAccessLevel, setEditAccessLevel] = useState('student');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadResource() {
            setLoading(true);
            setError('');

            try {
                const data = await fetchResourceById(id);

                if (cancelled) return;

                if (!data) {
                    setError('This resource could not be found.');
                } else {
                    setResource(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message ||
                        'Failed to load resource.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadResource();

        return () => {
            cancelled = true;
            };
        }, [id]);


    async function handleOpen() {
        if (!resource) return;

        try {
            const downloadURL = await fetchResourceDownloadUrl(resource.id);
            window.open(downloadURL, '_blank', 'noopener,noreferrer');
                } catch (err) {
                    alert(err.message || 'Failed to download resource.');
                }
            }

    async function handleDownload() {
        if (!resource) return;

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
            link.download =
                `${resource.title}${resource.extension ? `.${resource.extension}` : ''}`;

            link.click();
            URL.revokeObjectURL(fileURL);
                } catch (err) {
                    alert(err.message || 'Failed to download resource.');
                }
            }

            function handleEdit() {
                if (!resource) {
                    return;
                }

           setEditTitle(resource.title);
           setEditAccessLevel(resource.accessLevel || 'student');
           setEditError('');
           setEditing(true);
       }
       function handleCancelEdit() {
           setEditing(false);
           setEditError('');
       }

   async function handleSaveEdit(e) {
       e.preventDefault();
       if (!resource) return;
           if (!editTitle.trim()) {
               setEditError('Please enter a resource title.');
               return;
           }
           setSaving(true);
           setEditError('');

           try {
               await updateResource(resource.id, {
                   title: editTitle.trim(),
                   accessLevel: editAccessLevel
                    });

               setResource(current => ({
                   ...current,
                   title: editTitle.trim(),
                   accessLevel: editAccessLevel
               }));

               setEditing(false);
           } catch (err) {
               setEditError(err.message || 'Failed to update resource.');
           } finally {
               setSaving(false);
           }
       }


      function handleDelete() {
          if (!resource || !isAdmin()) return;
          setShowDeleteConfirm(true);
      }

      async function handleConfirmDelete() {
          if (!resource || !isAdmin()) return;
          try {
              setSaving(true);
              setEditError('');

              await deleteResource(resource.id);

              setShowDeleteConfirm(false);
              navigate('/resources');
              } catch (err) {
                  setEditError(err.message || 'Failed to delete resource.');
                  setShowDeleteConfirm(false);
                  } finally {
                      setSaving(false);
                      }
                  }

              const formattedDate = resource
              ? new Date(resource.date).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                  })
              : '';

    return (
        <div className="resourcedetail-layout">
            <Sidebar />

            <main className="resourcedetail-content">
                <button
                    className="resourcedetail-btn"
                    onClick={() => navigate('/resources')}
                >
                    &larr; Back to Resources
                </button>

                {loading && (
                    <p className="resourcedetail-status">
                        Loading resource...
                    </p>
                )}

                {!loading && error && (
                    <p className="resourcedetail-status resourcedetail-error">
                        {error}
                    </p>
                )}

                {!loading && !error && resource && (
                    <article className="resourcedetail-card">
                        <div className="resourcedetail-imgwrap">
                            <img
                                src={resource.imageUrl}
                                alt=""
                                className="resourcedetail-img"
                            />
                        </div>

                        <div className="resourcedetail-body">
                            <div className="resourcedetail-badges">
                                <span className="resourcedetail-badge resourcedetail-badgecategory">
                                    {resource.category}
                                </span>

                                <span className="resourcedetail-badge resourcedetail-badgetype">
                                    {resource.type}
                                </span>
                            </div>

                            <h1 className="resourcedetail-title">
                                {resource.title}
                            </h1>

                            <p className="resourcedetail-description">
                                {resource.description}
                            </p>

                            <div className="resourcedetail-meta-grid">
                                <div className="resourcedetail-meta-item">
                                    <span className="resourcedetail-meta-label">
                                        File Type:
                                    </span>
                                    <span className="resourcedetail-meta-value">
                                        {resource.fileType}
                                    </span>
                                </div>

                                <div className="resourcedetail-meta-item">
                                    <span className="resourcedetail-meta-label">
                                        File Size:
                                    </span>
                                    <span className="resourcedetail-meta-value">
                                        {resource.fileSize}
                                    </span>
                                </div>

                                <div className="resourcedetail-meta-item">
                                    <span className="resourcedetail-meta-label">
                                        Date Added:
                                    </span>
                                    <span className="resourcedetail-meta-value">
                                        {formattedDate}
                                    </span>
                                </div>
                            </div>

                            <div className="resourcedetail-actions">
                                <button
                                type="button"
                                className="resourcedetail-open-btn"
                                onClick={handleOpen}
                                >
                                <img
                                    src={Open}
                                    alt="Open Icon"
                                    className="resourcedetail-btn-icon"
                                />
                                Open Resource
                            </button>

                           <button
                               type="button"
                               className="resourcedetail-download-btn"
                               onClick={handleDownload}
                           >
                               <svg
                                   width="18"
                                   height="18"
                                   viewBox="0 0 24 24"
                                   fill="none"
                                   aria-hidden="true"
                               >
                                   <path
                                       d="M12 3v12m0 0l4-4M12 15l-4-4"
                                       stroke="currentColor"
                                       strokeWidth="2"
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                   />
                                   <path
                                       d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                                       stroke="currentColor"
                                       strokeWidth="2"
                                       strokeLinecap="round"
                                   />
                               </svg>

                               Download Resource
                           </button>

                           {isAdmin() && (
                               <button
                                   type="button"
                                   className="resourcedetail-edit-btn"
                                   onClick={handleEdit}
                               >
                                   Edit Resource
                               </button>
                           )}
                        </div>
                        </div>
                    </article>
                )}
            </main>
             {editing && isAdmin() && (
                 <div
                     className="resourcedetail-edit-overlay"
                     onClick={handleCancelEdit}
                 >
                     <div
                         className="resourcedetail-edit-modal"
                         onClick={(e) => e.stopPropagation()}
                     >
                         <div className="resourcedetail-edit-header">
                             <h2>Edit Resource</h2>

                             <button
                                 type="button"
                                 className="resourcedetail-edit-close"
                                 onClick={handleCancelEdit}
                                 disabled={saving}
                                 aria-label="Close"
                             >
                                 ×
                             </button>
                         </div>

                         <form onSubmit={handleSaveEdit}>
                             <div className="resourcedetail-edit-field">
                                 <label htmlFor="edit-resource-title">
                                     Resource Title
                                 </label>

                                 <input
                                     id="edit-resource-title"
                                     type="text"
                                     value={editTitle}
                                     onChange={(e) => setEditTitle(e.target.value)}
                                     disabled={saving}
                                 />
                             </div>

                             <div className="resourcedetail-edit-field">
                                 <label htmlFor="edit-resource-access">
                                     Access Level
                                 </label>

                                 <select
                                     id="edit-resource-access"
                                     value={editAccessLevel}
                                     onChange={(e) =>
                                         setEditAccessLevel(e.target.value)
                                     }
                                     disabled={saving}
                                 >
                                     <option value="student">
                                         Students, Rangers and Admins
                                     </option>

                                     <option value="ranger">
                                         Rangers and Admins
                                     </option>

                                     <option value="admin">
                                         Admins only
                                     </option>
                                 </select>
                             </div>

                             {editError && (
                                 <p className="resourcedetail-edit-error">
                                     {editError}
                                 </p>
                             )}

                             <div className="resourcedetail-edit-actions">
                                 <button
                                     type="button"
                                     className="resourcedetail-edit-cancel"
                                     onClick={handleCancelEdit}
                                     disabled={saving}
                                 >
                                     Cancel
                                 </button>

                                 <button
                                     type="button"
                                     className="resourcedetail-edit-delete"
                                     onClick={handleDelete}
                                     disabled={saving}
                                 >
                                     Delete Resource
                                 </button>

                                 <button
                                     type="submit"
                                     className="resourcedetail-edit-save"
                                     disabled={saving}
                                 >
                                     {saving ? 'Saving...' : 'Save Changes'}
                                 </button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}
             {showDeleteConfirm && (
                 <div
                     className="resourcedetail-delete-overlay"
                     onClick={() =>
                         !saving && setShowDeleteConfirm(false)
                     }
                 >
                     <div
                         className="resourcedetail-delete-modal"
                         role="dialog"
                         aria-modal="true"
                         aria-labelledby="delete-resource-title"
                         onClick={(e) => e.stopPropagation()}
                     >
                         <div className="resourcedetail-delete-icon">
                             🗑
                         </div>

                         <h2 id="delete-resource-title">
                             Delete Resource
                         </h2>

                         <p>
                             Are you sure you want to delete "{resource?.title}"?
                             <br />
                             This action cannot be undone.
                         </p>

                         <div className="resourcedetail-delete-actions">
                             <button
                                 type="button"
                                 className="resourcedetail-delete-cancel"
                                 onClick={() =>
                                     setShowDeleteConfirm(false)
                                 }
                                 disabled={saving}
                             >
                                 Cancel
                             </button>

                             <button
                                 type="button"
                                 className="resourcedetail-delete-confirm"
                                 onClick={handleConfirmDelete}
                                 disabled={saving}
                             >
                                 {saving ? 'Deleting...' : 'Delete'}
                             </button>
                         </div>
                     </div>
                 </div>
             )}
         </div>
     );
 }