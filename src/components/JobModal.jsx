import ApplyButton from './ApplyButton';
import { useAuth } from '../context/AuthContext';
import { calculateMatchScore, getMatchLabel, getSkillGap } from '../utils/matching';

export default function JobModal({ job, onClose }) {
  const { user } = useAuth();

  if (!job) return null;

  const userSkills = user?.skills || [];
  const matchScore = userSkills.length > 0
    ? calculateMatchScore(userSkills, job.skills)
    : null;

  const matchInfo = matchScore !== null
    ? getMatchLabel(matchScore)
    : null;

  const gap = userSkills.length > 0
    ? getSkillGap(userSkills, job.skills)
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div
            className="company-logo"
            style={{
              background: job.logoColor,
              width: 52,
              height: 52,
              fontSize: 16
            }}
          >
            {job.logo}
          </div>

          <div>
            <h2>{job.title}</h2>
            <div className="modal-company">
              {job.company} · {job.salary} · {job.location}
            </div>
          </div>
        </div>

        <div className="job-tags" style={{ marginBottom: 16 }}>
          {(job.tags || []).map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>

        <p className="modal-desc">{job.description}</p>

        {matchScore !== null && (
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Your AI Match Score
              </span>
              <span style={{ fontWeight: 700, color: matchInfo.color }}>
                {matchScore}% — {matchInfo.label}
              </span>
            </div>

            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99 }}>
              <div
                style={{
                  height: '100%',
                  width: `${matchScore}%`,
                  background: matchInfo.color,
                  borderRadius: 99,
                  transition: 'width 0.5s'
                }}
              />
            </div>
          </div>
        )}

        {gap.length > 0 && (
          <div className="modal-skills">
            <h4>⚠️ Skills you're missing</h4>
            <div>
              {gap.map(g => (
                <span key={g} className="gap-skill">✕ {g}</span>
              ))}
            </div>
          </div>
        )}

        {/* ✅ ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: 10 }}>
          <ApplyButton job={job} />
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}