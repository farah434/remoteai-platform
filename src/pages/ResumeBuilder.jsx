import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateSummary, improveBullet } from '../utils/resumeAI';
import { downloadResumePDF } from '../utils/pdfExport';
import './ResumeBuilder.css';

// ── Defaults / helpers ─────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyExperience = () => ({ id: uid(), company: '', role: '', duration: '', responsibilities: '' });
const emptyProject    = () => ({ id: uid(), name: '', description: '', tech: '', link: '' });
const emptyEducation  = () => ({ id: uid(), school: '', degree: '', year: '' });
const emptyCert       = () => ({ id: uid(), name: '', issuer: '', year: '' });

const TEMPLATES = [
  { id: 'developer', label: '💻 Developer' },
  { id: 'modern',    label: '✨ Modern' },
  { id: 'ats',       label: '📋 Simple ATS' },
];

function defaultResume(user) {
  return {
    personalInfo: {
      fullName: user?.name || '',
      email: user?.email || '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
    },
    targetRole: '',
    summary: '',
    skills: {
      languages: [],
      frameworks: [],
      databases: [],
      tools: [],
    },
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    template: 'developer',
  };
}

// ── Small reusable bits ────────────────────────

function ChipField({ label, placeholder, values, onChange }) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.map(x => x.toLowerCase()).includes(v.toLowerCase())) onChange([...values, v]);
    setInput('');
  };

  const remove = (v) => onChange(values.filter(x => x !== v));

  return (
    <div className="rb-chip-group">
      <div className="rb-chip-group-label">{label}</div>
      <div className="rb-chip-input">
        <input
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={add} disabled={!input.trim()}>Add</button>
      </div>
      <div className="skills-chips">
        {values.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>None added yet</span>
        ) : values.map(v => (
          <span key={v} className="skill-chip">
            {v}
            <button type="button" className="skill-chip-remove" onClick={() => remove(v)} title="Remove">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────

export default function ResumeBuilder() {
  const { user, updateResume, loadResume } = useAuth();
  const [resume, setResume] = useState(() => defaultResume(user));
  const [resumeLoading, setResumeLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | success | localOnly | error
  const [summaryInput, setSummaryInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const printRef = useRef(null);

  // On mount / login: fetch the saved resume from the backend first;
  // if the backend has nothing (or is unreachable), fall back to the
  // localStorage cache; if neither exists, prefill from the user's
  // existing profile (name, email, skills).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) { setResumeLoading(false); return; }
      setResumeLoading(true);
      const saved = await loadResume(); // backend → localStorage fallback, handled in AuthContext
      if (cancelled) return;

      if (saved) {
        setResume({ ...defaultResume(user), ...saved });
      } else {
        setResume(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, fullName: user.name || '', email: user.email || '' },
          skills: { ...prev.skills, languages: prev.skills.languages.length ? prev.skills.languages : (user.skills || []) },
        }));
      }
      setResumeLoading(false);
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  const update = (path, value) => {
    setResume(prev => {
      const next = structuredClone ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
      let obj = next;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  // ── List section helpers ──
  const addItem = (key, factory) => setResume(prev => ({ ...prev, [key]: [...prev[key], factory()] }));
  const removeItem = (key, id) => setResume(prev => ({ ...prev, [key]: prev[key].filter(x => x.id !== id) }));
  const updateItem = (key, id, field, value) => setResume(prev => ({
    ...prev,
    [key]: prev[key].map(x => x.id === id ? { ...x, [field]: value } : x),
  }));

  // ── AI assist actions ──
  const aiSummary = () => {
    const generated = generateSummary({
      rawInput: summaryInput || resume.summary,
      role: resume.targetRole,
      skills: resume.skills.languages.concat(resume.skills.frameworks),
    });
    update('summary', generated);
  };

  const aiImproveBullet = (id) => {
    const exp = resume.experience.find(x => x.id === id);
    if (!exp) return;
    updateItem('experience', id, 'responsibilities', improveBullet(exp.responsibilities));
  };

  // ── Save ──
  const save = async () => {
    setSaveStatus('saving');
    try {
      await updateResume(resume); // saves to localStorage, then tries the backend
      setSaveStatus('success');
    } catch (err) {
      // localStorage save still succeeded inside updateResume — only the
      // backend PUT failed (e.g. route not deployed yet, or offline).
      setSaveStatus('localOnly');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ── Export ──
  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    setPdfError('');
    setPdfGenerating(true);
    try {
      // Yield to the browser so the "Generating…" state actually paints
      // before the (synchronous) PDF build runs.
      await new Promise(r => setTimeout(r, 30));
      downloadResumePDF(resume);
      setShowPreview(false);
    } catch (err) {
      setPdfError(err.message || 'Could not generate the PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <div className="page-title">✍️ AI Resume Builder</div>
        <div className="card" style={{ maxWidth: 480 }}>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 14 }}>
            Log in to build and save your resume to your RemoteAI profile.
          </p>
          <a href="/login" className="btn btn-primary btn-sm">Log In</a>
        </div>
      </div>
    );
  }

  const p = resume.personalInfo;

  return (
    <div className="page">
      <div className="page-title">✍️ AI Resume Builder</div>
      <p className="page-sub">Build a professional developer resume, get AI-assisted wording, and export it as a PDF.</p>

      {resumeLoading && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
          ⏳ Loading your saved resume…
        </div>
      )}

      <div className="rb-template-picker">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            type="button"
            className={`rb-template-btn ${resume.template === t.id ? 'active' : ''}`}
            onClick={() => update('template', t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rb-layout">

        {/* ── FORM COLUMN ── */}
        <div className="rb-form-col">

          {/* Personal Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">👤</div>Personal Information</div>
            </div>
            <div className="rb-row">
              <div className="form-field">
                <label>Full Name</label>
                <input value={p.fullName} onChange={e => update('personalInfo.fullName', e.target.value)} placeholder="Ahmed Ali" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input value={p.email} onChange={e => update('personalInfo.email', e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
            <div className="rb-row">
              <div className="form-field">
                <label>Location</label>
                <input value={p.location} onChange={e => update('personalInfo.location', e.target.value)} placeholder="Lahore, Pakistan" />
              </div>
              <div className="form-field">
                <label>Target Role</label>
                <input value={resume.targetRole} onChange={e => update('targetRole', e.target.value)} placeholder="Backend Developer" />
              </div>
            </div>
            <div className="rb-row">
              <div className="form-field">
                <label>LinkedIn</label>
                <input value={p.linkedin} onChange={e => update('personalInfo.linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
              </div>
              <div className="form-field">
                <label>GitHub</label>
                <input value={p.github} onChange={e => update('personalInfo.github', e.target.value)} placeholder="github.com/username" />
              </div>
            </div>
            <div className="form-field">
              <label>Portfolio Website</label>
              <input value={p.website} onChange={e => update('personalInfo.website', e.target.value)} placeholder="yourname.dev" />
            </div>
          </div>

          {/* Professional Summary */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">📝</div>Professional Summary</div>
            </div>
            <div className="form-field">
              <label>Describe yourself in a line (AI will expand it)</label>
              <input
                value={summaryInput}
                onChange={e => setSummaryInput(e.target.value)}
                placeholder='e.g. "Backend developer with Python"'
              />
            </div>
            <div className="form-field">
              <label>Summary</label>
              <textarea
                style={{ minHeight: 110, resize: 'vertical' }}
                value={resume.summary}
                onChange={e => update('summary', e.target.value)}
                placeholder="Your professional summary will appear here…"
              />
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={aiSummary}>
              🤖 AI Generate / Improve Summary
            </button>
          </div>

          {/* Skills */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">🛠</div>Skills</div>
            </div>
            <ChipField label="Programming Languages" placeholder="e.g. Python" values={resume.skills.languages} onChange={v => update('skills.languages', v)} />
            <ChipField label="Frameworks" placeholder="e.g. React" values={resume.skills.frameworks} onChange={v => update('skills.frameworks', v)} />
            <ChipField label="Databases" placeholder="e.g. MongoDB" values={resume.skills.databases} onChange={v => update('skills.databases', v)} />
            <ChipField label="Tools" placeholder="e.g. Docker" values={resume.skills.tools} onChange={v => update('skills.tools', v)} />
          </div>

          {/* Experience */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">💼</div>Experience</div>
            </div>
            {resume.experience.map(exp => (
              <div key={exp.id} className="rb-list-item">
                <button className="rb-list-item-remove" onClick={() => removeItem('experience', exp.id)} title="Remove">✕</button>
                <div className="rb-row">
                  <div className="form-field">
                    <label>Company</label>
                    <input value={exp.company} onChange={e => updateItem('experience', exp.id, 'company', e.target.value)} placeholder="TechCorp" />
                  </div>
                  <div className="form-field">
                    <label>Role</label>
                    <input value={exp.role} onChange={e => updateItem('experience', exp.id, 'role', e.target.value)} placeholder="Frontend Developer" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Duration</label>
                  <input value={exp.duration} onChange={e => updateItem('experience', exp.id, 'duration', e.target.value)} placeholder="Jan 2023 – Present" />
                </div>
                <div className="form-field">
                  <label>Responsibilities</label>
                  <textarea
                    style={{ minHeight: 80, resize: 'vertical' }}
                    value={exp.responsibilities}
                    onChange={e => updateItem('experience', exp.id, 'responsibilities', e.target.value)}
                    placeholder="Describe what you did…"
                  />
                </div>
                <div className="rb-ai-row">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => aiImproveBullet(exp.id)}>
                    🤖 AI Improve Wording
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="rb-add-btn" onClick={() => addItem('experience', emptyExperience)}>+ Add Experience</button>
          </div>

          {/* Projects */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">🚀</div>Projects</div>
            </div>
            {resume.projects.map(proj => (
              <div key={proj.id} className="rb-list-item">
                <button className="rb-list-item-remove" onClick={() => removeItem('projects', proj.id)} title="Remove">✕</button>
                <div className="rb-row">
                  <div className="form-field">
                    <label>Project Name</label>
                    <input value={proj.name} onChange={e => updateItem('projects', proj.id, 'name', e.target.value)} placeholder="RemoteAI" />
                  </div>
                  <div className="form-field">
                    <label>GitHub Link</label>
                    <input value={proj.link} onChange={e => updateItem('projects', proj.id, 'link', e.target.value)} placeholder="github.com/you/project" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Description</label>
                  <textarea
                    style={{ minHeight: 70, resize: 'vertical' }}
                    value={proj.description}
                    onChange={e => updateItem('projects', proj.id, 'description', e.target.value)}
                    placeholder="What does it do?"
                  />
                </div>
                <div className="form-field">
                  <label>Technologies Used</label>
                  <input value={proj.tech} onChange={e => updateItem('projects', proj.id, 'tech', e.target.value)} placeholder="React, Node.js, MongoDB" />
                </div>
              </div>
            ))}
            <button type="button" className="rb-add-btn" onClick={() => addItem('projects', emptyProject)}>+ Add Project</button>
          </div>

          {/* Education */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">🎓</div>Education</div>
            </div>
            {resume.education.map(ed => (
              <div key={ed.id} className="rb-list-item">
                <button className="rb-list-item-remove" onClick={() => removeItem('education', ed.id)} title="Remove">✕</button>
                <div className="rb-row">
                  <div className="form-field">
                    <label>School</label>
                    <input value={ed.school} onChange={e => updateItem('education', ed.id, 'school', e.target.value)} placeholder="University name" />
                  </div>
                  <div className="form-field">
                    <label>Degree</label>
                    <input value={ed.degree} onChange={e => updateItem('education', ed.id, 'degree', e.target.value)} placeholder="BS Computer Science" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Year</label>
                  <input value={ed.year} onChange={e => updateItem('education', ed.id, 'year', e.target.value)} placeholder="2022" />
                </div>
              </div>
            ))}
            <button type="button" className="rb-add-btn" onClick={() => addItem('education', emptyEducation)}>+ Add Education</button>
          </div>

          {/* Certifications */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><div className="card-icon">📜</div>Certifications</div>
            </div>
            {resume.certifications.map(c => (
              <div key={c.id} className="rb-list-item">
                <button className="rb-list-item-remove" onClick={() => removeItem('certifications', c.id)} title="Remove">✕</button>
                <div className="rb-row">
                  <div className="form-field">
                    <label>Certification Name</label>
                    <input value={c.name} onChange={e => updateItem('certifications', c.id, 'name', e.target.value)} placeholder="AWS Certified Developer" />
                  </div>
                  <div className="form-field">
                    <label>Issuer</label>
                    <input value={c.issuer} onChange={e => updateItem('certifications', c.id, 'issuer', e.target.value)} placeholder="Amazon Web Services" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Year</label>
                  <input value={c.year} onChange={e => updateItem('certifications', c.id, 'year', e.target.value)} placeholder="2024" />
                </div>
              </div>
            ))}
            <button type="button" className="rb-add-btn" onClick={() => addItem('certifications', emptyCert)}>+ Add Certification</button>
          </div>

          {/* Save bar */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: statusColor(saveStatus) }}>
              {statusMessage(saveStatus)}
            </span>
            <button className="btn btn-primary" onClick={save} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving…' : '💾 Save Resume'}
            </button>
          </div>
        </div>

        {/* ── PREVIEW COLUMN ── */}
        <div className="rb-preview-col">
          <div className="rb-preview-toolbar">
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨 Print Resume</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowPreview(true)}>👁 Preview Before Download</button>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf} disabled={pdfGenerating}>
              {pdfGenerating ? 'Generating…' : '⬇ Download PDF'}
            </button>
          </div>
          {pdfError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{pdfError}</p>}

          <div className="rb-preview-shell">
            <ResumeSheet resume={resume} sheetRef={printRef} />
          </div>
        </div>
      </div>

      {showPreview && (
        <PdfPreviewModal
          resume={resume}
          generating={pdfGenerating}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownloadPdf}
        />
      )}
    </div>
  );
}

function ResumeSheet({ resume, sheetRef }) {
  const p = resume.personalInfo || {};
  return (
    <div id="rb-print-area" ref={sheetRef} className={`rb-template-${resume.template}`}>
      {resume.template === 'modern' && (
        <div className="rb-r-header-band">
          <div className="rb-r-name">{p.fullName || 'Your Name'}</div>
          {resume.targetRole && <div className="rb-r-role">{resume.targetRole}</div>}
          <ContactLine p={p} />
        </div>
      )}

      {resume.template !== 'modern' && (
        <>
          <div className="rb-r-name">{p.fullName || 'Your Name'}</div>
          {resume.targetRole && <div className="rb-r-role">{resume.targetRole}</div>}
          <ContactLine p={p} />
        </>
      )}

      {resume.summary && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Summary</div>
          <div className="rb-r-summary">{resume.summary}</div>
        </div>
      )}

      {(resume.skills.languages.length + resume.skills.frameworks.length + resume.skills.databases.length + resume.skills.tools.length) > 0 && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Skills</div>
          <div className="rb-r-skills-row">
            {[...resume.skills.languages, ...resume.skills.frameworks, ...resume.skills.databases, ...resume.skills.tools].map(s => (
              <span key={s} className="rb-r-skill-tag">{s}</span>
            ))}
          </div>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Experience</div>
          {resume.experience.map(exp => (
            <div key={exp.id} className="rb-r-entry">
              <div className="rb-r-entry-top">
                <span>{exp.role || 'Role'}{exp.company ? ` — ${exp.company}` : ''}</span>
                <span style={{ fontWeight: 400, color: '#71717a' }}>{exp.duration}</span>
              </div>
              {exp.responsibilities && <div className="rb-r-entry-body">{exp.responsibilities}</div>}
            </div>
          ))}
        </div>
      )}

      {resume.projects.length > 0 && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Projects</div>
          {resume.projects.map(proj => (
            <div key={proj.id} className="rb-r-entry">
              <div className="rb-r-entry-top">
                <span>{proj.name || 'Project'}</span>
                {proj.link && <span style={{ fontWeight: 400, color: '#71717a' }}>{proj.link}</span>}
              </div>
              {proj.tech && <div className="rb-r-entry-sub">{proj.tech}</div>}
              {proj.description && <div className="rb-r-entry-body">{proj.description}</div>}
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Education</div>
          {resume.education.map(ed => (
            <div key={ed.id} className="rb-r-entry">
              <div className="rb-r-entry-top">
                <span>{ed.degree || 'Degree'}{ed.school ? ` — ${ed.school}` : ''}</span>
                <span style={{ fontWeight: 400, color: '#71717a' }}>{ed.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="rb-r-section">
          <div className="rb-r-heading">Certifications</div>
          {resume.certifications.map(c => (
            <div key={c.id} className="rb-r-entry">
              <div className="rb-r-entry-top">
                <span>{c.name || 'Certification'}{c.issuer ? ` — ${c.issuer}` : ''}</span>
                <span style={{ fontWeight: 400, color: '#71717a' }}>{c.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactLine({ p }) {
  const items = [p.email, p.location, p.linkedin, p.github, p.website].filter(Boolean);
  if (items.length === 0) return null;
  return <div className="rb-r-contact">{items.map((it, i) => <span key={i}>{it}</span>)}</div>;
}

// ── Preview Before Download modal ──
function PdfPreviewModal({ resume, onClose, onDownload, generating }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ position: 'relative', maxWidth: 860, width: '92%' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Preview Before Download</h2>
        <p className="modal-company" style={{ marginBottom: 16 }}>
          This is what your exported PDF will contain — {TEMPLATES.find(t => t.id === resume.template)?.label} template.
        </p>
        <div className="rb-preview-shell" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <ResumeSheet resume={resume} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Keep Editing</button>
          <button className="btn btn-primary" onClick={onDownload} disabled={generating}>
            {generating ? 'Generating…' : '⬇ Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

function statusMessage(status) {
  switch (status) {
    case 'saving':    return 'Saving your resume…';
    case 'success':   return '✅ Resume saved!';
    case 'localOnly': return '💾 Saved on this device (backend unreachable — will retry next save)';
    case 'error':     return '⚠️ Could not save. Please try again.';
    default:          return 'Changes are not saved until you click "Save Resume".';
  }
}

function statusColor(status) {
  switch (status) {
    case 'success':   return 'var(--green)';
    case 'localOnly': return 'var(--yellow)';
    case 'error':     return 'var(--red)';
    default:          return 'var(--text3)';
  }
}
