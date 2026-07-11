// ══════════════════════════════════════════════
//  RemoteAI — Backend Server
//  Phase 4: Full Stack Auth + Jobs API
//  Phase 5: AI Matching + Mentor + CV Review
//  Phase 6: Real AI Integration (Google Gemini)
// ══════════════════════════════════════════════
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import cron from 'node-cron';

dotenv.config();

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'https://remoteai-platform.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: ' + origin));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'remoteai_dev_secret';

const MONGO_URI = process.env.MONGODB_URI;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

// ── GEMINI AI HELPER ──────────────────────────
// Calls Google Gemini API and returns the text response.
// Falls back gracefully if the API key is missing or the call fails.

async function callGemini(prompt, fallbackFn) {
  if (!GEMINI_API_KEY) {
    console.warn('[AI] GEMINI_API_KEY not set — using fallback logic.');
    return fallbackFn ? fallbackFn() : null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AI] Gemini API error:', err);
      return fallbackFn ? fallbackFn() : null;
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences if present, then parse JSON
    const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[AI] Gemini call failed:', err.message);
    return fallbackFn ? fallbackFn() : null;
  }
}

// ── SCHEMAS ───────────────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  skills: [String],
  experience: { type: String, default: '' },    // e.g. "2 years"
  targetRole: { type: String, default: '' },     // e.g. "Full Stack Developer"
  resume: { type: mongoose.Schema.Types.Mixed, default: null }, // AI Resume Builder data
  createdAt: { type: Date, default: Date.now },
});

const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  logo: String,
  logoColor: String,
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'freelance'] },
  level: { type: String, enum: ['beginner', 'mid', 'senior'] },
  remote: { type: Boolean, default: true },
  salary: String,
  location: { type: String, default: 'Worldwide' },
  tags: [String],
  skills: [String],
  description: String,
  posted: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  // Phase 6 Part 2A — Real Jobs Integration
  source: { type: String, enum: ['seed', 'api'], default: 'seed' },
  externalId: { type: String, default: null, index: true },   // Provider-prefixed unique ID (e.g. Remotive's raw ID, "arbeitnow_<slug>")
  applyUrl: { type: String, default: null },
  lastFetched: { type: Date, default: null },
  // Multi-provider support — additive fields, both default to null so existing
  // documents and existing API consumers are unaffected.
  provider: { type: String, default: null, index: true },     // 'remotive' | 'arbeitnow' | 'himalayas' | future providers
  dedupKey: { type: String, default: null, index: true },     // normalized "company|title" used to catch the same job posted via 2+ providers
  // Himalayas-only (additive, always null for other providers) — the provider's own
  // stated expiry timestamp, used to deactivate stale listings without needing a
  // full-feed sweep (see fetchHimalayasJobs / runSync).
  expiresAt: { type: Date, default: null },
  // Himalayas-only (additive) — normalized applyUrl, used as an extra dedup guard
  // (see normalizeApplyUrlForDedup / fetchHimalayasJobs). Only Himalayas populates
  // this; Remotive/Arbeitnow are untouched and keep relying on dedupKey + externalId.
  applyUrlKey: { type: String, default: null, index: true },
});

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);

// ── AUTH MIDDLEWARE ────────────────────────────

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ══════════════════════════════════════════════
//  PHASE 4 — AUTH ROUTES
// ══════════════════════════════════════════════

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, skills } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, skills: skills || [] });
    const token = jwt.sign({ id: user._id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, skills: user.skills } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, skills: user.skills } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/auth/skills', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { skills: req.body.skills || [] },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update full profile (experience, targetRole, skills)
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { skills, experience, targetRole } = req.body;
    const update = {};
    if (skills !== undefined) update.skills = skills;
    if (experience !== undefined) update.experience = experience;
    if (targetRole !== undefined) update.targetRole = targetRole;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  AI RESUME BUILDER — save resume data to profile
// ══════════════════════════════════════════════

app.put('/api/resume', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { resume: req.body.resume ?? null },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 5 — JOBS ROUTES
// ══════════════════════════════════════════════

app.get('/api/jobs', async (req, res) => {
  try {
    const { type, level, search, category } = req.query;

    // Only serve real API jobs — never expose seed/demo data to users
    const filter = {
      active: true,
      source: 'api',
      externalId: { $ne: null },
      applyUrl: { $ne: null },
    };

    if (type) filter.type = type;
    if (level) filter.level = level;

    if (category && category !== 'all') {
      const catKeywords = CATEGORY_KEYWORDS[category] || [];
      if (catKeywords.length > 0) {
        const catRegex = catKeywords.map(k => new RegExp(k, 'i'));
        filter.$or = [
          { title: { $in: catRegex } },
          { tags: { $in: catRegex } },
          { skills: { $in: catRegex } },
        ];
      }
    }

    if (search) {
      const sq = { $regex: search, $options: 'i' };
      const searchConditions = [
        { title: sq },
        { company: sq },
        { skills: { $elemMatch: sq } },
        { tags: { $elemMatch: sq } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const jobs = await Job.find(filter)
      .sort({ posted: -1, lastFetched: -1 })
      .limit(500);

    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PHASE 6: AI-POWERED JOB MATCHING ──────────
app.get('/api/jobs/matches', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const jobs = await Job.find({ active: true, source: 'api', externalId: { $ne: null }, applyUrl: { $ne: null } });
    const userSkills = (user.skills || []).map(s => s.toLowerCase().trim());

    // --- Base score calculation (same as Phase 5) ---
    const scored = jobs.map(job => {
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());
      let matched = 0, partial = 0;

      for (const js of jobSkills) {
        if (userSkills.includes(js)) matched++;
        else if (userSkills.some(us => us.includes(js) || js.includes(us))) partial++;
      }

      const score = jobSkills.length > 0
        ? Math.min(Math.round(((matched + partial * 0.5) / jobSkills.length) * 100), 99)
        : 0;

      const matchedSkills = jobSkills.filter(js =>
        userSkills.includes(js) || userSkills.some(us => us.includes(js) || js.includes(us))
      );
      const missingSkills = jobSkills.filter(js =>
        !userSkills.includes(js) && !userSkills.some(us => us.includes(js) || js.includes(us))
      );

      // Phase 6: richer base explanation (AI explanation added per-job on demand)
      const explanation = score >= 70
        ? `Strong match — you have ${matchedSkills.length} of ${jobSkills.length} required skills.`
        : score >= 40
        ? `Partial match — ${matchedSkills.length} skills align, but you are missing ${missingSkills.length} key skills.`
        : `Low match — consider learning ${missingSkills.slice(0, 2).join(', ')} to qualify.`;

      return {
        jobId: job._id,
        title: job.title,
        company: job.company,
        matchScore: score,
        matchedSkills,
        missingSkills,
        explanation,                                        // Phase 6: richer text
        suggestions: missingSkills.slice(0, 2).map(s =>    // kept for compatibility
          `Learn ${s} to improve your match`
        ),
      };
    });

    res.json(scored.sort((a, b) => b.matchScore - a.matchScore));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PHASE 6: AI explanation for a single job match ──
app.post('/api/jobs/match-explain', auth, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    const user = await User.findById(req.user.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const prompt = `
You are a career advisor AI. Analyze how well this candidate matches the job and return JSON only.

Candidate skills: ${(user.skills || []).join(', ')}
Experience: ${user.experience || 'not specified'}
Target role: ${user.targetRole || 'not specified'}

Job: ${job.title} at ${job.company}
Level: ${job.level}
Required skills: ${(job.skills || []).join(', ')}
Description: ${job.description || ''}

Return ONLY a JSON object with these exact keys:
{
  "matchScore": <number 0-99>,
  "verdict": "<one sentence overall verdict>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "actionPlan": ["<step 1>", "<step 2>", "<step 3>"]
}
`;

    // Fallback: generate structured response without AI
    const fallback = () => {
      const userSkills = (user.skills || []).map(s => s.toLowerCase());
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());
      const matched = jobSkills.filter(s => userSkills.includes(s));
      const missing = jobSkills.filter(s => !userSkills.includes(s));
      const score = jobSkills.length > 0
        ? Math.min(Math.round((matched.length / jobSkills.length) * 100), 99)
        : 0;
      return {
        matchScore: score,
        verdict: score >= 60
          ? `You are a good fit for ${job.title} with ${matched.length} matching skills.`
          : `You need to build more skills to qualify for ${job.title}.`,
        strengths: matched.slice(0, 3).map(s => `You know ${s}`),
        gaps: missing.slice(0, 3).map(s => `Missing: ${s}`),
        actionPlan: missing.slice(0, 3).map(s => `Learn ${s} — search tutorials on freeCodeCamp or Coursera`),
      };
    };

    const result = await callGemini(prompt, fallback);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/jobs/sync-status ──────────────────
// Returns when jobs were last synced, total job counts by source, and the
// current state of the background sync scheduler.
// NOTE: this fixed-path route must stay registered before GET /api/jobs/:id —
// otherwise Express would match "sync-status" as an :id value instead.
app.get('/api/jobs/sync-status', async (req, res) => {
  try {
    const [total, seedCount, apiCount, lastApiJob, remotiveCount, arbeitnowCount, himalayasCount, jobicyCount, remoteokCount] = await Promise.all([
      Job.countDocuments({ active: true }),
      Job.countDocuments({ active: true, source: 'seed' }),
      Job.countDocuments({ active: true, source: 'api' }),
      Job.findOne({ source: 'api' }).sort({ lastFetched: -1 }).select('lastFetched'),
      // Remotive = none of the other providers' prefixes. Must exclude ALL of
      // them, or a newly-added provider's jobs would be miscounted here.
      Job.countDocuments({ active: true, source: 'api', externalId: { $not: /^(arbeitnow_|himalayas_|jobicy_|remoteok_)/ } }),
      Job.countDocuments({ active: true, source: 'api', externalId: /^arbeitnow_/ }),
      Job.countDocuments({ active: true, source: 'api', externalId: /^himalayas_/ }),
      Job.countDocuments({ active: true, source: 'api', externalId: /^jobicy_/ }),
      Job.countDocuments({ active: true, source: 'api', externalId: /^remoteok_/ }),
    ]);
    res.json({
      total,
      seedJobs: seedCount,
      apiJobs: apiCount,
      lastSynced: lastApiJob?.lastFetched || null,
      // New, additive fields — existing consumers of this endpoint are unaffected.
      syncInProgress: syncState.inProgress,
      lastSyncTrigger: syncState.lastRunTrigger,
      lastSyncError: syncState.lastError,
      lastSyncDeactivated: syncState.deactivatedLastRun,
      syncRunCount: syncState.runCount,
      syncIntervalCron: SYNC_INTERVAL_CRON,
      apiJobsByProvider: { remotive: remotiveCount, arbeitnow: arbeitnowCount, himalayas: himalayasCount, jobicy: jobicyCount, remoteok: remoteokCount },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  SEO — CATEGORY ROUTES
//  Read-only, additive. Registered before GET /api/jobs/:id for the same
//  reason sync-status is: a different fixed path prefix entirely
//  (/api/categories vs /api/jobs), so there is no shadowing risk either way,
//  but keeping all fixed-path GETs together above the wildcard matches the
//  existing convention in this file.
// ══════════════════════════════════════════════

app.get('/api/categories', async (req, res) => {
  try {
    const stats = await getCategoryStats();
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const orFilter = buildCategoryOrFilter(slug);
    if (!orFilter) return res.status(404).json({ error: 'Category not found' });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const filter = { ...baseActiveApiJobFilter(), $or: orFilter };

    const [jobCount, jobs, allStats] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter).sort({ posted: -1, lastFetched: -1 }).skip((page - 1) * limit).limit(limit),
      getCategoryStats(),
    ]);

    if (jobCount === 0) return res.status(404).json({ error: 'Category not found' });

    res.json({
      slug,
      label: categoryLabel(slug),
      jobCount,
      page,
      limit,
      totalPages: Math.max(Math.ceil(jobCount / limit), 1),
      jobs,
      relatedCategories: pickRelatedCategories(allStats, slug),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  SEO — COMPANY ROUTES
//  Read-only, additive. Same fixed-path-before-wildcard placement as above.
// ══════════════════════════════════════════════

app.get('/api/companies', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const search = (req.query.search || '').trim().toLowerCase();

    let directory = await getCompanyDirectory();
    if (search) directory = directory.filter(c => c.name.toLowerCase().includes(search));

    const total = directory.length;
    const start = (page - 1) * limit;
    const companies = directory.slice(start, start + limit).map(c => ({
      slug: c.slug, name: c.name, logo: c.logo, logoColor: c.logoColor, jobCount: c.jobCount,
    }));

    res.json({ companies, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/companies/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const directory = await getCompanyDirectory();
    const entry = directory.find(c => c.slug === slug);
    if (!entry) return res.status(404).json({ error: 'Company not found' });

    const categories = new Set();
    const skills = new Set();
    const locations = new Set();
    const jobTypes = new Set();
    for (const job of entry.jobs) {
      (job.skills || []).forEach(s => skills.add(s));
      if (job.location) locations.add(job.location);
      if (job.type) jobTypes.add(job.type);
      categoriesForJob(job).forEach(c => categories.add(c));
    }

    const relatedCompanies = directory
      .filter(c => c.slug !== slug)
      .slice(0, 8)
      .map(c => ({ slug: c.slug, name: c.name, logo: c.logo, logoColor: c.logoColor, jobCount: c.jobCount }));

    res.json({
      slug: entry.slug,
      name: entry.name,
      logo: entry.logo,
      logoColor: entry.logoColor,
      totalJobs: entry.jobCount,
      openJobs: entry.jobCount,
      jobs: entry.jobs.slice(0, 100),
      categories: [...categories].map(s => ({ slug: s, label: categoryLabel(s) })),
      skills: [...skills].slice(0, 20),
      locations: [...locations].slice(0, 20),
      jobTypes: [...jobTypes],
      relatedCompanies,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/jobs/:id must stay the LAST /api/jobs/* GET route registered —
// every fixed-path GET route above it (/api/jobs, /api/jobs/matches,
// /api/jobs/sync-status) would otherwise be shadowed by this wildcard.
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/jobs', auth, async (req, res) => {
  try {
    const job = await Job.create(req.body);
    res.status(201).json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/jobs/:id', auth, async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 6 — AI MENTOR CHAT (Real AI)
// ══════════════════════════════════════════════

// Kept as fallback if Gemini is unavailable
const mentorFallback = (message, userSkills) => {
  const m = message.toLowerCase();
  const skills = userSkills || [];

  if (m.includes('hello') || m.includes('hi'))
    return { reply: `Hello! 👋 I am your AI Career Mentor.\n\nYou have ${skills.length} skills: ${skills.slice(0, 4).join(', ')}${skills.length > 4 ? '...' : ''}.\n\nAsk me anything about your career!` };

  if (m.includes('learn') || m.includes('improve') || m.includes('roadmap')) {
    const roadmap = [];
    if (skills.some(s => ['react', 'javascript', 'html'].includes(s.toLowerCase()))) {
      if (!skills.some(s => s.toLowerCase().includes('typescript'))) roadmap.push('📘 TypeScript — Essential for frontend roles');
      if (!skills.some(s => s.toLowerCase().includes('node'))) roadmap.push('🟢 Node.js — Become a full-stack developer');
      if (!skills.some(s => s.toLowerCase().includes('test'))) roadmap.push('🧪 Jest/Testing — Required for senior roles');
    } else if (skills.some(s => ['python', 'sql'].includes(s.toLowerCase()))) {
      roadmap.push('🐼 Pandas — For data analyst roles');
      roadmap.push('📊 Power BI / Tableau — For BI positions');
    } else {
      roadmap.push('💻 JavaScript — Highest demand');
      roadmap.push('🐍 Python — AI/ML and data roles');
      roadmap.push('🗄️ SQL — Required by most companies');
    }
    return { reply: `Your Learning Roadmap:\n\n${roadmap.join('\n')}\n\nMaster one skill at a time before moving to the next. 🎯` };
  }

  if (m.includes('salary') || m.includes('earn') || m.includes('pay'))
    return { reply: `Remote Job Salary Ranges 💰\n\n• Beginner: $12–25/hr\n• Mid-level: $40–80/hr\n• Senior: $80–150/hr\n\nWith your current skills: ${skills.length > 3 ? '$30–60/hr range is realistic' : 'Add 4–5 skills to your profile first'}` };

  if (m.includes('job') || m.includes('apply') || m.includes('platform'))
    return { reply: `Top Remote Job Platforms:\n\n1. LinkedIn\n2. Upwork\n3. Fiverr\n4. Remote.co\n5. We Work Remotely\n\nCheck your AI match score on RemoteAI for the best-fit jobs! 🎯` };

  return { reply: `I am your career guide! You can ask me:\n\n• "What should I learn?" — Learning roadmap\n• "How much can I earn?" — Salary estimate\n• "Where to find jobs?" — Platform list\n• "What is my career path?" — Roadmap\n\nWhat would you like to know? 🤔` };
};

app.post('/api/mentor/chat', async (req, res) => {
  try {
    const { message, userSkills, experience, targetRole, conversationHistory } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Build conversation context for Gemini
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-6) : [];
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Mentor'}: ${h.content}`).join('\n');

    const prompt = `
You are RemoteAI's professional Career Mentor chatbot. You help remote job seekers with career advice.
Keep replies concise (max 150 words), professional, and in English only.
Use emojis sparingly for clarity.

User profile:
- Skills: ${(userSkills || []).join(', ') || 'none listed'}
- Experience: ${experience || 'not specified'}
- Target role: ${targetRole || 'not specified'}

Recent conversation:
${historyText || 'None'}

User message: "${message}"

Return ONLY a JSON object:
{
  "reply": "<your response text with optional \\n line breaks>"
}
`;

    const fallback = () => mentorFallback(message, userSkills);
    const result = await callGemini(prompt, fallback);

    res.json({ reply: result?.reply || mentorFallback(message, userSkills).reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 6 — AI CV REVIEWER (Real AI)
// ══════════════════════════════════════════════

// Fallback CV analysis used when Gemini is unavailable
const cvFallback = (cvText) => {
  const ALL_SKILLS = [
    'react', 'javascript', 'typescript', 'html', 'css', 'vue', 'angular', 'nextjs', 'node.js',
    'express', 'python', 'django', 'flask', 'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'linux', 'rest api', 'graphql',
    'figma', 'photoshop', 'illustrator', 'excel', 'pandas', 'tensorflow', 'machine learning',
    'data analysis', 'tableau', 'power bi', 'seo', 'copywriting', 'content writing',
    'communication', 'management', 'agile', 'scrum', 'jira', 'ci/cd', 'testing', 'jest',
  ];
  const HIGH_VALUE = ['react', 'node.js', 'python', 'typescript', 'aws', 'docker', 'sql', 'machine learning'];
  const lower = cvText.toLowerCase();
  const detectedSkills = ALL_SKILLS.filter(s => lower.includes(s));
  const missingSkills = HIGH_VALUE.filter(s => !lower.includes(s)).slice(0, 5);

  let score = 30;
  score += Math.min(detectedSkills.length * 5, 30);
  if (lower.includes('experience') || lower.includes('worked')) score += 10;
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university')) score += 8;
  if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) score += 10;
  if (lower.includes('github') || lower.includes('portfolio') || lower.includes('linkedin')) score += 7;
  if (/\d+\s*(year|yr)/.test(lower)) score += 5;
  score = Math.min(score, 98);

  const suggestions = [];
  if (!lower.includes('github')) suggestions.push('Add your GitHub profile link — recruiters want to see your code');
  if (!lower.includes('project')) suggestions.push('Include 2–3 personal or freelance projects with impact metrics');
  if (detectedSkills.length < 5) suggestions.push('Add more technical skills to improve ATS keyword matching');
  if (!lower.includes('linkedin')) suggestions.push('Add your LinkedIn profile URL');
  if (cvText.split(' ').length < 150) suggestions.push('Expand your CV to at least 300 words with more detail');
  if (!lower.includes('%') && !lower.includes('increased') && !lower.includes('improved'))
    suggestions.push('Quantify achievements: "Increased performance by 40%", "Served 500 users"');
  if (suggestions.length === 0) suggestions.push('Excellent CV! Tailor keywords for each specific job posting.');

  return {
    atsScore: score,
    summary: score >= 75
      ? 'Strong CV with good structure and keyword coverage.'
      : score >= 50
      ? 'Decent CV, but more technical keywords and project details are needed.'
      : 'CV needs significant improvement — add skills, projects, and measurable results.',
    strengths: detectedSkills.slice(0, 3).map(s => `Strong ${s} keyword presence`),
    weaknesses: missingSkills.slice(0, 3).map(s => `Missing high-value skill: ${s}`),
    detectedSkills,
    missingSkills,
    suitableRoles: detectedSkills.includes('react') || detectedSkills.includes('javascript')
      ? ['Frontend Developer', 'React Developer', 'UI Engineer', 'Web Developer']
      : detectedSkills.includes('python') || detectedSkills.includes('data analysis')
      ? ['Data Analyst', 'Python Developer', 'ML Engineer', 'Data Scientist']
      : detectedSkills.includes('node.js') || detectedSkills.includes('mongodb')
      ? ['Backend Developer', 'Node.js Engineer', 'Full Stack Developer', 'API Developer']
      : ['Software Developer', 'Remote Tech Worker', 'Junior Developer', 'Technical Generalist'],
    improvementPriorities: [
      { priority: 1, action: missingSkills[0] ? `Learn ${missingSkills[0]} — it appears in 60%+ of remote job listings` : 'Add quantified achievements to every role (e.g. "Reduced load time by 40%")', impact: 'High' },
      { priority: 2, action: !lower.includes('github') ? 'Add a GitHub profile link with active repositories' : 'Write a compelling 2-line professional summary at the top', impact: 'High' },
      { priority: 3, action: detectedSkills.length < 5 ? 'Expand skills section with 8–12 relevant technical keywords' : 'Add 2–3 portfolio projects with live demo links', impact: 'Medium' },
    ],
    suggestions: suggestions.slice(0, 5),
    careerSuggestions: [
      'Take an online course on Coursera or freeCodeCamp to fill skill gaps',
      'Build a portfolio project and push it to GitHub',
      'Get a certification in one of the missing high-value skills',
    ],
  };
};

app.post('/api/cv/review', async (req, res) => {
  try {
    const { cvText, userSkills, targetRole } = req.body;
    if (!cvText || cvText.trim().length < 50)
      return res.status(400).json({ error: 'CV text is too short — please paste at least 50 characters' });

    // Cap CV length to avoid excessive token usage
    const trimmedCV = cvText.slice(0, 4000);

    const prompt = `
You are an expert ATS (Applicant Tracking System) and career coach AI.
Analyze the CV below and return a structured evaluation as JSON only.

Target role: ${targetRole || 'software/tech remote work'}
Candidate skills profile: ${(userSkills || []).join(', ') || 'not provided'}

CV Text:
"""
${trimmedCV}
"""

Return ONLY a JSON object with these exact keys:
{
  "atsScore": <number 0-100, realistic ATS compatibility score>,
  "summary": "<2-sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "detectedSkills": ["<skill found in CV>"],
  "missingSkills": ["<important missing skill 1>", "<important missing skill 2>", "<important missing skill 3>", "<important missing skill 4>", "<important missing skill 5>"],
  "suitableRoles": ["<job title this CV suits best 1>", "<job title 2>", "<job title 3>", "<job title 4>"],
  "improvementPriorities": [
    { "priority": 1, "action": "<most impactful change to make>", "impact": "High" },
    { "priority": 2, "action": "<second most impactful change>", "impact": "High" },
    { "priority": 3, "action": "<third change>", "impact": "Medium" }
  ],
  "suggestions": [
    "<specific actionable suggestion 1>",
    "<specific actionable suggestion 2>",
    "<specific actionable suggestion 3>",
    "<specific actionable suggestion 4>",
    "<specific actionable suggestion 5>"
  ],
  "careerSuggestions": [
    "<personalized career growth advice 1>",
    "<personalized career growth advice 2>",
    "<personalized career growth advice 3>"
  ]
}
`;

    const result = await callGemini(prompt, () => cvFallback(cvText));
    res.json(result || cvFallback(cvText));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 6 — PERSONALIZED CAREER SUGGESTIONS
// ══════════════════════════════════════════════

app.post('/api/career/suggestions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { cvText } = req.body; // optional — if user just reviewed their CV

    const prompt = `
You are a personalized career coach AI for remote tech workers.
Generate a tailored career roadmap and learning plan for this user.

Profile:
- Name: ${user.name}
- Skills: ${(user.skills || []).join(', ') || 'none listed'}
- Experience: ${user.experience || 'not specified'}
- Target role: ${user.targetRole || 'not specified'}
${cvText ? `- CV excerpt: ${cvText.slice(0, 500)}` : ''}

Return ONLY a JSON object:
{
  "headline": "<one sentence personalized career summary>",
  "currentLevel": "<Beginner / Intermediate / Advanced>",
  "targetRole": "<inferred or confirmed target role>",
  "roadmap": [
    { "phase": "Phase 1 — <title>", "duration": "<e.g. 1-2 months>", "tasks": ["<task>", "<task>"] },
    { "phase": "Phase 2 — <title>", "duration": "<e.g. 2-3 months>", "tasks": ["<task>", "<task>"] },
    { "phase": "Phase 3 — <title>", "duration": "<e.g. 3-6 months>", "tasks": ["<task>", "<task>"] }
  ],
  "skillsToLearn": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "resources": [
    { "name": "<resource name>", "type": "<Course / Platform / Community>", "url": "<url or 'search online'>" }
  ],
  "salaryOutlook": "<expected salary range and growth potential>",
  "quickWins": ["<thing they can do this week>", "<thing they can do this week>"]
}
`;

    const fallback = () => ({
      headline: `${user.name} has a solid foundation and clear potential for remote tech roles.`,
      currentLevel: (user.skills || []).length >= 5 ? 'Intermediate' : 'Beginner',
      targetRole: user.targetRole || 'Software Developer',
      roadmap: [
        { phase: 'Phase 1 — Foundation', duration: '1-2 months', tasks: ['Master core skills already in your profile', 'Build a portfolio project', 'Set up GitHub profile'] },
        { phase: 'Phase 2 — Growth', duration: '2-3 months', tasks: ['Learn one high-demand skill (TypeScript, Docker, or SQL)', 'Contribute to an open-source project', 'Apply to 5 remote jobs per week'] },
        { phase: 'Phase 3 — Launch', duration: '3-6 months', tasks: ['Land first remote contract or freelance client', 'Build 3 portfolio projects', 'Get a professional certification'] },
      ],
      skillsToLearn: ['TypeScript', 'Docker', 'SQL'],
      resources: [
        { name: 'freeCodeCamp', type: 'Platform', url: 'https://freecodecamp.org' },
        { name: 'The Odin Project', type: 'Course', url: 'https://theodinproject.com' },
        { name: 'Remote.co', type: 'Community', url: 'https://remote.co' },
      ],
      salaryOutlook: (user.skills || []).length >= 5
        ? 'With your current skills, expect $30–60/hr for remote contract roles.'
        : 'Build 5+ skills to target $20–40/hr beginner remote positions.',
      quickWins: ['Update your LinkedIn headline with your target role', 'Push a project to GitHub today'],
    });

    const result = await callGemini(prompt, fallback);
    res.json(result || fallback());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 6 PART 2A — REAL JOBS INTEGRATION
//  Source: Remotive API (free, no key required)
//  https://remotive.com/api/remote-jobs
// ══════════════════════════════════════════════

// Colour palette cycled for API jobs that have no branding
const LOGO_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316'];

// Category keyword map used by GET /api/jobs?category=X to filter by domain
const CATEGORY_KEYWORDS = {
  // ── Original 14 — UNCHANGED. Existing /api/jobs?category=X behavior for
  // these values is not modified in any way. ──
  'software-dev':    ['developer', 'engineer', 'software', 'fullstack', 'backend', 'frontend', 'node', 'react', 'python', 'java', 'ruby', 'golang', 'php', 'typescript'],
  'ai-data':         ['data', 'analyst', 'machine learning', 'ai', 'ml', 'data science', 'nlp', 'llm', 'analytics', 'tensorflow', 'pytorch'],
  'design':          ['design', 'ux', 'ui', 'figma', 'product designer', 'graphic', 'motion', 'visual'],
  'writing':         ['writer', 'content', 'copywriter', 'editor', 'technical writer', 'documentation', 'blog'],
  'marketing':       ['marketing', 'growth', 'seo', 'social media', 'email marketing', 'brand', 'campaign', 'ads', 'ppc'],
  'customer-support':['support', 'customer success', 'customer service', 'helpdesk', 'zendesk', 'account manager'],
  'virtual-assistant':['virtual assistant', 'executive assistant', 'administrative', 'va ', 'admin'],
  'sales':           ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'revenue'],
  'finance':         ['finance', 'accounting', 'bookkeeper', 'cfo', 'controller', 'financial analyst', 'tax'],
  'education':       ['teacher', 'tutor', 'instructor', 'education', 'elearning', 'curriculum', 'trainer'],
  'devops':          ['devops', 'sre', 'infrastructure', 'cloud', 'aws', 'kubernetes', 'docker', 'cicd', 'platform engineer'],
  'qa-testing':      ['qa', 'quality assurance', 'tester', 'test engineer', 'automation test', 'sdet'],
  'product':         ['product manager', 'product owner', 'scrum master', 'agile coach', 'pm '],
  'cybersecurity':   ['security', 'infosec', 'penetration', 'soc analyst', 'cybersecurity', 'devsecops'],

  // ── New — additive only, for SEO category pages (Task: dynamic categories).
  // These are new keys; they cannot change matching behavior for any of the
  // 14 keys/values above or for any existing category param the frontend
  // already sends. ──
  'frontend':              ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'next.js', 'css', 'html'],
  'backend':               ['backend', 'back-end', 'back end', 'api developer', 'server-side', 'node.js', 'django', 'rails', 'spring'],
  'fullstack':             ['fullstack', 'full-stack', 'full stack'],
  'mobile-development':    ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin'],
  'ui-design':             ['ui designer', 'ui design', 'interface design', 'figma'],
  'ux-design':             ['ux designer', 'ux design', 'user experience', 'user research', 'usability'],
  'graphic-design':        ['graphic design', 'graphic designer', 'illustrator', 'branding designer'],
  'product-design':        ['product designer', 'product design'],
  'data-science':          ['data scientist', 'data science', 'statistics', 'predictive modeling'],
  'data-engineering':      ['data engineer', 'data engineering', 'etl', 'data pipeline', 'data warehouse'],
  'machine-learning':      ['machine learning', 'ml engineer', 'deep learning', 'pytorch', 'tensorflow'],
  'artificial-intelligence':['artificial intelligence', ' ai ', 'ai engineer', 'llm', 'genai', 'generative ai'],
  'cloud-computing':       ['cloud', 'aws', 'azure', 'gcp', 'cloud engineer', 'cloud architect'],
  'blockchain':            ['blockchain', 'smart contract', 'solidity', 'defi'],
  'web3':                  ['web3', 'web 3', 'crypto', 'nft', 'dao'],
  'game-development':      ['game developer', 'game development', 'unity', 'unreal engine', 'gameplay'],
  'hr':                    ['human resources', 'hr generalist', 'hr manager', 'people operations'],
  'recruiting':            ['recruiter', 'recruiting', 'talent acquisition', 'sourcer', 'headhunter'],
  'accounting':            ['accountant', 'accounting', 'bookkeeping', 'accounts payable', 'accounts receivable'],
  'business-development':  ['business development', 'partnerships manager', 'biz dev'],
  'ecommerce':             ['ecommerce', 'e-commerce', 'shopify', 'online store', 'marketplace manager'],
  'operations':            ['operations manager', 'operations', 'ops manager', 'logistics'],
  'healthcare':            ['healthcare', 'nurse', 'clinical', 'medical', 'telehealth'],
  'legal':                 ['legal counsel', 'attorney', 'paralegal', 'compliance officer', 'contracts manager'],
  'translation':           ['translator', 'translation', 'localization', 'interpreter'],
  'video-editing':         ['video editor', 'video editing', 'motion graphics', 'premiere pro', 'after effects'],
  'social-media':          ['social media manager', 'social media', 'community manager', 'instagram', 'tiktok'],
  'no-code':               ['no-code', 'no code', 'bubble.io', 'webflow'],
  'low-code':              ['low-code', 'low code', 'power apps', 'outsystems'],
  'project-management':    ['project manager', 'project management', 'pmp', 'program manager'],
  'technical-writing':     ['technical writer', 'technical writing', 'api documentation'],
  'copywriting':           ['copywriter', 'copywriting', 'ad copy'],
  'seo':                   ['seo specialist', 'seo', 'search engine optimization', 'link building'],
  'it-support':            ['it support', 'help desk', 'desktop support', 'technical support engineer'],
  'network-engineering':   ['network engineer', 'networking', 'cisco', 'network administrator'],
  'database-administration':['database administrator', 'dba', 'database engineer', 'postgresql admin', 'mysql admin'],
};

// Human-readable labels for every category slug above — powers page titles,
// H1s, breadcrumbs, and sitemap entries. Every key in CATEGORY_KEYWORDS
// should have a matching label here; falls back to a title-cased slug if
// a label is ever missing (see categoryLabel() below).
const CATEGORY_LABELS = {
  'software-dev': 'Software Development', 'ai-data': 'AI & Data', 'design': 'Design',
  'writing': 'Writing', 'marketing': 'Marketing', 'customer-support': 'Customer Support',
  'virtual-assistant': 'Virtual Assistant', 'sales': 'Sales', 'finance': 'Finance',
  'education': 'Education', 'devops': 'DevOps', 'qa-testing': 'QA & Testing',
  'product': 'Product Management', 'cybersecurity': 'Cybersecurity',
  'frontend': 'Frontend Development', 'backend': 'Backend Development', 'fullstack': 'Full Stack Development',
  'mobile-development': 'Mobile Development', 'ui-design': 'UI Design', 'ux-design': 'UX Design',
  'graphic-design': 'Graphic Design', 'product-design': 'Product Design', 'data-science': 'Data Science',
  'data-engineering': 'Data Engineering', 'machine-learning': 'Machine Learning',
  'artificial-intelligence': 'Artificial Intelligence', 'cloud-computing': 'Cloud Computing',
  'blockchain': 'Blockchain', 'web3': 'Web3', 'game-development': 'Game Development',
  'hr': 'Human Resources', 'recruiting': 'Recruiting', 'accounting': 'Accounting',
  'business-development': 'Business Development', 'ecommerce': 'Ecommerce', 'operations': 'Operations',
  'healthcare': 'Healthcare', 'legal': 'Legal', 'translation': 'Translation',
  'video-editing': 'Video Editing', 'social-media': 'Social Media', 'no-code': 'No-Code',
  'low-code': 'Low-Code', 'project-management': 'Project Management', 'technical-writing': 'Technical Writing',
  'copywriting': 'Copywriting', 'seo': 'SEO', 'it-support': 'IT Support',
  'network-engineering': 'Network Engineering', 'database-administration': 'Database Administration',
};

function categoryLabel(slug) {
  return CATEGORY_LABELS[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ══════════════════════════════════════════════
//  SEO — CATEGORY & COMPANY AGGREGATION HELPERS
//  Read-only, additive. Does not touch the Job schema, upsertNormalizedJob,
//  runSync, or any provider fetcher. Powers GET /api/categories,
//  GET /api/companies, and the dynamic sitemap — all three reuse these same
//  functions instead of each re-implementing category/company logic.
// ══════════════════════════════════════════════

/** Generic slugify — the one slug function every SEO route reuses. */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Tiny in-memory TTL cache. Backs category stats, the company directory, and
 * the sitemap XML so a burst of crawler/user traffic doesn't re-scan the Job
 * collection on every request. Generic on purpose — one implementation,
 * reused three times, no per-feature caching logic duplicated.
 */
function createTtlCache(ttlMs) {
  let value = null;
  let expiresAt = 0;
  return {
    async get(compute) {
      if (value !== null && Date.now() < expiresAt) return value;
      value = await compute();
      expiresAt = Date.now() + ttlMs;
      return value;
    },
  };
}

const categoryStatsCache = createTtlCache(15 * 60 * 1000);   // 15 min
const companyDirectoryCache = createTtlCache(15 * 60 * 1000); // 15 min

/** The same "verified job" definition GET /api/jobs already uses. */
function baseActiveApiJobFilter() {
  return { active: true, source: 'api', externalId: { $ne: null }, applyUrl: { $ne: null } };
}

/**
 * Builds the exact same Mongo $or condition GET /api/jobs already applies
 * for ?category=X (title/tags/skills keyword match), so /api/jobs, the new
 * category pages, and the sitemap all agree on what belongs to a category.
 * Returns null for an unknown slug — callers treat that as 404.
 */
function buildCategoryOrFilter(slug) {
  const keywords = CATEGORY_KEYWORDS[slug];
  if (!keywords || keywords.length === 0) return null;
  const catRegex = keywords.map(k => new RegExp(k, 'i'));
  return [
    { title: { $in: catRegex } },
    { tags: { $in: catRegex } },
    { skills: { $in: catRegex } },
  ];
}

/**
 * One pass over the category list: count matching active jobs per slug (a
 * handful of countDocuments calls, not N re-scans of the whole collection).
 * A category is only ever returned if jobCount > 0 — never an empty page.
 */
async function computeCategoryStats() {
  const slugs = Object.keys(CATEGORY_KEYWORDS);
  const counts = await Promise.all(
    slugs.map(slug =>
      Job.countDocuments({ ...baseActiveApiJobFilter(), $or: buildCategoryOrFilter(slug) })
    )
  );
  return slugs
    .map((slug, i) => ({ slug, label: categoryLabel(slug), jobCount: counts[i] }))
    .filter(c => c.jobCount > 0)
    .sort((a, b) => b.jobCount - a.jobCount);
}

async function getCategoryStats() {
  return categoryStatsCache.get(computeCategoryStats);
}

/**
 * Related categories: the next-highest-volume categories other than the one
 * being viewed. Simple and always populated — avoids inventing a separate
 * co-occurrence model just for a "related" widget.
 */
function pickRelatedCategories(allStats, currentSlug, count = 6) {
  return allStats.filter(c => c.slug !== currentSlug).slice(0, count);
}

/**
 * Categories a single job belongs to (a job can match more than one), reusing
 * the identical CATEGORY_KEYWORDS matching logic as buildCategoryOrFilter —
 * just evaluated in JS against one document instead of as a Mongo query.
 */
function categoriesForJob(job) {
  const haystack = `${job.title || ''} ${(job.tags || []).join(' ')} ${(job.skills || []).join(' ')}`.toLowerCase();
  return Object.keys(CATEGORY_KEYWORDS).filter(slug =>
    CATEGORY_KEYWORDS[slug].some(kw => haystack.includes(kw))
  );
}

/**
 * Single pass over active/api jobs, grouped by a normalized company slug so
 * e.g. "Acme Inc" and "ACME INC." collapse onto one company page. Full job
 * documents are kept per company (not just a count) so GET /api/companies/:slug
 * needs no second query — the same fetch backs the directory list AND every
 * company's detail page.
 */
async function computeCompanyDirectory() {
  const jobs = await Job.find(baseActiveApiJobFilter()).sort({ posted: -1 }).lean();

  const bySlug = new Map();
  for (const job of jobs) {
    const name = (job.company || '').trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { slug, name, logo: job.logo, logoColor: job.logoColor, jobCount: 0, jobs: [] });
    }
    const entry = bySlug.get(slug);
    entry.jobCount++;
    entry.jobs.push(job);
  }
  return [...bySlug.values()].sort((a, b) => b.jobCount - a.jobCount);
}

async function getCompanyDirectory() {
  return companyDirectoryCache.get(computeCompanyDirectory);
}

// Remotive API category slugs to fetch — covers the full job market
const REMOTIVE_CATEGORIES = [
  'software-dev',
  'devops-sysadmin',
  'data',
  'design',
  'writing',
  'marketing',
  'customer-support',
  'sales',
  'finance-legal',
  'product',
  'hr',
  'qa',
];

/**
 * Map a Remotive job category + title to our skill tags.
 * This is intentionally broad so the AI matching engine has signal to work with.
 */
function deriveSkills(title, category, tags) {
  const combined = `${title} ${category} ${(tags || []).join(' ')}`.toLowerCase();
  const skillMap = [
    { keywords: ['react', 'next.js', 'nextjs'],        skills: ['react', 'javascript', 'html', 'css'] },
    { keywords: ['vue', 'nuxt'],                        skills: ['vue', 'javascript', 'html', 'css'] },
    { keywords: ['angular'],                            skills: ['angular', 'typescript', 'javascript'] },
    { keywords: ['frontend', 'front-end', 'ui'],        skills: ['javascript', 'html', 'css', 'react'] },
    { keywords: ['node', 'express', 'backend', 'back-end'], skills: ['node.js', 'javascript', 'express', 'rest api'] },
    { keywords: ['python', 'django', 'flask'],          skills: ['python', 'django', 'rest api'] },
    { keywords: ['devops', 'aws', 'cloud', 'infra'],    skills: ['aws', 'docker', 'linux', 'ci/cd'] },
    { keywords: ['docker', 'kubernetes', 'k8s'],        skills: ['docker', 'kubernetes', 'linux'] },
    { keywords: ['data', 'analyst', 'analytics'],       skills: ['sql', 'python', 'data analysis', 'tableau'] },
    { keywords: ['machine learning', 'ml ', 'ai '],     skills: ['python', 'machine learning', 'tensorflow', 'sql'] },
    { keywords: ['design', 'ux', 'figma'],              skills: ['figma', 'design', 'prototyping'] },
    { keywords: ['mobile', 'ios', 'android', 'flutter'],skills: ['react native', 'javascript', 'mobile'] },
    { keywords: ['php', 'laravel', 'wordpress'],        skills: ['php', 'mysql', 'html', 'css'] },
    { keywords: ['ruby', 'rails'],                      skills: ['ruby', 'rails', 'postgresql'] },
    { keywords: ['java', 'spring'],                     skills: ['java', 'spring', 'sql'] },
    { keywords: ['golang', 'go '],                      skills: ['go', 'docker', 'rest api'] },
    { keywords: ['sql', 'postgres', 'mysql', 'database'], skills: ['sql', 'postgresql', 'mysql'] },
    { keywords: ['seo', 'content', 'copywriting'],      skills: ['seo', 'content', 'writing', 'english'] },
    { keywords: ['support', 'customer'],                skills: ['communication', 'english', 'customer support'] },
    { keywords: ['project manager', 'scrum', 'agile'],  skills: ['management', 'agile', 'scrum', 'jira'] },
    { keywords: ['typescript'],                         skills: ['typescript', 'javascript'] },
    { keywords: ['graphql'],                            skills: ['graphql', 'rest api', 'javascript'] },
    { keywords: ['fullstack', 'full-stack', 'full stack'], skills: ['javascript', 'react', 'node.js', 'sql'] },
  ];

  const found = new Set();
  for (const { keywords, skills } of skillMap) {
    if (keywords.some(kw => combined.includes(kw))) {
      skills.forEach(s => found.add(s));
    }
  }
  return [...found].slice(0, 8); // cap at 8 skills
}

/**
 * Map Remotive job_type string to our enum.
 * Remotive values: "full_time", "part_time", "contract", "freelance"
 */
function normalizeType(raw) {
  if (!raw) return 'full-time';
  const r = raw.toLowerCase().replace(/_/g, '-');
  if (r.includes('part')) return 'part-time';
  if (r.includes('contract')) return 'contract';
  if (r.includes('freelance')) return 'freelance';
  return 'full-time';
}

/**
 * Infer seniority level from the job title.
 */
function inferLevel(title) {
  const t = title.toLowerCase();
  if (t.includes('senior') || t.includes('lead') || t.includes('principal') || t.includes('staff')) return 'senior';
  if (t.includes('junior') || t.includes('entry') || t.includes('intern') || t.includes('graduate')) return 'beginner';
  return 'mid';
}

/**
 * Generate a 2-letter logo abbreviation and pick a stable colour from the palette.
 */
function logoFromCompany(company, index) {
  const words = company.trim().split(/\s+/);
  const logo = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : company.slice(0, 2).toUpperCase();
  const color = LOGO_COLORS[index % LOGO_COLORS.length];
  return { logo, logoColor: color };
}

/**
 * Strip HTML tags/entities from a job description and collapse whitespace.
 * Shared by every provider so descriptions look consistent regardless of source.
 */
function stripHtml(raw) {
  return (raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

/**
 * Normalize company + title into a stable key used to catch the same real-world
 * job posting appearing through two different providers (e.g. Remotive AND
 * Arbeitnow both listing the same Greenhouse-hosted posting).
 */
function computeDedupKey(company, title) {
  const norm = (s) => (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return `${norm(company)}|${norm(title)}`;
}

/**
 * Single upsert path shared by every provider. Guarantees:
 *  - no duplicate document is ever created for the same externalId (per-provider dedup)
 *  - no duplicate document is created for the same real job posted via a
 *    different provider (cross-provider dedup, via dedupKey)
 * Returns 'inserted' | 'updated' | 'duplicate'.
 */
async function upsertNormalizedJob(jobDoc) {
  if (jobDoc.dedupKey) {
    const existingElsewhere = await Job.findOne({
      dedupKey: jobDoc.dedupKey,
      active: true,
      externalId: { $ne: jobDoc.externalId },
    }).select('_id');

    if (existingElsewhere) {
      return 'duplicate';
    }
  }

  const result = await Job.updateOne(
    { externalId: jobDoc.externalId },
    { $set: jobDoc },
    { upsert: true }
  );

  if (result.upsertedCount > 0) return 'inserted';
  if (result.modifiedCount > 0) return 'updated';
  return 'unchanged';
}

/**
 * Fetch jobs from Remotive for a single category and upsert into MongoDB.
 * Only jobs with a valid company name, title, and apply URL are stored.
 * Seed jobs (source:'seed') are never touched.
 */
async function fetchCategoryJobs(remotiveCategory, limitPerCategory = 25) {
  const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';
  const params = new URLSearchParams({
    limit: String(limitPerCategory),
    ...(remotiveCategory ? { category: remotiveCategory } : {}),
  });

  let remotiveJobs;
  try {
    const response = await fetch(`${REMOTIVE_URL}?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'RemoteAI-Platform/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Remotive API ${response.status}`);
    const data = await response.json();
    remotiveJobs = data.jobs || [];
  } catch (err) {
    console.warn(`[Jobs] Category "${remotiveCategory}" fetch failed: ${err.message}`);
    return { success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0, ids: [] };
  }

  let inserted = 0;
  let updated = 0;
  let duplicates = 0;
  const seenIds = [];

  for (let i = 0; i < remotiveJobs.length; i++) {
    const r = remotiveJobs[i];

    // Quality gate: skip jobs missing essential real data
    if (!r.id || !r.company_name || !r.title || !r.url) continue;
    // Skip jobs where the apply URL is just the Remotive homepage
    if (r.url === 'https://remotive.com') continue;

    const externalId = String(r.id);
    const skills = deriveSkills(r.title, r.category || '', r.tags || []);
    const { logo, logoColor } = logoFromCompany(r.company_name, i);
    const description = stripHtml(r.description);

    const jobDoc = {
      title: r.title,
      company: r.company_name,
      logo,
      logoColor,
      type: normalizeType(r.job_type),
      level: inferLevel(r.title),
      remote: true,
      salary: r.salary || '',
      location: r.candidate_required_location || 'Worldwide',
      tags: (r.tags || []).slice(0, 6),
      skills,
      description,
      posted: r.publication_date ? new Date(r.publication_date) : new Date(),
      active: true,
      source: 'api',
      provider: 'remotive',
      dedupKey: computeDedupKey(r.company_name, r.title),
      externalId,
      applyUrl: r.url,
      lastFetched: new Date(),
    };

    const outcome = await upsertNormalizedJob(jobDoc);
    if (outcome === 'inserted') inserted++;
    else if (outcome === 'updated') updated++;
    else if (outcome === 'duplicate') duplicates++;
    // Whether inserted, updated, or skipped as a duplicate, this Remotive
    // listing is still "seen" this run — it must not be expired below.
    seenIds.push(externalId);
  }

  return { success: true, fetched: remotiveJobs.length, inserted, updated, duplicates, ids: seenIds };
}

// ══════════════════════════════════════════════
//  PHASE 7 — ARBEITNOW INTEGRATION (2nd free provider)
//  Source: Arbeitnow Job Board API (free, no key required)
//  https://arbeitnow.com/api/job-board-api
// ══════════════════════════════════════════════

const ARBEITNOW_URL = 'https://www.arbeitnow.com/api/job-board-api';
// Not a real limit — pagination is driven entirely by the API's own "is there
// a next page?" signal (see fetchArbeitnowPage). This is only a circuit
// breaker in case the API ever misbehaves (e.g. links.next never goes null),
// so a sync can never loop indefinitely. Set high enough it should never be
// hit in normal operation (Arbeitnow's entire board is nowhere near this).
const ARBEITNOW_SAFETY_PAGE_CAP = 500;

/**
 * Map Arbeitnow's job_types array (e.g. ["Full-time"], ["Contract"]) to our enum.
 * Defensive against every shape Arbeitnow can send: a populated array, an
 * empty array ([]), a plain string, or a missing/null field entirely.
 */
function normalizeArbeitnowType(jobTypes) {
  let raw = '';
  if (Array.isArray(jobTypes)) {
    raw = jobTypes[0] || '';
  } else if (typeof jobTypes === 'string') {
    raw = jobTypes;
  }
  const first = raw.toLowerCase();
  if (first.includes('part')) return 'part-time';
  if (first.includes('contract') || first.includes('freelance')) return 'freelance';
  if (first.includes('intern')) return 'freelance';
  return 'full-time';
}

/**
 * Fetch a single page of the Arbeitnow job board API.
 * "More pages exist" is determined from the API's own pagination metadata —
 * links.next (if present) or meta.current_page < meta.last_page as a fallback —
 * never assumed from a fixed count.
 */
async function fetchArbeitnowPage(page) {
  const params = new URLSearchParams({ page: String(page) });
  const response = await fetch(`${ARBEITNOW_URL}?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'RemoteAI-Platform/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Arbeitnow API ${response.status}`);
  const data = await response.json();

  const jobs = data.data || [];
  let hasNext;
  if (data.links && 'next' in data.links) {
    hasNext = Boolean(data.links.next);
  } else if (data.meta && typeof data.meta.last_page === 'number' && typeof data.meta.current_page === 'number') {
    hasNext = data.meta.current_page < data.meta.last_page;
  } else {
    // No pagination metadata at all — treat a non-empty page as "maybe more"
    // and an empty page as the end, rather than guessing a page count.
    hasNext = jobs.length > 0;
  }

  return { jobs, hasNext };
}

/**
 * Fetch every remote job Arbeitnow currently has, paginating until the API
 * itself reports there's nothing left (see fetchArbeitnowPage), and upsert
 * into MongoDB via the same normalized schema/dedup path as Remotive.
 * Only jobs explicitly marked remote:true by Arbeitnow are imported — this
 * board also lists on-site EU roles, which are out of scope for this platform.
 * Any failure here is caught by the caller (runSync) and never affects Remotive.
 */
async function fetchArbeitnowJobs({ safetyPageCap = ARBEITNOW_SAFETY_PAGE_CAP } = {}) {
  let totalFetched = 0, inserted = 0, updated = 0, duplicates = 0, skippedNonRemote = 0;
  const seenIds = [];
  let page = 1;
  let completedAllPages = false;
  let hitSafetyCap = false;

  while (true) {
    let pageResult;
    try {
      pageResult = await fetchArbeitnowPage(page);
    } catch (err) {
      console.warn(`[Jobs] Arbeitnow page ${page} fetch failed: ${err.message}`);
      // Stop paginating on error, but keep whatever we already imported —
      // this is not treated as a full sweep, so no expiry will run.
      break;
    }

    const jobs = pageResult.jobs;
    totalFetched += jobs.length;

    for (let i = 0; i < jobs.length; i++) {
      const r = jobs[i];

      // Quality gate: skip jobs missing essential real data
      if (!r.slug || !r.company_name || !r.title || !r.url) continue;
      // Only remote jobs — Arbeitnow also lists on-site EU roles
      if (r.remote !== true) { skippedNonRemote++; continue; }

      const externalId = `arbeitnow_${r.slug}`;
      const tags = (r.tags || []).slice(0, 6);
      const skills = deriveSkills(r.title, '', tags);
      const { logo, logoColor } = logoFromCompany(r.company_name, totalFetched + i);
      const description = stripHtml(r.description);

      const jobDoc = {
        title: r.title,
        company: r.company_name,
        logo,
        logoColor,
        type: normalizeArbeitnowType(r.job_types),
        level: inferLevel(r.title),
        remote: true,
        salary: r.salary || '',
        location: r.location || 'Worldwide',
        tags,
        skills,
        description,
        posted: r.created_at ? new Date(r.created_at * 1000) : new Date(),
        active: true,
        source: 'api',
        provider: 'arbeitnow',
        dedupKey: computeDedupKey(r.company_name, r.title),
        externalId,
        applyUrl: r.url,
        lastFetched: new Date(),
      };

      const outcome = await upsertNormalizedJob(jobDoc);
      if (outcome === 'inserted') inserted++;
      else if (outcome === 'updated') updated++;
      else if (outcome === 'duplicate') duplicates++;
      seenIds.push(externalId);
    }

    // Clean stop: the API itself says there's nothing more to fetch.
    if (!pageResult.hasNext) { completedAllPages = true; break; }

    // Circuit breaker: only trips if the API's pagination signal never
    // resolves to "no more pages" — not part of normal operation.
    if (page >= safetyPageCap) { hitSafetyCap = true; break; }

    page++;
    // Small delay between pages to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  if (hitSafetyCap) {
    console.warn(`[Jobs] Arbeitnow: hit the ${safetyPageCap}-page safety circuit breaker without the API signaling an end — this run is not treated as a full sweep. This should not happen in normal operation; check Arbeitnow's pagination response shape.`);
  }

  console.log(`[Jobs] Arbeitnow fetch complete — pages: ${page}, fetched: ${totalFetched}, remote: ${seenIds.length}, non-remote skipped: ${skippedNonRemote}, inserted: ${inserted}, updated: ${updated}, duplicates: ${duplicates}`);

  return {
    success: seenIds.length > 0 || completedAllPages,
    fetched: totalFetched,
    inserted,
    updated,
    duplicates,
    skippedNonRemote,
    seenIds,
    // Only a run that reached the true end of the board (no more pages, or the
    // board is simply empty) is eligible to expire stale Arbeitnow jobs.
    isFullSweep: completedAllPages,
  };
}


// ══════════════════════════════════════════════
//  PHASE 8 — HIMALAYAS INTEGRATION (3rd free provider)
//  Source: Himalayas Remote Jobs API (free, no key required)
//  https://himalayas.app/jobs/api/search
// ══════════════════════════════════════════════

const HIMALAYAS_SEARCH_URL = 'https://himalayas.app/jobs/api/search';
// Himalayas' feed is huge (~100k jobs) and only returns 20 records per page.
// Sweeping the whole feed every sync isn't realistic, so — like Remotive's
// per-category limit — we intentionally sample the most recent N pages each
// run (sort=recent) rather than trying to paginate to the end. Because this
// is a deliberate partial sample (not a "we reached the end" sweep), Himalayas
// never runs the "deactivate anything not seen this run" expiry other
// providers use — see runSync. Staleness is instead handled via each job's
// own `expiryDate` (see expiresAt field / expireHimalayasJobs below).
const HIMALAYAS_MAX_PAGES = 10; // 10 pages × 20 = up to 200 jobs sampled per run

/**
 * Map Himalayas' employmentType string to our enum.
 * Himalayas values: 'Full Time' | 'Part Time' | 'Contractor' | 'Temporary' | 'Intern' | 'Volunteer' | 'Other'
 */
function normalizeHimalayasType(employmentType) {
  const t = (employmentType || '').toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contractor') || t.includes('temporary')) return 'contract';
  if (t.includes('intern') || t.includes('volunteer')) return 'freelance';
  return 'full-time';
}

/**
 * Map Himalayas' seniority array (e.g. ["Mid-level"]) to our level enum.
 * Falls back to title-based inference (inferLevel) if Himalayas doesn't supply one.
 */
function normalizeHimalayasLevel(seniority, title) {
  const s = (Array.isArray(seniority) ? seniority[0] : seniority || '').toLowerCase();
  if (s.includes('entry')) return 'beginner';
  if (s.includes('senior') || s.includes('manager') || s.includes('director') || s.includes('executive')) return 'senior';
  if (s.includes('mid')) return 'mid';
  return inferLevel(title);
}

/**
 * Himalayas has no numeric job id in its API response — `guid`/`applicationLink`
 * is itself the canonical URL (e.g. https://himalayas.app/companies/acme/jobs/react-dev-123).
 * We derive a stable external id from the URL's trailing slug so re-syncs keep
 * matching the same document via the standard externalId upsert path.
 */
function himalayasIdFromUrl(url) {
  const clean = (url || '').split(/[?#]/)[0].replace(/\/+$/, '');
  const slug = clean.split('/').pop();
  return slug ? `himalayas_${slug}` : null;
}

/**
 * Normalize an apply URL for dedup comparison: strip protocol, "www.", trailing
 * slash, and query/hash. Used only as an extra cross-provider dedup guard for
 * Himalayas (in addition to the existing externalId + dedupKey checks that
 * every provider already gets via upsertNormalizedJob).
 */
function normalizeApplyUrlForDedup(url) {
  return (url || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split(/[?#]/)[0];
}

/**
 * Fetch a single page of the Himalayas search API, sorted by most recent.
 */
async function fetchHimalayasPage(page) {
  const params = new URLSearchParams({ sort: 'recent', page: String(page) });
  const response = await fetch(`${HIMALAYAS_SEARCH_URL}?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'RemoteAI-Platform/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Himalayas API ${response.status}`);
  return response.json();
}

/**
 * Fetch up to HIMALAYAS_MAX_PAGES of the most recent Himalayas listings and
 * upsert into MongoDB via the same normalized schema/dedup path as the other
 * providers. Any failure here is caught by the caller (runSync) and never
 * affects Remotive or Arbeitnow — same provider-isolation guarantee.
 */
async function fetchHimalayasJobs({ maxPages = HIMALAYAS_MAX_PAGES } = {}) {
  let totalFetched = 0, inserted = 0, updated = 0, duplicates = 0, skipped = 0;
  const seenIds = [];
  let page = 1;
  let pagesFetched = 0;

  for (; page <= maxPages; page++) {
    let data;
    try {
      data = await fetchHimalayasPage(page);
    } catch (err) {
      console.warn(`[Jobs] Himalayas page ${page} fetch failed: ${err.message}`);
      break; // stop paginating on error; keep whatever was already imported this run
    }

    pagesFetched++;
    const jobs = data.jobs || [];
    totalFetched += jobs.length;

    for (let i = 0; i < jobs.length; i++) {
      const r = jobs[i];

      // Quality gate: skip listings missing essential real data
      if (!r.title || !r.companyName || !r.applicationLink) { skipped++; continue; }

      const externalId = himalayasIdFromUrl(r.applicationLink || r.guid);
      if (!externalId) { skipped++; continue; }

      // Extra dedup guard, on top of the externalId + dedupKey checks every
      // provider already gets via upsertNormalizedJob: catch the same apply
      // target already stored (e.g. re-fetched on an overlapping page, or a
      // slightly different slug for a listing we already have).
      const applyUrlKey = normalizeApplyUrlForDedup(r.applicationLink);
      const existingByUrl = await Job.findOne({
        active: true,
        applyUrlKey,
        externalId: { $ne: externalId },
      }).select('_id');
      if (existingByUrl) {
        duplicates++;
        seenIds.push(externalId);
        continue;
      }

      const tags = (r.categories || []).slice(0, 6);
      const skills = deriveSkills(r.title, '', tags);
      const { logo, logoColor } = logoFromCompany(r.companyName, totalFetched + i);
      const description = stripHtml(r.description || r.excerpt || '');
      const location = (r.locationRestrictions && r.locationRestrictions.length)
        ? r.locationRestrictions.join(', ')
        : 'Worldwide';
      const salary = (r.minSalary && r.maxSalary)
        ? `${r.currency || 'USD'} ${r.minSalary.toLocaleString()}–${r.maxSalary.toLocaleString()}/${r.salaryPeriod || 'year'}`
        : '';

      const jobDoc = {
        title: r.title,
        company: r.companyName,
        logo,
        logoColor,
        type: normalizeHimalayasType(r.employmentType),
        level: normalizeHimalayasLevel(r.seniority, r.title),
        remote: true,
        salary,
        location,
        tags,
        skills,
        description,
        posted: r.pubDate ? new Date(r.pubDate * 1000) : new Date(),
        active: true,
        source: 'api',
        provider: 'himalayas',
        dedupKey: computeDedupKey(r.companyName, r.title),
        externalId,
        applyUrl: r.applicationLink,
        applyUrlKey,
        lastFetched: new Date(),
        expiresAt: r.expiryDate ? new Date(r.expiryDate * 1000) : null,
      };

      const outcome = await upsertNormalizedJob(jobDoc);
      if (outcome === 'inserted') inserted++;
      else if (outcome === 'updated') updated++;
      else if (outcome === 'duplicate') duplicates++;
      seenIds.push(externalId);
    }

    // Himalayas signals more pages via totalCount vs offset+limit
    const noMoreLeft = (data.offset || 0) + (data.limit || jobs.length) >= (data.totalCount || 0);
    if (jobs.length === 0 || noMoreLeft) break;

    // Small delay between pages to be respectful to the free API
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  console.log(`[Jobs] Himalayas fetch complete — Pages: ${pagesFetched}, Fetched: ${totalFetched}, Inserted: ${inserted}, Updated: ${updated}, Duplicates: ${duplicates}, Skipped: ${skipped}`);

  return {
    success: pagesFetched > 0,
    fetched: totalFetched,
    inserted,
    updated,
    duplicates,
    skipped,
    seenIds,
    // Deliberately never a "full sweep" — we only sample recent pages, so we
    // must never treat "not seen this run" as "no longer listed" for Himalayas.
    isFullSweep: false,
  };
}

/**
 * Deactivate Himalayas jobs whose own provider-stated expiry has passed.
 * Scoped strictly to provider:'himalayas' so it can never touch Remotive or
 * Arbeitnow jobs, regardless of any bug elsewhere — this is the provider-
 * specific expiry mechanism for Himalayas (in place of a full-feed sweep,
 * which fetchHimalayasJobs deliberately never performs).
 */
async function expireHimalayasJobs() {
  const result = await Job.updateMany(
    { provider: 'himalayas', active: true, expiresAt: { $ne: null, $lt: new Date() } },
    { $set: { active: false } }
  );
  return result.modifiedCount || 0;
}

/**
 * Full sync: fetch jobs from all Remotive categories in sequence.
 * Returns aggregate stats. Non-blocking — individual category failures are skipped.
 * Also returns every externalId seen, so callers can detect/expire stale jobs.
 */
async function fetchRemoteJobs({ limit = 25, category = '' } = {}) {
  const categoriesToFetch = category ? [category] : REMOTIVE_CATEGORIES;
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0;
  let categoriesSucceeded = 0, categoriesFailed = 0;
  const allSeenIds = [];

  for (const cat of categoriesToFetch) {
    const r = await fetchCategoryJobs(cat, limit);
    totalFetched  += r.fetched  || 0;
    totalInserted += r.inserted || 0;
    totalUpdated  += r.updated  || 0;
    if (r.success) {
      categoriesSucceeded++;
      allSeenIds.push(...(r.ids || []));
    } else {
      categoriesFailed++;
    }
    // Small delay between categories to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // A run only counts as "full" (eligible for expiring stale jobs) if it targeted
  // every category (category === '') — a scoped manual refresh of one category
  // must never be used to judge jobs from the other categories as stale.
  const isFullSweep = !category;

  console.log(`[Sync] Remotive fetch complete — categories: ${categoriesToFetch.length} (${categoriesSucceeded} ok, ${categoriesFailed} failed), fetched: ${totalFetched}, inserted: ${totalInserted}, updated: ${totalUpdated}`);

  return {
    success: categoriesSucceeded > 0,
    fetched: totalFetched,
    inserted: totalInserted,
    updated: totalUpdated,
    categoriesSucceeded,
    categoriesFailed,
    seenIds: allSeenIds,
    isFullSweep,
  };
}

// ══════════════════════════════════════════════
//  PHASE 9 — JOBICY INTEGRATION (4th free provider)
//  Source: Jobicy Remote Jobs API (free, no key required)
//  https://jobicy.com/api/v2/remote-jobs
// ══════════════════════════════════════════════

const JOBICY_URL = 'https://jobicy.com/api/v2/remote-jobs';
// Jobicy has no offset/page pagination — a single request only ever returns its
// latest listings (max 50). The closest equivalent to "real pagination" it
// offers is the `industry` filter, so — exactly like Remotive iterates its own
// category slugs — we iterate Jobicy's industry slugs, one request each, to
// cover a broad slice of the board instead of just the single latest-50 page.
const JOBICY_COUNT_PER_REQUEST = 50;
const JOBICY_INDUSTRIES = [
  'dev', 'design-multimedia', 'marketing', 'business', 'data-science',
  'admin-support', 'accounting-finance', 'hr', 'seo', 'copywriting',
  'healthcare', 'education', 'legal', 'management', 'engineering',
];
// Defensive circuit breaker only — JOBICY_INDUSTRIES is a fixed, finite list so
// this should never actually be hit, but every provider's request loop keeps a
// safety cap so a future edit to the list can never turn into an unbounded run.
const JOBICY_SAFETY_REQUEST_CAP = 30;

/**
 * Map Jobicy's jobType field to our enum. Defensive against every shape Jobicy
 * can send: an array (current API), a plain string (older docs), or missing/null.
 */
function normalizeJobicyType(jobType) {
  const arr = Array.isArray(jobType) ? jobType : (typeof jobType === 'string' && jobType ? [jobType] : []);
  const first = (typeof arr[0] === 'string' ? arr[0] : '').toLowerCase();
  if (first.includes('part')) return 'part-time';
  if (first.includes('contract')) return 'contract';
  if (first.includes('freelance') || first.includes('intern')) return 'freelance';
  return 'full-time';
}

/**
 * Map Jobicy's jobLevel string (e.g. "Senior", "Entry Level", "Any") to our
 * level enum, falling back to title-based inference (inferLevel) when Jobicy's
 * own field is missing, null, or unrecognized (e.g. "Any").
 */
function normalizeJobicyLevel(jobLevel, title) {
  const s = (typeof jobLevel === 'string' ? jobLevel : '').toLowerCase();
  if (s.includes('senior') || s.includes('lead') || s.includes('manager') || s.includes('director')) return 'senior';
  if (s.includes('entry') || s.includes('junior')) return 'beginner';
  if (s.includes('mid')) return 'mid';
  return inferLevel(typeof title === 'string' ? title : '');
}

/**
 * Jobicy's `id` is a plain numeric job id. Defensive fallback to a URL-derived
 * slug for the rare/malformed case where `id` is missing, matching the same
 * pattern used for Himalayas (which has no id field at all).
 */
function jobicyIdFromJob(r) {
  if (r && (typeof r.id === 'number' || typeof r.id === 'string') && String(r.id).trim()) {
    return `jobicy_${String(r.id).trim()}`;
  }
  const url = (r && typeof r.url === 'string') ? r.url : '';
  const clean = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const slug = clean.split('/').filter(Boolean).pop();
  return slug ? `jobicy_${slug}` : null;
}

/**
 * Fetch a single Jobicy industry slice. Any non-2xx or network error throws —
 * the caller (fetchJobicyJobs) treats a failed industry as skippable, not fatal.
 */
async function fetchJobicyIndustry(industry, count = JOBICY_COUNT_PER_REQUEST) {
  const params = new URLSearchParams({ count: String(count), industry });
  const response = await fetch(`${JOBICY_URL}?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'RemoteAI-Platform/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Jobicy API ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

/**
 * Fetch jobs from every configured Jobicy industry slice and upsert into
 * MongoDB via the same normalized schema/dedup path as every other provider.
 * Any failure here is caught by the caller (runSync) and never affects
 * Remotive, Arbeitnow, or Himalayas. Malformed individual job records are
 * skipped (not thrown) so one bad record can never abort the whole run.
 */
async function fetchJobicyJobs({ industries = JOBICY_INDUSTRIES, safetyRequestCap = JOBICY_SAFETY_REQUEST_CAP } = {}) {
  let totalFetched = 0, inserted = 0, updated = 0, duplicates = 0, skipped = 0;
  const seenIds = [];
  let industriesSucceeded = 0, industriesFailed = 0;

  // Defensive cap — see JOBICY_SAFETY_REQUEST_CAP comment above.
  const list = industries.slice(0, safetyRequestCap);

  for (let idx = 0; idx < list.length; idx++) {
    const industry = list[idx];
    let jobs;
    try {
      jobs = await fetchJobicyIndustry(industry);
      industriesSucceeded++;
    } catch (err) {
      console.warn(`[Jobs] Jobicy industry "${industry}" fetch failed: ${err.message}`);
      industriesFailed++;
      continue; // one bad industry must not stop the others
    }

    totalFetched += jobs.length;

    for (let i = 0; i < jobs.length; i++) {
      const r = jobs[i];
      try {
        if (!r || typeof r !== 'object') { skipped++; continue; }

        // Quality gate: skip listings missing essential real data. Every field
        // is type-checked before use — Jobicy's shape has drifted before
        // (jobType/jobIndustry moved from string to array) and this must
        // never throw regardless of what's actually returned.
        const title = typeof r.jobTitle === 'string' ? r.jobTitle.trim() : '';
        const company = typeof r.companyName === 'string' ? r.companyName.trim() : '';
        const url = typeof r.url === 'string' ? r.url.trim() : '';
        if (!title || !company || !url) { skipped++; continue; }

        const externalId = jobicyIdFromJob(r);
        if (!externalId) { skipped++; continue; }

        // Same extra dedup guard used for Himalayas — reuses the existing,
        // provider-agnostic normalizeApplyUrlForDedup helper and applyUrlKey
        // field. This is additive on top of, not a replacement for, the
        // existing externalId/dedupKey checks in upsertNormalizedJob.
        const applyUrlKey = normalizeApplyUrlForDedup(url);
        const existingByUrl = await Job.findOne({
          active: true,
          applyUrlKey,
          externalId: { $ne: externalId },
        }).select('_id');
        if (existingByUrl) {
          duplicates++;
          seenIds.push(externalId);
          continue;
        }

        const industryTags = Array.isArray(r.jobIndustry)
          ? r.jobIndustry.filter(x => typeof x === 'string')
          : (typeof r.jobIndustry === 'string' && r.jobIndustry ? [r.jobIndustry] : []);
        const tags = industryTags.slice(0, 6);
        const skills = deriveSkills(title, industryTags.join(' '), tags);
        const { logo, logoColor } = logoFromCompany(company, totalFetched + i);
        const description = stripHtml(
          typeof r.jobDescription === 'string' ? r.jobDescription
          : (typeof r.jobExcerpt === 'string' ? r.jobExcerpt : '')
        );
        const location = (typeof r.jobGeo === 'string' && r.jobGeo.trim()) ? r.jobGeo.trim() : 'Worldwide';

        let salary = '';
        if (typeof r.salaryMin === 'number' && typeof r.salaryMax === 'number') {
          salary = `${r.salaryCurrency || 'USD'} ${r.salaryMin.toLocaleString()}–${r.salaryMax.toLocaleString()}/${r.salaryPeriod || 'year'}`;
        }

        let posted = new Date();
        if (typeof r.pubDate === 'string' && r.pubDate) {
          const parsed = new Date(r.pubDate);
          if (!isNaN(parsed.getTime())) posted = parsed;
        }

        const jobDoc = {
          title,
          company,
          logo,
          logoColor,
          type: normalizeJobicyType(r.jobType),
          level: normalizeJobicyLevel(r.jobLevel, title),
          remote: true,
          salary,
          location,
          tags,
          skills,
          description,
          posted,
          active: true,
          source: 'api',
          provider: 'jobicy',
          dedupKey: computeDedupKey(company, title),
          externalId,
          applyUrl: url,
          applyUrlKey,
          lastFetched: new Date(),
        };

        const outcome = await upsertNormalizedJob(jobDoc);
        if (outcome === 'inserted') inserted++;
        else if (outcome === 'updated') updated++;
        else if (outcome === 'duplicate') duplicates++;
        seenIds.push(externalId);
      } catch (err) {
        // Never let one malformed record abort the whole industry/run.
        skipped++;
        console.warn(`[Jobs] Jobicy: skipped a malformed job record — ${err.message}`);
      }
    }

    // Small delay between industry requests to be respectful to the free API
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  // We always attempt every configured industry (failures are skipped, not
  // stopped on) — so, like Remotive's all-category run, this counts as a full
  // sweep and is eligible for the same "not seen this run" expiry in runSync.
  const isFullSweep = true;

  console.log(`[Jobs] Jobicy fetch complete — fetched: ${totalFetched}, inserted: ${inserted}, updated: ${updated}, duplicates: ${duplicates}, skipped: ${skipped}`);

  return {
    success: industriesSucceeded > 0,
    fetched: totalFetched,
    inserted,
    updated,
    duplicates,
    skipped,
    industriesSucceeded,
    industriesFailed,
    seenIds,
    isFullSweep,
  };
}

// ══════════════════════════════════════════════
//  PHASE 10 — REMOTEOK INTEGRATION (5th free provider)
//  Source: RemoteOK Public Jobs API (free, no key required, no scraping)
//  https://remoteok.com/api
//
//  RemoteOK returns a single flat JSON array of its latest listings (no
//  pagination, no category/industry filter to iterate — unlike Remotive's
//  categories or Jobicy's industries). Element [0] of the response is
//  typically a non-job "legal notice" record, not a listing — it is
//  filtered out below by the same defensive shape checks used for every
//  malformed record, not by assuming a fixed array index (RemoteOK's own
//  ordering is not a contract we should rely on).
// ══════════════════════════════════════════════

const REMOTEOK_URL = 'https://remoteok.com/api';

/**
 * RemoteOK has no explicit job-type field — infer from title/tags the same
 * defensive way Remotive/Jobicy fall back when their own type field is
 * missing or unrecognized.
 */
function normalizeRemoteOkType(tags, title) {
  const combined = `${(Array.isArray(tags) ? tags.join(' ') : '')} ${title || ''}`.toLowerCase();
  if (combined.includes('part time') || combined.includes('part-time')) return 'part-time';
  if (combined.includes('contract')) return 'contract';
  if (combined.includes('freelance') || combined.includes('intern')) return 'freelance';
  return 'full-time';
}

/**
 * RemoteOK has no explicit seniority field either — reuse the shared
 * title-based inferLevel(), exactly like Remotive does.
 */
function normalizeRemoteOkLevel(title) {
  return inferLevel(typeof title === 'string' ? title : '');
}

/**
 * RemoteOK's `id` is a numeric/string job id, provider-unique. Defensive
 * fallback to a slug parsed from the listing URL — same pattern used for
 * Jobicy (jobicyIdFromJob) and Himalayas — for the rare/malformed case
 * where `id` is missing.
 */
function remoteOkIdFromJob(r) {
  if (r && (typeof r.id === 'number' || typeof r.id === 'string') && String(r.id).trim()) {
    return `remoteok_${String(r.id).trim()}`;
  }
  const url = (r && typeof r.url === 'string') ? r.url : '';
  const clean = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const slug = clean.split('/').filter(Boolean).pop();
  return slug ? `remoteok_${slug}` : null;
}

/**
 * Fetch RemoteOK's full public feed and upsert into MongoDB via the same
 * normalized schema/dedup path as every other provider. Any failure here is
 * caught by the caller (runSync) and never affects Remotive, Arbeitnow,
 * Himalayas, or Jobicy. Malformed individual job records are skipped (not
 * thrown) so one bad record — or a RemoteOK response-format change — can
 * never abort the whole provider run.
 */
async function fetchRemoteOkJobs() {
  let remoteOkJobs;
  try {
    const response = await fetch(REMOTEOK_URL, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'RemoteAI-Platform/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`RemoteOK API ${response.status}`);
    const data = await response.json();
    remoteOkJobs = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[Jobs] RemoteOK fetch failed: ${err.message}`);
    return { success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0, skipped: 0, seenIds: [], isFullSweep: false, error: err.message };
  }

  let inserted = 0, updated = 0, duplicates = 0, skipped = 0;
  const seenIds = [];

  for (let i = 0; i < remoteOkJobs.length; i++) {
    const r = remoteOkJobs[i];
    try {
      if (!r || typeof r !== 'object') { skipped++; continue; }

      // Quality gate: skip the legal-notice record and any listing missing
      // essential real data. Every field is type-checked before use — this
      // must never throw regardless of what RemoteOK actually returns.
      const title = typeof r.position === 'string' ? r.position.trim() : '';
      const company = typeof r.company === 'string' ? r.company.trim() : '';
      const url = typeof r.url === 'string' ? r.url.trim() : (typeof r.apply_url === 'string' ? r.apply_url.trim() : '');
      if (!title || !company || !url) { skipped++; continue; }

      const externalId = remoteOkIdFromJob(r);
      if (!externalId) { skipped++; continue; }

      // Same extra dedup guard used for Himalayas/Jobicy — reuses the
      // existing, provider-agnostic normalizeApplyUrlForDedup helper and
      // applyUrlKey field. Additive on top of, not a replacement for, the
      // existing externalId/dedupKey checks in upsertNormalizedJob.
      const applyUrlKey = normalizeApplyUrlForDedup(url);
      const existingByUrl = await Job.findOne({
        active: true,
        applyUrlKey,
        externalId: { $ne: externalId },
      }).select('_id');
      if (existingByUrl) {
        duplicates++;
        seenIds.push(externalId);
        continue;
      }

      const tags = Array.isArray(r.tags) ? r.tags.filter(x => typeof x === 'string').slice(0, 6) : [];
      const skills = deriveSkills(title, tags.join(' '), tags);
      const { logo, logoColor } = logoFromCompany(company, i);
      const description = stripHtml(typeof r.description === 'string' ? r.description : '');
      const location = (typeof r.location === 'string' && r.location.trim()) ? r.location.trim() : 'Worldwide';

      let salary = '';
      if (typeof r.salary_min === 'number' && typeof r.salary_max === 'number' && (r.salary_min > 0 || r.salary_max > 0)) {
        salary = `$${r.salary_min.toLocaleString()}–$${r.salary_max.toLocaleString()}/year`;
      }

      let posted = new Date();
      if (typeof r.date === 'string' && r.date) {
        const parsed = new Date(r.date);
        if (!isNaN(parsed.getTime())) posted = parsed;
      } else if (typeof r.epoch === 'number' && r.epoch > 0) {
        posted = new Date(r.epoch * 1000);
      }

      const jobDoc = {
        title,
        company,
        logo,
        logoColor,
        type: normalizeRemoteOkType(tags, title),
        level: normalizeRemoteOkLevel(title),
        remote: true,
        salary,
        location,
        tags,
        skills,
        description,
        posted,
        active: true,
        source: 'api',
        provider: 'remoteok',
        dedupKey: computeDedupKey(company, title),
        externalId,
        applyUrl: url,
        applyUrlKey,
        lastFetched: new Date(),
      };

      const outcome = await upsertNormalizedJob(jobDoc);
      if (outcome === 'inserted') inserted++;
      else if (outcome === 'updated') updated++;
      else if (outcome === 'duplicate') duplicates++;
      seenIds.push(externalId);
    } catch (err) {
      // Never let one malformed record — or an unexpected RemoteOK response
      // shape change — abort the whole provider run.
      skipped++;
      console.warn(`[Jobs] RemoteOK: skipped a malformed job record — ${err.message}`);
    }
  }

  // RemoteOK's feed is a single flat request with no pagination to exhaust —
  // every call attempts the whole available feed, so (like Jobicy's
  // industry sweep) this counts as a full sweep and is eligible for the same
  // "not seen this run" expiry in runSync, guarded by the same zero-result check.
  const isFullSweep = true;

  console.log(`[Jobs] RemoteOK fetch complete — fetched: ${remoteOkJobs.length}, inserted: ${inserted}, updated: ${updated}, duplicates: ${duplicates}, skipped: ${skipped}`);

  return {
    success: remoteOkJobs.length > 0,
    fetched: remoteOkJobs.length,
    inserted,
    updated,
    duplicates,
    skipped,
    seenIds,
    isFullSweep,
    error: null,
  };
}

// ══════════════════════════════════════════════
//  AUTOMATIC BACKGROUND SYNC (every 6 hours)
// ══════════════════════════════════════════════
// In-memory lock + status tracker so the cron job, the startup sync, and the
// manual /api/jobs/refresh endpoint can never run concurrently and always
// report the same truth about what's currently happening.
const syncState = {
  inProgress: false,
  lastRunAt: null,
  lastRunTrigger: null,      // 'startup' | 'scheduled' | 'manual'
  lastResult: null,          // stats from the most recent completed run
  lastError: null,
  deactivatedLastRun: 0,
  runCount: 0,
};

const SYNC_INTERVAL_CRON = '0 */6 * * *'; // every 6 hours, on the hour

/**
 * Central sync entrypoint. Used by startup, the cron schedule, and the
 * manual refresh endpoint. Enforces a single-flight lock so syncs never
 * overlap, and (on full sweeps only) deactivates jobs that Remotive no
 * longer lists rather than deleting them outright.
 */
async function runSync({ limit = 50, category = '', trigger = 'manual' } = {}) {
  if (syncState.inProgress) {
    console.warn(`[Sync] Skipped — a sync triggered by "${syncState.lastRunTrigger}" is already running.`);
    return { success: false, skipped: true, reason: 'sync_in_progress' };
  }

  syncState.inProgress = true;
  syncState.lastRunTrigger = trigger;
  const startedAt = new Date();
  console.log(`[Sync] Starting (${trigger}) — category: ${category || 'all'}, limit/category: ${limit}`);

  try {
    // ── Provider 1: Remotive (unchanged behavior/contract) ──────────────
    const remotiveResult = await fetchRemoteJobs({ limit, category });

    // Expire Remotive jobs no longer returned — only after a full sweep of
    // every category, and only if we actually got usable data back. Scoped
    // to non-Arbeitnow IDs so this can never touch the other provider's jobs.
    let remotiveDeactivated = 0;
    if (remotiveResult.isFullSweep && remotiveResult.seenIds.length > 0) {
      const expireResult = await Job.updateMany(
        {
          source: 'api',
          active: true,
          // Must exclude every other provider's prefix — otherwise a Remotive
          // full sweep would wrongly deactivate Arbeitnow's, Himalayas', and
          // Jobicy's jobs too, since none of them are "seen" in remotiveResult.seenIds.
          externalId: { $ne: null, $nin: remotiveResult.seenIds, $not: /^(arbeitnow_|himalayas_|jobicy_)/ },
        },
        { $set: { active: false } }
      );
      remotiveDeactivated = expireResult.modifiedCount || 0;
      if (remotiveDeactivated > 0) {
        console.log(`[Sync] Deactivated ${remotiveDeactivated} Remotive job(s) no longer returned.`);
      }
    } else if (remotiveResult.isFullSweep) {
      console.warn('[Sync] Remotive full sweep returned zero jobs — skipping its expiry pass to avoid mass-deactivation.');
    }

    // ── Provider 2: Arbeitnow — isolated so a failure here can never affect
    // the Remotive result above or the sync lock. This is the core
    // requirement: "if Arbeitnow is unavailable, Remotive should continue
    // syncing normally," which already happened by the time we get here. ──
    let arbeitnowResult = {
      success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0,
      skippedNonRemote: 0, seenIds: [], isFullSweep: false, error: null,
    };
    let arbeitnowDeactivated = 0;
    try {
      arbeitnowResult = await fetchArbeitnowJobs();

      // Only expire Arbeitnow jobs if this run actually reached the end of
      // the board (a partial/error-truncated run must never be used to
      // judge jobs on later pages as stale).
      if (arbeitnowResult.isFullSweep && arbeitnowResult.seenIds.length > 0) {
        const expireResult = await Job.updateMany(
          { source: 'api', active: true, externalId: { $regex: /^arbeitnow_/, $nin: arbeitnowResult.seenIds } },
          { $set: { active: false } }
        );
        arbeitnowDeactivated = expireResult.modifiedCount || 0;
        if (arbeitnowDeactivated > 0) {
          console.log(`[Sync] Deactivated ${arbeitnowDeactivated} Arbeitnow job(s) no longer returned.`);
        }
      }
    } catch (err) {
      console.error(`[Sync] Arbeitnow provider failed — Remotive results above are unaffected: ${err.message}`);
      arbeitnowResult.error = err.message;
    }

    // ── Provider 3: Himalayas — isolated exactly like Arbeitnow above, so a
    // failure here can never affect Remotive, Arbeitnow, or the sync lock.
    // Himalayas deliberately never runs a "not seen this run" expiry (see
    // fetchHimalayasJobs); staleness is instead handled by expireHimalayasJobs,
    // which is scoped strictly to provider:'himalayas'. ──
    let himalayasResult = {
      success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0,
      skipped: 0, seenIds: [], isFullSweep: false, error: null,
    };
    let himalayasDeactivated = 0;
    try {
      himalayasResult = await fetchHimalayasJobs();
      himalayasDeactivated = await expireHimalayasJobs();
      if (himalayasDeactivated > 0) {
        console.log(`[Sync] Deactivated ${himalayasDeactivated} Himalayas job(s) past their listed expiry.`);
      }
    } catch (err) {
      console.error(`[Sync] Himalayas provider failed — Remotive/Arbeitnow results above are unaffected: ${err.message}`);
      himalayasResult.error = err.message;
    }

    // ── Provider 4: Jobicy — isolated exactly like Arbeitnow/Himalayas above,
    // so a failure here can never affect Remotive, Arbeitnow, Himalayas, or
    // the sync lock. Jobicy DOES run the same "not seen this run" expiry as
    // Remotive/Arbeitnow (unlike Himalayas) because its industry-based fetch
    // always attempts full coverage of a fixed, finite category list — a real
    // full sweep, not a bounded sample of an effectively-unbounded feed. ──
    let jobicyResult = {
      success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0,
      skipped: 0, seenIds: [], isFullSweep: false, error: null,
    };
    let jobicyDeactivated = 0;
    try {
      jobicyResult = await fetchJobicyJobs();

      // Only expire Jobicy jobs if this run actually completed a full sweep
      // of every configured industry AND returned usable data — mirrors the
      // exact guard Remotive/Arbeitnow use to avoid mass-deactivation on a
      // zero-result run.
      if (jobicyResult.isFullSweep && jobicyResult.seenIds.length > 0) {
        const expireResult = await Job.updateMany(
          { source: 'api', active: true, externalId: { $regex: /^jobicy_/, $nin: jobicyResult.seenIds } },
          { $set: { active: false } }
        );
        jobicyDeactivated = expireResult.modifiedCount || 0;
        if (jobicyDeactivated > 0) {
          console.log(`[Sync] Deactivated ${jobicyDeactivated} Jobicy job(s) no longer returned.`);
        }
      } else if (jobicyResult.isFullSweep) {
        console.warn('[Sync] Jobicy full sweep returned zero jobs — skipping its expiry pass to avoid mass-deactivation.');
      }
    } catch (err) {
      console.error(`[Sync] Jobicy provider failed — Remotive/Arbeitnow/Himalayas results above are unaffected: ${err.message}`);
      jobicyResult.error = err.message;
    }

    // ── Provider 5: RemoteOK — isolated exactly like Arbeitnow/Himalayas/
    // Jobicy above, so a failure here can never affect Remotive, Arbeitnow,
    // Himalayas, Jobicy, or the sync lock. RemoteOK DOES run the same
    // "not seen this run" expiry as Remotive/Jobicy (its single flat feed
    // request is always a full sweep, not a bounded page/sample). ──
    let remoteOkResult = {
      success: false, fetched: 0, inserted: 0, updated: 0, duplicates: 0,
      skipped: 0, seenIds: [], isFullSweep: false, error: null,
    };
    let remoteOkDeactivated = 0;
    try {
      remoteOkResult = await fetchRemoteOkJobs();

      // Only expire RemoteOK jobs if this run actually completed a full
      // sweep AND returned usable data — mirrors the exact guard every
      // other full-sweep provider uses to avoid mass-deactivation on a
      // zero-result run.
      if (remoteOkResult.isFullSweep && remoteOkResult.seenIds.length > 0) {
        const expireResult = await Job.updateMany(
          { source: 'api', active: true, externalId: { $regex: /^remoteok_/, $nin: remoteOkResult.seenIds } },
          { $set: { active: false } }
        );
        remoteOkDeactivated = expireResult.modifiedCount || 0;
        if (remoteOkDeactivated > 0) {
          console.log(`[Sync] Deactivated ${remoteOkDeactivated} RemoteOK job(s) no longer returned.`);
        }
      } else if (remoteOkResult.isFullSweep) {
        console.warn('[Sync] RemoteOK full sweep returned zero jobs — skipping its expiry pass to avoid mass-deactivation.');
      }
    } catch (err) {
      console.error(`[Sync] RemoteOK provider failed — Remotive/Arbeitnow/Himalayas/Jobicy results above are unaffected: ${err.message}`);
      remoteOkResult.error = err.message;
    }

    const deactivated = remotiveDeactivated + arbeitnowDeactivated + himalayasDeactivated + jobicyDeactivated + remoteOkDeactivated;
    const combined = {
      success: remotiveResult.success || arbeitnowResult.success || himalayasResult.success || jobicyResult.success || remoteOkResult.success,
      inserted: (remotiveResult.inserted || 0) + (arbeitnowResult.inserted || 0) + (himalayasResult.inserted || 0) + (jobicyResult.inserted || 0) + (remoteOkResult.inserted || 0),
      updated: (remotiveResult.updated || 0) + (arbeitnowResult.updated || 0) + (himalayasResult.updated || 0) + (jobicyResult.updated || 0) + (remoteOkResult.updated || 0),
      duplicates: (remotiveResult.duplicates || 0) + (arbeitnowResult.duplicates || 0) + (himalayasResult.duplicates || 0) + (jobicyResult.duplicates || 0) + (remoteOkResult.duplicates || 0),
      deactivated,
      providers: {
        remotive: { ...remotiveResult, deactivated: remotiveDeactivated },
        arbeitnow: { ...arbeitnowResult, deactivated: arbeitnowDeactivated },
        himalayas: { ...himalayasResult, deactivated: himalayasDeactivated },
        jobicy: { ...jobicyResult, deactivated: jobicyDeactivated },
        remoteok: { ...remoteOkResult, deactivated: remoteOkDeactivated },
      },
    };

    syncState.lastRunAt = startedAt;
    syncState.lastResult = combined;
    syncState.lastError = null;
    syncState.deactivatedLastRun = deactivated;
    syncState.runCount++;

    console.log(`[Sync] Finished (${trigger}) in ${Math.round((Date.now() - startedAt.getTime()) / 1000)}s — inserted: ${combined.inserted}, updated: ${combined.updated}, duplicates skipped: ${combined.duplicates}, deactivated: ${deactivated} (remotive ok: ${remotiveResult.success}, arbeitnow ok: ${arbeitnowResult.success}, himalayas ok: ${himalayasResult.success}, jobicy ok: ${jobicyResult.success}, remoteok ok: ${remoteOkResult.success})`);
    return combined;
  } catch (err) {
    syncState.lastRunAt = startedAt;
    syncState.lastError = err.message;
    console.error(`[Sync] Failed (${trigger}): ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    syncState.inProgress = false;
  }
}

// Runs every 6 hours. node-cron uses the server's local timezone by default;
// PORT/DB connection happens before this is scheduled (see bottom of file).
function startScheduledSync() {
  cron.schedule(SYNC_INTERVAL_CRON, () => {
    runSync({ limit: 50, category: '', trigger: 'scheduled' })
      .catch(err => console.error('[Sync] Uncaught scheduled sync error:', err.message));
  });
  console.log(`[Sync] Scheduled background sync registered — runs every 6 hours (${SYNC_INTERVAL_CRON}).`);
}

// ── POST /api/jobs/refresh ─────────────────────
// Manually trigger a live job fetch from Remotive, Arbeitnow, Himalayas, Jobicy, AND RemoteOK.
// Optional body: { limit: 50, category: "software-dev" } — category only
// scopes Remotive (Arbeitnow has no category filter of its own and always
// runs its own bounded, paginated sweep).
// Requires auth to prevent abuse. Shares the same lock as the scheduled sync,
// so a manual call while a sync is already running returns 409 instead of
// starting a second, overlapping run.
app.post('/api/jobs/refresh', auth, async (req, res) => {
  try {
    // limit = jobs per category (max 50). category = specific Remotive slug, or empty for all.
    const limit = Math.min(parseInt(req.body?.limit) || 25, 50);
    const category = req.body?.category || ''; // e.g. "software-dev", "design", etc.
    const result = await runSync({ limit, category, trigger: 'manual' });

    if (result.skipped) {
      return res.status(409).json({
        error: 'A sync is already in progress. Try again shortly.',
        lastRunAt: syncState.lastRunAt,
      });
    }
    if (!result.success) {
      return res.status(502).json({
        error: 'Could not reach Remotive, Arbeitnow, Himalayas, Jobicy, or RemoteOK.',
        detail: result.error,
      });
    }
    const catLabel = category || 'all categories';
    res.json({
      message: `Sync complete for ${catLabel} — ${result.inserted} new jobs, ${result.updated} updated${result.duplicates ? `, ${result.duplicates} cross-provider duplicates skipped` : ''}${result.deactivated ? `, ${result.deactivated} deactivated` : ''}.`,
      ...result,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  PHASE 6 PART 3A — AI JOB EXPLANATION
//  POST /api/ai/explain-job
//  Body: { job: { title, company, description, skills, salary, level } }
// ══════════════════════════════════════════════

app.post('/api/ai/explain-job', async (req, res) => {
  try {
    const { job } = req.body;
    if (!job || !job.title) return res.status(400).json({ error: 'Job data is required' });

    const prompt = `
You are a friendly career advisor helping job seekers understand remote job postings.
Analyze this job listing and explain it in plain, helpful language.

Job Title: ${job.title}
Company: ${job.company || 'Not specified'}
Level: ${job.level || 'Not specified'}
Salary: ${job.salary || 'Not specified'}
Skills Required: ${(job.skills || []).join(', ') || 'Not listed'}
Description: ${(job.description || '').slice(0, 1500)}

Return ONLY a JSON object:
{
  "tldr": "<1-sentence plain-English summary of what this job actually is>",
  "whatYouDo": ["<main daily task 1>", "<main daily task 2>", "<main daily task 3>"],
  "idealCandidate": "<2-sentence description of who would be perfect for this role>",
  "whyApply": ["<compelling reason to apply 1>", "<compelling reason to apply 2>"],
  "watchOut": ["<honest concern or challenge about this role>"],
  "salaryContext": "<brief context about whether this salary is competitive>",
  "interviewTips": ["<tip 1 for interviewing for this specific role>", "<tip 2>"],
  "difficultyLevel": "<Easy / Moderate / Challenging>",
  "difficultyReason": "<one sentence explaining the difficulty rating>"
}
`;

    const fallback = () => ({
      tldr: `${job.title} at ${job.company || 'this company'} is a ${job.level || 'mid-level'} remote position focused on ${(job.skills || []).slice(0, 2).join(' and ') || 'technical work'}.`,
      whatYouDo: [
        `Work on ${job.title.toLowerCase()} responsibilities in a remote setting`,
        `Collaborate with a distributed team across different time zones`,
        `Deliver high-quality work using ${(job.skills || ['core skills'])[0]}`,
      ],
      idealCandidate: `Someone with ${(job.skills || []).slice(0, 3).join(', ')} experience who thrives working independently. Strong communication skills and a self-starter attitude are key.`,
      whyApply: [
        'Fully remote position with flexible working arrangements',
        `Competitive salary: ${job.salary || 'negotiable based on experience'}`,
      ],
      watchOut: ['Remote roles require strong self-discipline and async communication skills'],
      salaryContext: job.salary ? `${job.salary} is within typical market range for ${job.level || 'this'} level remote roles.` : 'Salary not listed — ask during the interview process.',
      interviewTips: [
        `Prepare examples of previous ${(job.skills || ['relevant'])[0]} projects`,
        'Highlight your remote work experience and async communication style',
      ],
      difficultyLevel: job.level === 'senior' ? 'Challenging' : job.level === 'beginner' ? 'Easy' : 'Moderate',
      difficultyReason: `This is a ${job.level || 'mid-level'} role requiring hands-on ${(job.skills || ['technical'])[0]} experience.`,
    });

    const result = await callGemini(prompt, fallback);
    res.json(result || fallback());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
//  SEO — DYNAMIC SITEMAP + ROBOTS.TXT
//  Additive only. Reuses getCategoryStats()/getCompanyDirectory() — no new
//  aggregation logic duplicated here.
//
//  NOTE ON DOMAINS: this Express server is the API host (see the CORS
//  `allowed` origins list near the top of this file for the actual site
//  domain(s)). If /sitemap.xml and /robots.txt need to be served from the
//  frontend's own domain (usual for Google Search Console verification),
//  add a rewrite/proxy on the frontend host to these two routes rather than
//  duplicating this logic on the frontend. Both routes are also exposed at
//  the /api/... prefix for direct linking from robots.txt regardless of
//  how the frontend chooses to expose them.
// ══════════════════════════════════════════════

const SITE_URL = (process.env.SITE_URL || 'https://remoteai-platform.vercel.app').replace(/\/+$/, '');
const sitemapCache = createTtlCache(60 * 60 * 1000); // 1 hour

async function buildSitemapXml() {
  const [categories, companies] = await Promise.all([getCategoryStats(), getCompanyDirectory()]);

  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/jobs`, priority: '0.9', changefreq: 'hourly' },
  ];
  for (const c of categories) {
    urls.push({ loc: `${SITE_URL}/jobs/category/${c.slug}`, priority: '0.8', changefreq: 'daily' });
  }
  for (const co of companies) {
    urls.push({ loc: `${SITE_URL}/company/${co.slug}`, priority: '0.6', changefreq: 'daily' });
  }

  const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = urls
    .map(u => `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function sitemapHandler(req, res) {
  try {
    const xml = await sitemapCache.get(buildSitemapXml);
    res.type('application/xml').send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/sitemap.xml', sitemapHandler);
app.get('/api/sitemap.xml', sitemapHandler);

function robotsHandler(req, res) {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
}

// Only registered if nothing else in this file already serves /robots.txt —
// which is the case today (grep confirms no prior robots.txt route existed).
// If the frontend already serves its own static robots.txt from its own
// domain, that one takes precedence for crawlers and this route is simply
// unused — it does not conflict with or override a frontend-hosted file.
app.get('/robots.txt', robotsHandler);


app.get('/api/health', async (_, res) => {
  try {
    const [total, apiJobs, lastApiJob] = await Promise.all([
      Job.countDocuments({ active: true }),
      Job.countDocuments({ active: true, source: 'api' }),
      Job.findOne({ source: 'api' }).sort({ lastFetched: -1 }).select('lastFetched'),
    ]);
    res.json({
      status: 'ok',
      time: new Date(),
      ai: GEMINI_API_KEY ? 'Gemini connected' : 'AI fallback mode (set GEMINI_API_KEY)',
      jobs: { total, apiJobs, lastSynced: lastApiJob?.lastFetched || null },
    });
  } catch {
    res.json({ status: 'ok', time: new Date() });
  }
});

// ── SEED JOBS ─────────────────────────────────
async function seedJobs() {
  const count = await Job.countDocuments();
  if (count > 0) return;
  console.log('🌱 Seeding jobs...');
  await Job.insertMany([
    { source: 'seed', title: 'Frontend Developer', company: 'TechFlow Inc', logo: 'TF', logoColor: '#6366f1', type: 'full-time', level: 'mid', salary: '$60k–$90k', tags: ['React', 'JavaScript', 'CSS', 'TypeScript'], skills: ['react', 'javascript', 'css', 'typescript', 'html'], description: 'Build modern web interfaces using React and TypeScript. Work with a distributed team across 12 time zones.' },
    { source: 'seed', title: 'Data Entry Specialist', company: 'DataPro Solutions', logo: 'DP', logoColor: '#10b981', type: 'part-time', level: 'beginner', salary: '$15–$20/hr', tags: ['Excel', 'Google Sheets', 'Typing'], skills: ['excel', 'data entry', 'typing', 'google sheets'], description: 'Accurate data entry and management for a growing SaaS company. Flexible hours, fully remote.' },
    { source: 'seed', title: 'Node.js Backend Engineer', company: 'CloudBase', logo: 'CB', logoColor: '#f59e0b', type: 'full-time', level: 'senior', salary: '$90k–$130k', tags: ['Node.js', 'MongoDB', 'Express', 'REST API'], skills: ['node.js', 'mongodb', 'express', 'javascript', 'rest api'], description: 'Design and build scalable backend systems. Own architecture decisions.' },
    { source: 'seed', title: 'UI/UX Designer', company: 'Pixel Studio', logo: 'PS', logoColor: '#ec4899', type: 'contract', level: 'mid', salary: '$50k–$75k', tags: ['Figma', 'Prototyping', 'User Research'], skills: ['figma', 'design', 'prototyping', 'user research', 'css'], description: 'Design beautiful, user-centered interfaces for web and mobile apps.' },
    { source: 'seed', title: 'Python Data Analyst', company: 'Insight Corp', logo: 'IC', logoColor: '#3b82f6', type: 'full-time', level: 'mid', salary: '$65k–$85k', tags: ['Python', 'SQL', 'Pandas', 'Tableau'], skills: ['python', 'sql', 'pandas', 'data analysis', 'tableau'], description: 'Analyze large datasets and build dashboards to drive business decisions.' },
    { source: 'seed', title: 'Content Writer', company: 'MediaHub', logo: 'MH', logoColor: '#8b5cf6', type: 'freelance', level: 'beginner', salary: '$20–$40/hr', tags: ['SEO', 'Blog Writing', 'Copywriting'], skills: ['writing', 'seo', 'content', 'english', 'copywriting'], description: 'Write engaging blog posts, product descriptions, and marketing copy.' },
    { source: 'seed', title: 'DevOps Engineer', company: 'InfraNet', logo: 'IN', logoColor: '#14b8a6', type: 'full-time', level: 'senior', salary: '$100k–$140k', tags: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'], skills: ['docker', 'kubernetes', 'aws', 'linux', 'ci/cd'], description: 'Build and maintain cloud infrastructure. Automate deployment pipelines.' },
    { source: 'seed', title: 'Customer Support Agent', company: 'SupportFirst', logo: 'SF', logoColor: '#f97316', type: 'part-time', level: 'beginner', salary: '$12–$18/hr', tags: ['Communication', 'Zendesk', 'English'], skills: ['communication', 'english', 'customer support', 'zendesk'], description: 'Help customers via chat and email. Morning or evening shifts available.' },
  ]);
  console.log('✅ Jobs seeded!');
}

// ── START ─────────────────────────────────────
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 })
  .then(async () => {
    console.log('✅ MongoDB connected!');
    await seedJobs();
    app.listen(PORT, () => {
      console.log('');
      console.log(`✅ RemoteAI server → http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   AI:     ${GEMINI_API_KEY ? '🤖 Gemini connected' : '⚠️  Fallback mode — add GEMINI_API_KEY to .env'}`);
      console.log('');
    });

    // Fetch real jobs from Remotive + Arbeitnow + Himalayas + Jobicy + RemoteOK on startup (non-blocking).
    // Seed jobs are excluded from the API — only verified API jobs are served.
    console.log('[Jobs] Starting multi-provider sync (Remotive + Arbeitnow + Himalayas + Jobicy + RemoteOK)...');
    runSync({ limit: 50, category: '', trigger: 'startup' }) // Remotive: 50 per category × 12 categories; Arbeitnow: full paginated sweep; Himalayas: 10 most-recent pages; RemoteOK: single flat feed
      .then(r => {
        if (r.success) {
          console.log(`[Jobs] Startup sync complete — ${r.inserted} new jobs, ${r.updated} updated.`);
        } else if (!r.skipped) {
          console.warn('[Jobs] Startup sync failed — check Remotive/Arbeitnow/Himalayas/Jobicy/RemoteOK API connectivity.');
        }
      })
      .catch(err => console.warn('[Jobs] Startup sync error:', err.message));

    // Register the recurring background sync (every 6 hours). This runs
    // independently of the startup sync above and of any manual refresh.
    startScheduledSync();
  })
  .catch(err => {
    console.error('\n❌ MongoDB failed:', err.message);
    process.exit(1);
  });

export default app;
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: { type: String, default: 'Technology' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  logoColor: { type: String, default: '#6366f1' },
  size: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const developerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  bio: { type: String, default: '' },
  location: { type: String, default: 'Remote' },
  availability: { type: String, enum: ['open', 'busy', 'closed'], default: 'open' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  projects: [{
    name: String,
    desc: String,
    tech: [String],
    link: String,
  }],
  workHistory: [{
    company: String,
    role: String,
    period: String,
    desc: String,
  }],
  updatedAt: { type: Date, default: Date.now },
});

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  companyJobId: { type: String }, // for locally posted jobs
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  status: { type: String, enum: ['new', 'reviewing', 'shortlisted', 'hired', 'rejected'], default: 'new' },
  matchScore: { type: Number, default: 0 },
  coverNote: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
});

// Add model registrations:
// const Company = mongoose.model('Company', companySchema);
// const DeveloperProfile = mongoose.model('DeveloperProfile', developerProfileSchema);
// const Application = mongoose.model('Application', applicationSchema);


// ── NEW ROUTES ─────────────────────────────────────────────────────────────

// POST /api/company — Create/update company profile
app.post('/api/company', auth, async (req, res) => {
  try {
    const { name, industry, website, description, logo, logoColor, size } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name required' });
    const data = { name, industry, website, description, logo, logoColor, size, owner: req.user.id };
    const existing = await Company.findOne({ owner: req.user.id });
    const company = existing
      ? await Company.findByIdAndUpdate(existing._id, data, { new: true })
      : await Company.create(data);
    res.json(company);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/company/me — Get current user's company
app.get('/api/company/me', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user.id });
    if (!company) return res.status(404).json({ error: 'No company profile found' });
    res.json(company);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/developer/:username — Public developer profile
app.get('/api/developer/:username', async (req, res) => {
  try {
    const profile = await DeveloperProfile.findOne({ username: req.params.username })
      .populate('user', 'name skills experience targetRole');
    if (!profile) return res.status(404).json({ error: 'Developer not found' });
    res.json(profile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/developer/profile — Create/update developer profile
app.put('/api/developer/profile', auth, async (req, res) => {
  try {
    const { username, title, bio, location, availability, github, portfolio, linkedin, projects, workHistory } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const data = { user: req.user.id, username, title, bio, location, availability, github, portfolio, linkedin, projects, workHistory, updatedAt: new Date() };
    const profile = await DeveloperProfile.findOneAndUpdate(
      { user: req.user.id }, data, { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/apply — Apply to a job
app.post('/api/jobs/apply', auth, async (req, res) => {
  try {
    const { jobId, companyJobId, coverNote, matchScore } = req.body;
    const existing = await Application.findOne({
      applicant: req.user.id,
      $or: [{ job: jobId }, { companyJobId }],
    });
    if (existing) return res.status(409).json({ error: 'Already applied to this job' });
    const app_doc = await Application.create({
      job: jobId || null, companyJobId: companyJobId || null,
      applicant: req.user.id, coverNote, matchScore: matchScore || 0,
    });
    res.json({ success: true, application: app_doc });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/applications/company — Get all applications for company's jobs
app.get('/api/applications/company', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user.id });
    if (!company) return res.status(404).json({ error: 'No company found' });
    const apps = await Application.find({ company: company._id })
      .populate('applicant', 'name email skills experience')
      .sort({ appliedAt: -1 });
    res.json(apps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/applications/:id/status — Update application status
app.put('/api/applications/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const app_doc = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!app_doc) return res.status(404).json({ error: 'Application not found' });
    res.json(app_doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/match-score — Calculate AI match score for a job
app.post('/api/ai/match-score', auth, async (req, res) => {
  try {
    const { jobId } = req.body;
    const user = await User.findById(req.user.id).select('-password');
    const job = await Job.findById(jobId);
    if (!user || !job) return res.status(404).json({ error: 'User or job not found' });

    const userSkills = (user.skills || []).map(s => s.toLowerCase());
    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
    const matched = jobSkills.filter(s => userSkills.some(us => us.includes(s) || s.includes(us)));
    const missing = jobSkills.filter(s => !matched.includes(s));
    const skillScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 70 : 35;

    const levelMap = { beginner: 1, mid: 2, senior: 3 };
    const userExp = parseInt((user.experience || '0').match(/\d+/)?.[0] || 0);
    const userLevel = userExp <= 1 ? 1 : userExp <= 4 ? 2 : 3;
    const jobLevel = levelMap[job.level] || 2;
    const levelScore = Math.abs(userLevel - jobLevel) === 0 ? 20 : Math.abs(userLevel - jobLevel) === 1 ? 12 : 4;

    const score = Math.min(99, Math.max(5, Math.round(skillScore + levelScore)));
    res.json({ score, matched, missing, suggestions: missing.slice(0, 3).map(s => `Learn ${s}`) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});