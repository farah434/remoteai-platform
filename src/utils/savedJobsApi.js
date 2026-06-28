// src/utils/savedJobsApi.js
// ─────────────────────────────────────────────────────────────
// Thin wrappers around the Phase 6 Part 2B backend endpoints.
// All functions accept a JWT `token` string.
// ─────────────────────────────────────────────────────────────

const BASE = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── SAVED JOBS ────────────────────────────────────────────────

/** Returns array of job-id strings the user has saved. */
export async function fetchSavedIds(token) {
  const res = await fetch(`${BASE}/saved-jobs/ids`, { headers: authHeaders(token) });
  return res.ok ? res.json() : [];
}

/** Returns array of SavedJob documents (each has .job populated). */
export async function fetchSavedJobs(token) {
  const res = await fetch(`${BASE}/saved-jobs`, { headers: authHeaders(token) });
  return res.ok ? res.json() : [];
}

/** Save a job. Returns { success, saved } or { error }. */
export async function saveJob(token, jobId) {
  const res = await fetch(`${BASE}/saved-jobs/${jobId}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return res.json();
}

/** Unsave a job. Returns { success } or { error }. */
export async function unsaveJob(token, jobId) {
  const res = await fetch(`${BASE}/saved-jobs/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.json();
}

// ── APPLICATIONS ──────────────────────────────────────────────

/** Returns array of job-id strings the user has applied to. */
export async function fetchAppliedIds(token) {
  const res = await fetch(`${BASE}/applications/ids`, { headers: authHeaders(token) });
  return res.ok ? res.json() : [];
}

/** Returns array of Application documents (each has .job populated). */
export async function fetchApplications(token) {
  const res = await fetch(`${BASE}/applications`, { headers: authHeaders(token) });
  return res.ok ? res.json() : [];
}

/** Apply for a job. Returns { success, application } or { error }. */
export async function applyToJob(token, jobId, notes = '') {
  const res = await fetch(`${BASE}/applications/${jobId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

/** Update application status. status ∈ ['Applied','Interview','Rejected','Offer']. */
export async function updateApplicationStatus(token, jobId, status) {
  const res = await fetch(`${BASE}/applications/${jobId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return res.json();
}

/** Withdraw / delete an application. */
export async function withdrawApplication(token, jobId) {
  const res = await fetch(`${BASE}/applications/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.json();
}