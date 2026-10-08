// Base URL of the backend API.
// Set VITE_API_BASE when building (for example in the Amplify console) to point
// at the deployed API. Without it, the app talks to the local dev server.
export const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
