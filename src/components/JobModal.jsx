import { useAuth } from '../context/AuthContext';
import { calculateMatchScore, getMatchLabel, getSkillGap } from '../utils/matching';

export default function JobModal({ job, onClose }) {
  const { user } = useAuth();

  if (!job) return null;

  const userSkills = user?.skills || [];
  const matchScore = userSkills.length > 0 ? calculateMatchScore(userSkills, job.skills) : null;
  const matchInfo = matchScore !== null ? getMatchLabel(matchScore) : null;
  const gap = userSkills.length > 0 ? getSkillGap(userSkills, job.skills) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div className="company-logo" style={{ background: job.logoColor, width: 52, height: 52, fontSize: 16 }}>{job.logo}</div>
          <div>
            <h2>{job.title}</h2>
            <div className="modal-company">{job.company} · {job.salary} · {job.location}</div>
          </div>
        </div>

        <div className="job-tags" style={{ marginBottom: 16 }}>
          {job.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>

        <p className="modal-desc">{job.description}</p>

        {matchScore !== null && (
          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Your AI Match Score</span>
              <span style={{ fontWeight: 700, color: matchInfo.color }}>{matchScore}% — {matchInfo.label}</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${matchScore}%`, background: matchInfo.color, borderRadius: 99, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}

        {gap.length > 0 && (
          <div className="modal-skills">
            <h4>⚠️ Skills you're missing</h4>
            <div>{gap.map(g => <span key={g} className="gap-skill">✕ {g}</span>)}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {job.applyUrl ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
            >
              Apply Now ✦
            </a>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1 }} disabled title="No application link available for this job">
              Apply link unavailable
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
