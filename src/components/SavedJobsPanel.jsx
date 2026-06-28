import { useState, useEffect } from "react";
import "./panels.css";

export default function SavedJobsPanel() {
  const [savedJobs, setSavedJobs] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem("savedJobs");
    try {
      setSavedJobs(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedJobs([]);
    }
  }, []);

  const removeJob = (jobId) => {
    const updated = savedJobs.filter((j) => j.id !== jobId);
    setSavedJobs(updated);
    localStorage.setItem("savedJobs", JSON.stringify(updated));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <span className="panel-icon">🔖</span>
        <h2 className="panel-title">Saved Jobs</h2>
        <span className="panel-count">{savedJobs.length}</span>
      </div>

      {savedJobs.length === 0 ? (
        <div className="panel-empty">
          <span className="empty-icon">📭</span>
          <p>No saved jobs yet.</p>
          <p className="empty-sub">Browse jobs and hit the bookmark button to save them here.</p>
        </div>
      ) : (
        <ul className="panel-list">
          {savedJobs.map((job) => (
            <li key={job.id} className="panel-card">
              <div className="panel-card-body">
                <div className="panel-card-info">
                  <h3 className="job-title">{job.title || "Untitled Role"}</h3>
                  <p className="job-company">{job.company || "Unknown Company"}</p>
                  <div className="job-meta">
                    {job.salary && (
                      <span className="meta-badge salary">{job.salary}</span>
                    )}
                    <span className="meta-badge date">
                      Saved {formatDate(job.savedAt)}
                    </span>
                  </div>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeJob(job.id)}
                  title="Remove from saved"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
