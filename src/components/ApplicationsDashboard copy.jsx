import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  applied: '#6366f1',
  reviewing: '#f59e0b',
  interview: '#10b981',
  rejected: '#ef4444',
};

export default function ApplicationsDashboard() {
  const [appliedJobs, setAppliedJobs] = useState([]);

  useEffect(() => {
    try {
      const jobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
      setAppliedJobs(jobs);
    } catch {
      setAppliedJobs([]);
    }
  }, []);

  if (appliedJobs.length === 0) {
    return (
      <div className="panel-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>No applications yet.</p>
        <span>Apply to jobs and track your progress here.</span>
      </div>
    );
  }

  return (
    <div className="applications-dashboard">
      <div className="panel-list">
        {appliedJobs.map((job) => {
          const status = job.status || 'applied';
          return (
            <div key={job.id} className="panel-job-row">
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
                <span
                  className="application-status-badge"
                  style={{ background: STATUS_COLORS[status] + '22', color: STATUS_COLORS[status] }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                <span className="panel-job-date">
                  Applied {new Date(job.appliedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
