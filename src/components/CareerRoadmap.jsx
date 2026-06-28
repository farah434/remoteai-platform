/**
 * CareerRoadmap.jsx — Phase 6 Part 3A
 * Fetches personalized career roadmap from POST /api/career/suggestions.
 * Uses JWT token from localStorage. Add to Profile.jsx.
 *
 * Usage: <CareerRoadmap />
 */
import { useState, useEffect } from "react";
import "./CareerRoadmap.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CareerRoadmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePhase, setActivePhase] = useState(0);

  const token = localStorage.getItem("token");

  const fetchRoadmap = async () => {
    if (!token) { setError("Please log in to view your career roadmap."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/career/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to load roadmap");
      setData(await res.json());
    } catch {
      setError("Could not load your career roadmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoadmap(); }, []);

  const levelColor = { Beginner: "#10b981", Intermediate: "#6366f1", Advanced: "#f59e0b" };

  if (loading) return (
    <div className="cr-container cr-loading">
      <div className="cr-spinner" />
      <p>Building your personalized career roadmap…</p>
    </div>
  );

  if (error) return (
    <div className="cr-container cr-error-state">
      <span className="cr-error-icon">⚠️</span>
      <p>{error}</p>
      <button className="cr-retry-btn" onClick={fetchRoadmap}>Try Again</button>
    </div>
  );

  if (!data) return null;

  return (
    <div className="cr-container">
      {/* Header */}
      <div className="cr-header">
        <div className="cr-header-left">
          <span className="cr-header-icon">🗺️</span>
          <div>
            <h2 className="cr-title">Career Roadmap</h2>
            <p className="cr-subtitle">AI-personalized for your profile</p>
          </div>
        </div>
        <button className="cr-refresh-btn" onClick={fetchRoadmap} title="Refresh roadmap">
          ↻
        </button>
      </div>

      {/* Headline */}
      <div className="cr-headline-card">
        <p className="cr-headline-text">{data.headline}</p>
        <div className="cr-meta-row">
          <span
            className="cr-level-badge"
            style={{ background: `${levelColor[data.currentLevel] || "#6366f1"}22`, color: levelColor[data.currentLevel] || "#6366f1", borderColor: `${levelColor[data.currentLevel] || "#6366f1"}55` }}
          >
            {data.currentLevel}
          </span>
          <span className="cr-target-role">→ {data.targetRole}</span>
        </div>
      </div>

      {/* Quick Wins */}
      {data.quickWins?.length > 0 && (
        <div className="cr-section">
          <h3 className="cr-section-title">⚡ Quick Wins This Week</h3>
          <div className="cr-quick-wins">
            {data.quickWins.map((win, i) => (
              <div key={i} className="cr-quick-win-chip">
                <span className="cr-check">✓</span>
                {win}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap Phases */}
      {data.roadmap?.length > 0 && (
        <div className="cr-section">
          <h3 className="cr-section-title">📍 Your Roadmap</h3>

          {/* Phase tabs */}
          <div className="cr-phase-tabs">
            {data.roadmap.map((phase, i) => (
              <button
                key={i}
                className={`cr-phase-tab ${activePhase === i ? "cr-phase-tab--active" : ""}`}
                onClick={() => setActivePhase(i)}
              >
                Phase {i + 1}
              </button>
            ))}
          </div>

          {/* Active phase content */}
          {data.roadmap[activePhase] && (
            <div className="cr-phase-card">
              <div className="cr-phase-header">
                <span className="cr-phase-name">{data.roadmap[activePhase].phase}</span>
                <span className="cr-phase-duration">{data.roadmap[activePhase].duration}</span>
              </div>
              <ul className="cr-phase-tasks">
                {(data.roadmap[activePhase].tasks || []).map((task, i) => (
                  <li key={i}>
                    <span className="cr-task-dot" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Skills to Learn */}
      {data.skillsToLearn?.length > 0 && (
        <div className="cr-section">
          <h3 className="cr-section-title">🎓 Skills to Learn</h3>
          <div className="cr-skill-chips">
            {data.skillsToLearn.map((skill, i) => (
              <span key={i} className="cr-skill-chip">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Salary Outlook */}
      {data.salaryOutlook && (
        <div className="cr-salary-card">
          <span className="cr-salary-icon">💰</span>
          <div>
            <span className="cr-salary-label">Salary Outlook</span>
            <p className="cr-salary-text">{data.salaryOutlook}</p>
          </div>
        </div>
      )}

      {/* Resources */}
      {data.resources?.length > 0 && (
        <div className="cr-section">
          <h3 className="cr-section-title">📚 Recommended Resources</h3>
          <div className="cr-resources">
            {data.resources.map((r, i) => (
              <a
                key={i}
                href={r.url && r.url !== "search online" ? r.url : `https://www.google.com/search?q=${encodeURIComponent(r.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cr-resource-chip"
              >
                <span className="cr-resource-type">{r.type}</span>
                <span className="cr-resource-name">{r.name}</span>
                <span className="cr-resource-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
