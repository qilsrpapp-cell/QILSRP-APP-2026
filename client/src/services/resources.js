import { authFetch } from './auth';
import defaultResourceImage from '../assets/logo.jpg';

const API_BASE = 'http://localhost:3000';

export async function fetchCohorts() {
  const res = await authFetch(`${API_BASE}/cohort/`);

  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error('Failed to load cohorts.');
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchResources(folderID = 1) {
  const res = await authFetch(`${API_BASE}/folder/${folderID}/contents`);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to load resources.');
  }

  const backendResources = data.resources ?? [];

  return backendResources.map(resource => ({
    id: resource.id,
    title: resource.title || 'Untitled Resource',
    description: resource.description || '',
    imageUrl: defaultResourceImage,
    fileType: resource.type?.toUpperCase() || 'FILE',
    fileSize: resource.fileSize || 'Unknown size',
    category: resource.category || 'General',
    type: resource.type || 'Resource',
    date: resource.created || new Date().toISOString(),
    fileRef: resource.fileRef || resource.file_ref || '',
    accessLevel: resource.accessLevel || resource.access_level || '',
  }));
}

export async function fetchResourceById(resourceID) {
  const res = await authFetch(`${API_BASE}/resource/${resourceID}`);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to load resource.');
  }

  return {
    id: data.id,
    title: data.title || 'Untitled Resource',
    description: data.description || '',
    imageUrl: defaultResourceImage,
    fileType: data.type?.toUpperCase() || 'FILE',
    fileSize: data.fileSize || 'Unknown size',
    category: data.category || 'General',
    type: data.type || 'Resource',
    date: data.created || new Date().toISOString(),
    fileRef: data.fileRef || data.file_ref || '',
    accessLevel: data.accessLevel || data.access_level || '',
    uploaderID: data.uploaderID ?? data.uploader_id,
    parentID: data.parentID ?? data.parent_id,
    extension: data.extension || '',
    mimeType: data.mimeType || data.mime_type || '',
  };
}

export async function fetchResourceDownloadUrl(resourceID) {
  const res = await authFetch(`${API_BASE}/resource/${resourceID}/download`);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to download resource.');
  }

  if (!data.downloadURL) {
    throw new Error('Download URL was not returned by the server.');
  }

  return data.downloadURL;
}

export async function createResourceUpload(resourceData) {
  const res = await authFetch(`${API_BASE}/resource/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resourceData),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to create resource.');
  }

  if (!data.resourceID || !data.uploadURL) {
    throw new Error('Resource ID or upload URL was not returned by the server.');
  }

  return {
    resourceID: data.resourceID,
    uploadURL: data.uploadURL,
  };
}

// Uploads the file to S3 via the local Vite proxy using the presigned URL
export async function uploadResourceFile(uploadURL, file) {
  const s3URL = new URL(uploadURL);
  const proxyURL = `/s3-upload${s3URL.pathname}${s3URL.search}`;

  const res = await fetch(proxyURL, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error('Failed to upload resource file.');
  }
}

export async function completeResourceUpload(resourceID) {
  const res = await authFetch(`${API_BASE}/resource/${resourceID}/complete`, {
    method: 'PUT',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to complete resource upload.');
  }

  return data;
}

export async function updateResource(resourceID, updates) {
  const res = await authFetch(`${API_BASE}/resource/${resourceID}/edit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update resource.');
  }

  return data;
}

export function getResourceFileMetadata(file) {
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  const mimeType = file.type || 'application/octet-stream';

  let type = '';

  if (mimeType.startsWith('image/')) {
    type = 'image';
  } else if (mimeType.startsWith('video/')) {
    type = 'video';
  } else if (mimeType.startsWith('audio/')) {
    type = 'audio';
  } else if (mimeType === 'application/pdf' || extension === 'pdf') {
    type = 'pdf';
  } else if (['doc', 'docx'].includes(extension)) {
    type = 'document';
  } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
    type = 'spreadsheet';
  } else if (['ppt', 'pptx'].includes(extension)) {
    type = 'presentation';
  } else {
    throw new Error('Unsupported resource file type.');
  }

  return { type, extension, mimeType };
}

export function getResourceFilterOptions(resources) {
  const categories = ['All Categories', ...new Set(resources.map(r => r.category))];
  const types = ['All Types', ...new Set(resources.map(r => r.type))];
  return { categories, types };
}

export async function deleteResource(resourceID) {
  const res = await authFetch(`${API_BASE}/resource/${resourceID}/delete`, {
    method: 'DELETE',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to delete resource.');
  }

  return data;
}
