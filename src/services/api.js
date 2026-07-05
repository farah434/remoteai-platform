// ══════════════════════════════════════════════
//  RemoteAI — API Service Layer
//  All backend HTTP calls go through here
// ══════════════════════════════════════════════

// const BASE = 'https://remoteai-platform-production.up.railway.app/api';
const BASE = import.meta.env.VITE_API_URL + '/api';
// ── TOKEN HELPERS ─────────────────────────────
export const getToken = () => localStorage.getItem('remoteai_token');
export const setToken = (t) => localStorage.setItem('remoteai_token', t);
export const clearToken = () => localStorage.removeItem('remoteai_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

// ── AUTH ──────────────────────────────────────
export const authAPI = {
  signup: (name, email, password, skills) =>
    fetch(`${BASE}/auth/signup`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ name, email, password, skills }),
    }).then(handle),

  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ email, password }),
    }).then(handle),

  me: () =>
    fetch(`${BASE}/auth/me`, { headers: headers() }).then(handle),

  updateSkills: (skills) =>
    fetch(`${BASE}/auth/skills`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ skills }),
    }).then(handle),
};

// ── JOBS ──────────────────────────────────────
export const jobsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/jobs${q ? '?' + q : ''}`, { headers: headers() }).then(handle);
  },

  get: (id) =>
    fetch(`${BASE}/jobs/${id}`, { headers: headers() }).then(handle),

  matches: () =>
    fetch(`${BASE}/jobs/matches`, { headers: headers() }).then(handle),
};

// ── AI MENTOR ─────────────────────────────────
export const mentorAPI = {
  chat: (message, userSkills) =>
    fetch(`${BASE}/mentor/chat`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ message, userSkills }),
    }).then(handle),
};

// ── AI RESUME ANALYZER (formerly "CV Reviewer") ─
export const cvAPI = {
  review: (cvText) =>
    fetch(`${BASE}/cv/review`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ cvText }),
    }).then(handle),
};

// ── RESUME BUILDER ─────────────────────────────
// Saves/loads the structured resume JSON on the logged-in user's profile.
// save() requires the server.js patch (adds `resume` field + PUT route).
// get() reuses the existing /api/auth/me route — no extra backend route
// needed, since /api/auth/me already returns the full user document.
// If either call fails (offline, old backend, etc.) callers fall back
// to localStorage — see AuthContext.jsx / ResumeBuilder.jsx.
export const resumeAPI = {
  get: () =>
    fetch(`${BASE}/auth/me`, { headers: headers() }).then(handle).then(u => u.resume || null),

  save: (resume) =>
    fetch(`${BASE}/resume`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ resume }),
    }).then(handle),
};
