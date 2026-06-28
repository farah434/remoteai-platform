// ══════════════════════════════════════════════
//  RemoteAI — AI Service
//  Phase 6: Centralised API calls for all AI features
// ══════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper: attach Authorization header if token exists
function authHeaders() {
  const token = localStorage.getItem('remoteai_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Generic fetch wrapper with error normalisation
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── CV REVIEW ─────────────────────────────────
// Returns: { atsScore, summary, strengths, weaknesses,
//            detectedSkills, missingSkills, suggestions, careerSuggestions }
export async function reviewCV(cvText, { userSkills = [], targetRole = '' } = {}) {
  return apiFetch('/api/cv/review', {
    method: 'POST',
    body: JSON.stringify({ cvText, userSkills, targetRole }),
  });
}

// ── AI MENTOR CHAT ────────────────────────────
// Returns: { reply }
export async function sendMentorMessage(message, {
  userSkills = [],
  experience = '',
  targetRole = '',
  conversationHistory = [],
} = {}) {
  return apiFetch('/api/mentor/chat', {
    method: 'POST',
    body: JSON.stringify({ message, userSkills, experience, targetRole, conversationHistory }),
  });
}

// ── JOB MATCH EXPLANATION ─────────────────────
// Returns: { matchScore, verdict, strengths, gaps, actionPlan }
export async function explainJobMatch(jobId) {
  return apiFetch('/api/jobs/match-explain', {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}

// ── CAREER SUGGESTIONS ────────────────────────
// Returns: { headline, currentLevel, targetRole, roadmap,
//            skillsToLearn, resources, salaryOutlook, quickWins }
export async function getCareerSuggestions({ cvText = '' } = {}) {
  return apiFetch('/api/career/suggestions', {
    method: 'POST',
    body: JSON.stringify({ cvText }),
  });
}

// ── JOB MATCHES (scored list) ─────────────────
// Returns array of { jobId, title, company, matchScore,
//                    matchedSkills, missingSkills, explanation }
export async function getJobMatches() {
  return apiFetch('/api/jobs/matches');
}
