import { useState, useEffect } from 'react';

export default function SavedJobsPanel({ onJobClick }) {
  const [savedJobs, setSavedJobs] = useState([]);

  useEffect(() => {
    try {
      const jobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      setSavedJobs(jobs);
    } catch {
      setSavedJobs([]);
    }
  }, []);

  const unsave = (jobId) => {
    const updated = savedJobs.filter((j) => j.id !== jobId);
    setSavedJobs(updated);
    localStorage.setItem('savedJobs', JSON.stringify(updated));
  };

  if (savedJobs.length === 0) {
    return (
      <div className="panel-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <p>No saved jobs yet.</p>
        <span>Browse jobs and click Save to bookmark them here.</span>
      </div>
    );
  }

  return (
    <div className="saved-jobs-panel">
      <div className="panel-list">
        {savedJobs.map((job) => (
          <div
            key={job.id}
            className="panel-job-row"
            onClick={() => onJobClick && onJobClick(job)}
            style={{ cursor: onJobClick ? 'pointer' : 'default' }}
          >
            <div
              className="panel-job-logo"
              style={{ background: job.logoColor || '#6366f1' }}
            >
              {job.logo || job.company?.slice(0, 2).toUpperCase()}
            </div>
            <div className="panel-job-info">
              <span className="panel-job-title">{job.title}</span>
              <span className="panel-job-company">{job.company}</span>
            </div>
            <div className="panel-job-meta">
              <span className="panel-job-salary">{job.salary}</span>
              <span className="panel-job-date">
                Saved {new Date(job.savedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              className="panel-unsave-btn"
              onClick={(e) => { e.stopPropagation(); unsave(job.id); }}
              title="Remove from saved"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
