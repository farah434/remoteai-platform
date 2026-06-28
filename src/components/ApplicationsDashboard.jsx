import { useState, useEffect } from "react";
import "./panels.css";

const STATUS_STYLES = {
  pending:   { label: "Pending",   className: "status-pending" },
  reviewed:  { label: "Reviewed",  className: "status-reviewed" },
  interview: { label: "Interview", className: "status-interview" },
  rejected:  { label: "Rejected",  className: "status-rejected" },
  accepted:  { label: "Accepted",  className: "status-accepted" },
};

export default function ApplicationsDashboard() {
  const [appliedJobs, setAppliedJobs] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem("appliedJobs");
    try {
      setAppliedJobs(raw ? JSON.parse(raw) : []);
    } catch {
      setAppliedJobs([]);
    }
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatus = (raw) => {
    const key = (raw || "pending").toLowerCase();
    return STATUS_STYLES[key] || { label: raw || "Pending", className: "status-pending" };
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <span className="panel-icon">📋</span>
        <h2 className="panel-title">My Applications</h2>
        <span className="panel-count">{appliedJobs.length}</span>
      </div>

      {appliedJobs.length === 0 ? (
        <div className="panel-empty">
          <span className="empty-icon">📝</span>
          <p>No applications yet.</p>
          <p className="empty-sub">Apply to jobs and track your progress here.</p>
        </div>
      ) : (
        <ul className="panel-list">
          {appliedJobs.map((job, idx) => {
            const status = getStatus(job.status);
            return (
              <li key={job.id ?? idx} className="panel-card">
                <div className="panel-card-body">
                  <div className="panel-card-info">
                    <h3 className="job-title">{job.title || "Untitled Role"}</h3>
                    <p className="job-company">{job.company || "Unknown Company"}</p>
                    <div className="job-meta">
                      <span className="meta-badge date">
                        Applied {formatDate(job.appliedAt)}
                      </span>
                      <span className={`meta-badge status-badge ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
