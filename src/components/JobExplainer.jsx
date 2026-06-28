/**
 * JobExplainer.jsx — Phase 6 Part 3A
 * Calls POST /api/ai/explain-job and renders a friendly AI breakdown of a job.
 * Usage: <JobExplainer job={jobObject} />
 */
import { useState } from "react";
import "./JobExplainer.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function JobExplainer({ job }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const explain = async () => {
    if (data) { setOpen(true); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/ai/explain-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
      if (!res.ok) throw new Error("AI explanation failed");
      const json = await res.json();
      setData(json);
      setOpen(true);
    } catch (e) {
      setError("Could not load AI explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const difficultyColor = {
    Easy: "#10b981",
    Moderate: "#f59e0b",
    Challenging: "#ef4444",
  };

  return (
    <>
      {/* Trigger button — place inside JobCard or JobModal */}
      <button
        className="jex-trigger-btn"
        onClick={explain}
        disabled={loading}
        title="Get AI explanation of this job"
      >
        {loading ? (
          <>
            <span className="jex-spinner" />
            Analyzing…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="jex-btn-icon">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Explain This Job
          </>
        )}
      </button>

      {error && <p className="jex-error">{error}</p>}

      {/* Slide-in panel */}
      {open && data && (
        <div className="jex-overlay" onClick={() => setOpen(false)}>
          <div className="jex-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="jex-panel-header">
              <div className="jex-panel-title-row">
                <span className="jex-panel-emoji">🤖</span>
                <div>
                  <h3 className="jex-panel-title">AI Job Breakdown</h3>
                  <p className="jex-panel-subtitle">{job.title} · {job.company}</p>
                </div>
              </div>
              <button className="jex-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="jex-panel-body">
              {/* TL;DR */}
              <div className="jex-card jex-tldr">
                <span className="jex-label">TL;DR</span>
                <p>{data.tldr}</p>
              </div>

              {/* Difficulty */}
              <div className="jex-card jex-difficulty-row">
                <span className="jex-label">Difficulty</span>
                <div className="jex-difficulty-content">
                  <span
                    className="jex-difficulty-badge"
                    style={{ background: `${difficultyColor[data.difficultyLevel]}22`, color: difficultyColor[data.difficultyLevel], borderColor: `${difficultyColor[data.difficultyLevel]}55` }}
                  >
                    {data.difficultyLevel}
                  </span>
                  <p className="jex-difficulty-reason">{data.difficultyReason}</p>
                </div>
              </div>

              {/* What You'll Do */}
              <div className="jex-card">
                <span className="jex-label">📋 What You'll Do</span>
                <ul className="jex-list">
                  {(data.whatYouDo || []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Ideal Candidate */}
              <div className="jex-card">
                <span className="jex-label">🎯 Ideal Candidate</span>
                <p className="jex-prose">{data.idealCandidate}</p>
              </div>

              {/* Why Apply + Watch Out side by side */}
              <div className="jex-two-col">
                <div className="jex-card jex-why">
                  <span className="jex-label">✅ Why Apply</span>
                  <ul className="jex-list">
                    {(data.whyApply || []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div className="jex-card jex-watchout">
                  <span className="jex-label">⚠️ Watch Out</span>
                  <ul className="jex-list">
                    {(data.watchOut || []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>

              {/* Salary Context */}
              {data.salaryContext && (
                <div className="jex-card jex-salary-ctx">
                  <span className="jex-label">💰 Salary Context</span>
                  <p className="jex-prose">{data.salaryContext}</p>
                </div>
              )}

              {/* Interview Tips */}
              <div className="jex-card">
                <span className="jex-label">💡 Interview Tips</span>
                <ol className="jex-ordered-list">
                  {(data.interviewTips || []).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
