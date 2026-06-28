/**
 * CVReviewPanel.jsx — Phase 6 Part 3A (Upgraded)
 * Calls POST /api/cv/review and renders full AI analysis including:
 *   - ATS score
 *   - Missing skills
 *   - Suitable roles
 *   - Improvement priorities
 *   - Suggestions & career advice
 *
 * Usage: <CVReviewPanel userSkills={[]} />
 */
import { useState } from "react";
import "./CVReviewPanel.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CVReviewPanel({ userSkills = [] }) {
  const [cvText, setCvText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const submit = async () => {
    if (cvText.trim().length < 50) {
      setError("Please paste at least 50 characters of your CV.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`${API_BASE}/api/cv/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, userSkills, targetRole }),
      });
      if (!res.ok) throw new Error("CV review failed");
      const json = await res.json();
      setData(json);
      setActiveTab("overview");
    } catch {
      setError("CV review failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) =>
    s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

  const impactColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#10b981" };

  const TABS = [
    { id: "overview",    label: "Overview" },
    { id: "skills",      label: "Skills" },
    { id: "roles",       label: "Suitable Roles" },
    { id: "priorities",  label: "Priorities" },
    { id: "advice",      label: "Advice" },
  ];

  return (
    <div className="cvr-container">
      <div className="cvr-header">
        <span className="cvr-header-icon">📄</span>
        <div>
          <h2 className="cvr-title">AI CV Review</h2>
          <p className="cvr-subtitle">Paste your CV for an instant ATS analysis</p>
        </div>
      </div>

      {/* Input area */}
      {!data && (
        <div className="cvr-input-area">
          <input
            className="cvr-role-input"
            type="text"
            placeholder="Target role (optional, e.g. Frontend Developer)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
          <textarea
            className="cvr-textarea"
            rows={10}
            placeholder="Paste your CV text here…"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
          />
          {error && <p className="cvr-error">{error}</p>}
          <button
            className="cvr-submit-btn"
            onClick={submit}
            disabled={loading}
          >
            {loading ? (
              <><span className="cvr-spinner" /> Analyzing CV…</>
            ) : (
              "Analyze My CV →"
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="cvr-results">
          {/* Score row */}
          <div className="cvr-score-row">
            <div
              className="cvr-score-ring"
              style={{ "--score-color": scoreColor(data.atsScore) }}
            >
              <span className="cvr-score-num">{data.atsScore}</span>
              <span className="cvr-score-label">ATS Score</span>
            </div>
            <div className="cvr-score-meta">
              <p className="cvr-summary">{data.summary}</p>
              <button className="cvr-retry-btn" onClick={() => setData(null)}>
                ↩ Review Again
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="cvr-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`cvr-tab ${activeTab === t.id ? "cvr-tab--active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {activeTab === "overview" && (
            <div className="cvr-tab-panel">
              <div className="cvr-two-col">
                <div className="cvr-card cvr-strengths">
                  <span className="cvr-card-label">✅ Strengths</span>
                  <ul className="cvr-list">
                    {(data.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="cvr-card cvr-weaknesses">
                  <span className="cvr-card-label">❌ Weaknesses</span>
                  <ul className="cvr-list">
                    {(data.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── Skills tab ── */}
          {activeTab === "skills" && (
            <div className="cvr-tab-panel">
              <div className="cvr-card">
                <span className="cvr-card-label">✅ Detected Skills</span>
                <div className="cvr-chip-row">
                  {(data.detectedSkills || []).map((s, i) => (
                    <span key={i} className="cvr-chip cvr-chip--found">{s}</span>
                  ))}
                  {(!data.detectedSkills?.length) && <p className="cvr-empty">No skills detected.</p>}
                </div>
              </div>
              <div className="cvr-card cvr-missing-card">
                <span className="cvr-card-label">⚠️ Missing High-Value Skills</span>
                <div className="cvr-chip-row">
                  {(data.missingSkills || []).map((s, i) => (
                    <span key={i} className="cvr-chip cvr-chip--missing">{s}</span>
                  ))}
                  {(!data.missingSkills?.length) && <p className="cvr-empty">No critical gaps found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Suitable Roles tab ── */}
          {activeTab === "roles" && (
            <div className="cvr-tab-panel">
              <div className="cvr-card">
                <span className="cvr-card-label">🎯 Roles This CV Suits</span>
                <div className="cvr-roles-grid">
                  {(data.suitableRoles || []).map((role, i) => (
                    <div key={i} className="cvr-role-card">
                      <span className="cvr-role-num">{i + 1}</span>
                      <span className="cvr-role-name">{role}</span>
                    </div>
                  ))}
                  {(!data.suitableRoles?.length) && <p className="cvr-empty">No role data available.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Priorities tab ── */}
          {activeTab === "priorities" && (
            <div className="cvr-tab-panel">
              <div className="cvr-card">
                <span className="cvr-card-label">🚀 Improvement Priorities</span>
                <div className="cvr-priorities">
                  {(data.improvementPriorities || []).map((p, i) => (
                    <div key={i} className="cvr-priority-row">
                      <span className="cvr-priority-num">#{p.priority || i + 1}</span>
                      <div className="cvr-priority-content">
                        <p className="cvr-priority-action">{p.action}</p>
                      </div>
                      <span
                        className="cvr-impact-badge"
                        style={{
                          background: `${impactColor[p.impact] || "#6366f1"}18`,
                          color: impactColor[p.impact] || "#6366f1",
                          borderColor: `${impactColor[p.impact] || "#6366f1"}44`,
                        }}
                      >
                        {p.impact || "Medium"}
                      </span>
                    </div>
                  ))}
                  {(!data.improvementPriorities?.length) && (
                    <p className="cvr-empty">No priority data available.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Advice tab ── */}
          {activeTab === "advice" && (
            <div className="cvr-tab-panel">
              <div className="cvr-card">
                <span className="cvr-card-label">💡 ATS Improvement Tips</span>
                <ol className="cvr-ordered-list">
                  {(data.suggestions || []).map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
              <div className="cvr-card cvr-career-card">
                <span className="cvr-card-label">🌟 Career Growth Advice</span>
                <ul className="cvr-list">
                  {(data.careerSuggestions || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
