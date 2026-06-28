import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCareerSuggestions, rankJobsByMatch, getMatchLabel } from '../utils/matching';
import { jobsAPI, cvAPI } from '../services/api';

// ── Sub-components ────────────────────────────

function SkillsPanel({ user, updateSkills }) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const s = input.trim();
    if (!s || (user.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      setInput(''); return;
    }
    setSaving(true);
    try { await updateSkills([...(user.skills || []), s]); }
    finally { setSaving(false); setInput(''); }
  };

  const remove = async (skill) => {
    setSaving(true);
    try { await updateSkills((user.skills || []).filter(s => s !== skill)); }
    finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon">🛠</div>
          My Skills
          {saving && <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>Saving…</span>}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{(user.skills || []).length} added</span>
      </div>

      <div className="skills-input-row">
        <input
          placeholder="Type a skill and press Enter…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          disabled={saving}
        />
        <button className="btn btn-primary btn-sm" onClick={add} disabled={saving || !input.trim()}>
          Add
        </button>
      </div>

      <div className="skills-chips">
        {(user.skills || []).length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>No skills yet — add your first one above</span>
        ) : (
          (user.skills || []).map(s => (
            <span key={s} className="skill-chip">
              {s}
              <button className="skill-chip-remove" onClick={() => remove(s)} disabled={saving} title="Remove">✕</button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionsPanel({ user, updateSkills }) {
  const [saving, setSaving] = useState(null);
  const suggestions = getCareerSuggestions(user.skills || []);

  const add = async (skill) => {
    if ((user.skills || []).map(s => s.toLowerCase()).includes(skill.toLowerCase())) return;
    setSaving(skill);
    try { await updateSkills([...(user.skills || []), skill]); }
    finally { setSaving(null); }
  };

  if ((user.skills || []).length === 0) return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">🤖</div>AI Suggestions</div>
      </div>
      <div className="empty-state">
        <div className="empty-icon">✨</div>
        <p>Add your skills to get personalized AI career suggestions.</p>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">🤖</div>AI Suggestions</div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Based on your skills</span>
      </div>

      {suggestions.map(s => (
        <div key={s.skill} className="suggestion-item">
          <span className="suggestion-emoji">{s.icon}</span>
          <div className="suggestion-body">
            <div className="suggestion-skill">{s.skill}</div>
            <div className="suggestion-reason">{s.reason}</div>
          </div>
          <button
            className={`btn btn-sm ${(user.skills || []).map(x => x.toLowerCase()).includes(s.skill.toLowerCase()) ? 'btn-ghost' : 'btn-outline'}`}
            onClick={() => add(s.skill)}
            disabled={saving === s.skill || (user.skills || []).map(x => x.toLowerCase()).includes(s.skill.toLowerCase())}>
            {(user.skills || []).map(x => x.toLowerCase()).includes(s.skill.toLowerCase()) ? '✓ Added' : saving === s.skill ? '…' : '+ Add'}
          </button>
        </div>
      ))}
    </div>
  );
}

function JobMatchesPanel({ jobs, user, navigate }) {
  const topJobs = rankJobsByMatch(jobs, user.skills || []).slice(0, 4);

  if ((user.skills || []).length === 0) return (
    <div className="card dash-grid-full">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">🎯</div>Top Job Matches</div>
      </div>
      <div className="empty-state">
        <div className="empty-icon">🎯</div>
        <p>Add your skills to see AI-powered job matches ranked by compatibility.</p>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>Browse All Jobs</button>
      </div>
    </div>
  );

  return (
    <div className="card dash-grid-full">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">🎯</div>Top Job Matches</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jobs')}>View All Jobs →</button>
      </div>

      {jobs.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading jobs…</div>
      ) : (
        <div className="match-mini-grid">
          {topJobs.map(job => {
            const info = getMatchLabel(job.matchScore);
            return (
              <div key={job._id || job.id} className="match-mini-card" onClick={() => navigate('/jobs')}>
                <div className="match-mini-header">
                  <div className="match-mini-logo" style={{ background: job.logoColor || 'var(--accent)' }}>
                    {job.logo}
                  </div>
                  <div>
                    <div className="match-mini-title">{job.title}</div>
                    <div className="match-mini-company">{job.company}</div>
                  </div>
                </div>
                <div className="match-mini-bar">
                  <div className="match-mini-track">
                    <div className="match-mini-fill" style={{ width: `${job.matchScore}%`, background: info.color }} />
                  </div>
                  <span className="match-mini-pct" style={{ color: info.color }}>{job.matchScore}%</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: info.color }}>{info.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CareerRoadmap({ user }) {
  const skills = (user.skills || []).map(s => s.toLowerCase());
  const hasFrontend = skills.some(s => ['react','javascript','html','css','vue','angular'].includes(s));
  const hasBackend  = skills.some(s => ['node.js','python','express','django'].includes(s));
  const hasDB       = skills.some(s => ['mongodb','sql','postgresql','mysql'].includes(s));
  const hasTools    = skills.some(s => ['git','docker','aws','typescript'].includes(s));

  const steps = [
    {
      phase: 'Foundation',
      title: 'Core Programming Skills',
      desc: 'Master the fundamentals — HTML, CSS, JavaScript or Python basics.',
      skills: ['HTML', 'CSS', 'JavaScript'],
      status: hasFrontend ? 'done' : 'active',
      icon: hasFrontend ? '✓' : '1',
    },
    {
      phase: 'Specialization',
      title: 'Pick Your Stack',
      desc: 'Go deep in one area — Frontend (React), Backend (Node/Python), or Data.',
      skills: ['React', 'Node.js', 'Python'],
      status: hasBackend || (hasFrontend && skills.includes('react')) ? 'done' : hasFrontend ? 'active' : 'future',
      icon: hasBackend ? '✓' : '2',
    },
    {
      phase: 'Database & APIs',
      title: 'Data & Backend Integration',
      desc: 'Learn databases, build REST APIs, understand how full-stack systems work.',
      skills: ['MongoDB', 'SQL', 'REST API'],
      status: hasDB ? 'done' : hasBackend ? 'active' : 'future',
      icon: hasDB ? '✓' : '3',
    },
    {
      phase: 'Tools & DevOps',
      title: 'Professional Tooling',
      desc: 'Git, Docker, CI/CD, TypeScript — skills that make you production-ready.',
      skills: ['Git', 'Docker', 'TypeScript'],
      status: hasTools ? 'done' : hasDB ? 'active' : 'future',
      icon: hasTools ? '✓' : '4',
    },
    {
      phase: 'Career Launch',
      title: 'Land Remote Jobs',
      desc: 'Build portfolio, apply on RemoteAI, get your first remote offer.',
      skills: ['Portfolio', 'LinkedIn', 'GitHub'],
      status: skills.length >= 6 ? 'active' : 'future',
      icon: '🚀',
    },
  ];

  return (
    <div className="card dash-grid-full">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">🗺</div>Career Roadmap</div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {steps.filter(s => s.status === 'done').length}/{steps.length} phases complete
        </span>
      </div>

      <div className="roadmap-steps">
        {steps.map((step, i) => (
          <div key={i} className="roadmap-step">
            <div className="roadmap-step-left">
              <div className={`roadmap-dot ${step.status}`}>
                {step.icon}
              </div>
              {i < steps.length - 1 && <div className="roadmap-line" />}
            </div>
            <div className="roadmap-content">
              <div className="roadmap-phase">{step.phase}</div>
              <div className="roadmap-title">{step.title}</div>
              <div className="roadmap-desc">{step.desc}</div>
              <div className="roadmap-skills">
                {step.skills.map(s => (
                  <span key={s} className="roadmap-skill-tag"
                    style={skills.includes(s.toLowerCase()) ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--green)' } : {}}>
                    {skills.includes(s.toLowerCase()) ? '✓ ' : ''}{s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CVPanel() {
  const [cvText, setCvText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (cvText.trim().length < 50) { setError('Please paste at least a few lines of your CV.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await cvAPI.review(cvText);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed — make sure the backend is running.');
    } finally { setLoading(false); }
  };

  const scoreColor = s => s >= 75 ? 'var(--green)' : s >= 50 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="card dash-grid-full">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">📄</div>AI CV Reviewer</div>
        {result && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setCvText(''); }}>
            Start Over
          </button>
        )}
      </div>

      {!result ? (
        <>
          <div className="cv-upload-area">
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              placeholder={"Paste your CV / resume text here…\n\nExample:\nJohn Doe  |  john@email.com  |  github.com/john\n\nSkills: React, Node.js, MongoDB, Docker\nExperience: 2 years at TechCorp as Frontend Developer\nEducation: BS Computer Science, 2022"}
              style={{ minHeight: 180, resize: 'vertical', border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' }}
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" onClick={analyze} disabled={loading || cvText.trim().length < 10}>
            {loading ? '🔍 Analyzing your CV…' : '🤖 Analyze My CV'}
          </button>
        </>
      ) : (
        <div>
          {/* Score + Summary */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 14 }}>
            <div className="cv-score-ring">
              <div className="cv-score-number" style={{ color: scoreColor(result.atsScore) }}>
                {result.atsScore}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                  <span>ATS Score</span>
                  <span style={{ color: scoreColor(result.atsScore) }}>/100</span>
                </div>
                <div className="cv-score-bar-wrap">
                  <div className="cv-score-bar" style={{ width: `${result.atsScore}%`, background: scoreColor(result.atsScore) }} />
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{result.summary}</p>
          </div>

          <div className="cv-result-grid">
            {result.detectedSkills?.length > 0 && (
              <div className="cv-result-card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--green)' }}>✅ Detected Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {result.detectedSkills.map(s => (
                    <span key={s} style={{ padding: '2px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, fontSize: 12, color: 'var(--green)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.missingSkills?.length > 0 && (
              <div className="cv-result-card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#f87171' }}>❌ Missing Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {result.missingSkills.map(s => (
                    <span key={s} style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 99, fontSize: 12, color: '#f87171' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions?.length > 0 && (
              <div className="cv-result-card full">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>💡 Improvement Suggestions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text2)' }}>
                      <span style={{ color: 'var(--accent2)', fontWeight: 700, flexShrink: 0, minWidth: 18 }}>{i + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: '⚡' },
  { id: 'skills',    label: 'Skills',    icon: '🛠' },
  { id: 'roadmap',   label: 'Roadmap',   icon: '🗺' },
  { id: 'cv',        label: 'CV Review', icon: '📄' },
];

export default function Profile() {
  const { user, logout, updateSkills } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    jobsAPI.list().then(setJobs).catch(() => {});
  }, [user]);

  if (!user) return null;

  const topJob    = rankJobsByMatch(jobs, user.skills || [])[0];
  const topScore  = topJob?.matchScore ?? 0;
  const skillsCount = (user.skills || []).length;

  return (
    <div className="page">

      {/* ── Dashboard Hero ── */}
      <div className="dash-hero">
        <div className="dash-avatar">{(user.avatar || user.name?.[0] || 'U').toUpperCase()}</div>
        <div className="dash-info">
          <div className="dash-name">{user.name}</div>
          <div className="dash-email">{user.email}</div>
          <div className="dash-pills">
            <span className="dash-pill purple">🛠 {skillsCount} skills</span>
            {topScore > 0 && <span className="dash-pill green">🎯 {topScore}% top match</span>}
            <span className="dash-pill">✦ Active</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>
          Sign Out
        </button>
      </div>

      {/* ── Stat Row ── */}
      <div className="dash-stats">
        {[
          { icon: '🛠', iconBg: 'rgba(99,102,241,0.15)', value: skillsCount,      label: 'Skills Added',    color: 'var(--accent2)' },
          { icon: '🎯', iconBg: 'rgba(16,185,129,0.15)',  value: `${topScore}%`,  label: 'Top Job Match',   color: 'var(--green)' },
          { icon: '💼', iconBg: 'rgba(245,158,11,0.15)',  value: jobs.length,     label: 'Jobs Available',  color: 'var(--yellow)' },
          { icon: '📄', iconBg: 'rgba(236,72,153,0.15)',  value: skillsCount > 0 ? 'Ready' : 'Pending', label: 'CV Status', color: 'var(--pink)' },
        ].map((s, i) => (
          <div key={i} className="dash-stat">
            <div className="dash-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="dash-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dash-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {activeTab === 'overview' && (
        <div className="dash-grid">
          <SkillsPanel user={user} updateSkills={updateSkills} />
          <SuggestionsPanel user={user} updateSkills={updateSkills} />
          <JobMatchesPanel jobs={jobs} user={user} navigate={navigate} />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="dash-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <SkillsPanel user={user} updateSkills={updateSkills} />
          </div>
          <SuggestionsPanel user={user} updateSkills={updateSkills} />
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">📊</div>Skill Overview</div>
            </div>
            {(user.skills || []).length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📊</div><p>Add skills to see your profile breakdown.</p></div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                  You have <strong style={{ color: 'var(--text)' }}>{skillsCount}</strong> skills in your profile.
                  AI suggests adding <strong style={{ color: 'var(--accent2)' }}>{getCareerSuggestions(user.skills || []).length}</strong> more to improve your matches.
                </div>
                {['Web Development', 'Backend', 'Design', 'Data', 'DevOps', 'Other'].map(cat => {
                  const catSkills = (user.skills || []).filter(s => {
                    const sl = s.toLowerCase();
                    if (cat === 'Web Development') return ['react','javascript','html','css','typescript','vue','angular','nextjs'].includes(sl);
                    if (cat === 'Backend') return ['node.js','python','express','django','flask','rest api','graphql'].includes(sl);
                    if (cat === 'Design') return ['figma','photoshop','illustrator','design','ui','ux'].includes(sl);
                    if (cat === 'Data') return ['sql','mongodb','pandas','tableau','excel','data'].some(k => sl.includes(k));
                    if (cat === 'DevOps') return ['docker','kubernetes','aws','gcp','linux','ci/cd','git'].includes(sl);
                    return true;
                  });
                  if (catSkills.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{cat}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {catSkills.map(s => <span key={s} className="skill-chip" style={{ fontSize: 12 }}>{s}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="dash-grid">
          <CareerRoadmap user={user} />
          <JobMatchesPanel jobs={jobs} user={user} navigate={navigate} />
        </div>
      )}

      {activeTab === 'cv' && (
        <div className="dash-grid">
          <CVPanel />
        </div>
      )}

    </div>
  );
}
