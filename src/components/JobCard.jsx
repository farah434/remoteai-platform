import SaveJobButton from './SaveJobButton';
import { getMatchLabel } from '../utils/matching';

export default function JobCard({ job, onClick, matchScore, showMatch }) {
  const match = showMatch && matchScore !== undefined ? matchScore : null;
  const matchInfo = match !== null ? getMatchLabel(match) : null;

  return (
    <div className="job-card" onClick={() => onClick && onClick(job)}>
      
      <div className="job-card-header">
        <div className="company-logo" style={{ background: job.logoColor }}>
          {job.logo}
        </div>

        <div className="job-meta">
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company} · {job.location}</div>
        </div>

        <div className="job-salary">{job.salary}</div>
      </div>

      <div className="job-tags">
        {job.tags.map(t => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>

      {/* ✅ SAVE BUTTON (ONLY ONCE, CORRECT PLACE) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <SaveJobButton job={job} />
      </div>

      <div className="job-footer">
        <div className="job-badges">
          {job.remote && <span className="badge badge-remote">🌍 Remote</span>}
          <span className="badge badge-type">{job.type}</span>
          <span className="badge badge-level">{job.level}</span>
        </div>

        <span className="job-posted">{job.posted}</span>
      </div>

      {match !== null && (
        <div className="match-score">
          <span className="match-label">AI Match</span>
          <div className="match-bar-wrap">
            <div
              className="match-bar"
              style={{ width: `${match}%`, background: matchInfo.color }}
            />
          </div>
          <span className="match-pct" style={{ color: matchInfo.color }}>
            {match}%
          </span>
          <span className="match-label">{matchInfo.label}</span>
        </div>
      )}
    </div>
  );
}