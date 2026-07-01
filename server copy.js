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
const MONGO_URI = process.env.MONGO_URI;
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
  externalId: { type: String, default: null, index: true },   // Remotive job ID for dedup
  applyUrl: { type: String, default: null },
  lastFetched: { type: Date, default: null },
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
};

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
    return { success: false, fetched: 0, inserted: 0, updated: 0 };
  }

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < remotiveJobs.length; i++) {
    const r = remotiveJobs[i];

    // Quality gate: skip jobs missing essential real data
    if (!r.id || !r.company_name || !r.title || !r.url) continue;
    // Skip jobs where the apply URL is just the Remotive homepage
    if (r.url === 'https://remotive.com') continue;

    const externalId = String(r.id);
    const skills = deriveSkills(r.title, r.category || '', r.tags || []);
    const { logo, logoColor } = logoFromCompany(r.company_name, i);

    const description = (r.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

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
      externalId,
      applyUrl: r.url,
      lastFetched: new Date(),
    };

    const result = await Job.updateOne(
      { externalId },
      { $set: jobDoc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) inserted++;
    else if (result.modifiedCount > 0) updated++;
  }

  return { success: true, fetched: remotiveJobs.length, inserted, updated };
}

/**
 * Full sync: fetch jobs from all Remotive categories in sequence.
 * Returns aggregate stats. Non-blocking — individual category failures are skipped.
 */
async function fetchRemoteJobs({ limit = 25, category = '' } = {}) {
  const categoriesToFetch = category ? [category] : REMOTIVE_CATEGORIES;
  let totalFetched = 0, totalInserted = 0, totalUpdated = 0;

  for (const cat of categoriesToFetch) {
    const r = await fetchCategoryJobs(cat, limit);
    totalFetched  += r.fetched  || 0;
    totalInserted += r.inserted || 0;
    totalUpdated  += r.updated  || 0;
    // Small delay between categories to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log(`[Jobs] Full sync complete — categories: ${categoriesToFetch.length}, fetched: ${totalFetched}, inserted: ${totalInserted}, updated: ${totalUpdated}`);
  return { success: true, fetched: totalFetched, inserted: totalInserted, updated: totalUpdated };
}

// ── POST /api/jobs/refresh ─────────────────────
// Manually trigger a live job fetch from Remotive.
// Optional body: { limit: 50, category: "software-dev" }
// Requires auth to prevent abuse.
app.post('/api/jobs/refresh', auth, async (req, res) => {
  try {
    // limit = jobs per category (max 50). category = specific Remotive slug, or empty for all.
    const limit = Math.min(parseInt(req.body?.limit) || 25, 50);
    const category = req.body?.category || ''; // e.g. "software-dev", "design", etc.
    const result = await fetchRemoteJobs({ limit, category });
    if (!result.success) {
      return res.status(502).json({
        error: 'Could not reach Remotive API.',
        detail: result.error,
      });
    }
    const catLabel = category || 'all categories';
    res.json({
      message: `Sync complete for ${catLabel} — ${result.inserted} new jobs, ${result.updated} updated.`,
      ...result,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/jobs/sync-status ──────────────────
// Returns when jobs were last synced and total job counts by source.
app.get('/api/jobs/sync-status', async (req, res) => {
  try {
    const [total, seedCount, apiCount, lastApiJob] = await Promise.all([
      Job.countDocuments({ active: true }),
      Job.countDocuments({ active: true, source: 'seed' }),
      Job.countDocuments({ active: true, source: 'api' }),
      Job.findOne({ source: 'api' }).sort({ lastFetched: -1 }).select('lastFetched'),
    ]);
    res.json({
      total,
      seedJobs: seedCount,
      apiJobs: apiCount,
      lastSynced: lastApiJob?.lastFetched || null,
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

// ── HEALTH ────────────────────────────────────
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

    // Fetch real jobs from all Remotive categories on startup (non-blocking).
    // Seed jobs are excluded from the API — only verified API jobs are served.
    console.log('[Jobs] Starting multi-category Remotive sync...');
    fetchRemoteJobs({ limit: 50 }) // 50 per category × 12 categories = up to 600 real jobs
      .then(r => {
        if (r.success) {
          console.log(`[Jobs] Startup sync complete — ${r.inserted} new jobs, ${r.updated} updated across all categories.`);
        } else {
          console.warn('[Jobs] Startup sync failed — check Remotive API connectivity.');
        }
      })
      .catch(err => console.warn('[Jobs] Startup sync error:', err.message));
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