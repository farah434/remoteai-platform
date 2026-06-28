/**
 * Jobs.jsx — Updated with Search & Filters (Phase 6 Part 3B)
 * Frontend-only filtering — no backend changes.
 * AI match score, JobCard and JobModal integrations preserved.
 */
import { useState, useEffect, useMemo } from "react";
import JobCard from "../components/JobCard";
import JobModal from "../components/JobModal";
import { useAuth } from '../context/AuthContext';
import { calculateMatchScore } from "../utils/matching";
import "./Jobs.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const JOB_TYPES = ["full-time", "part-time", "contract", "freelance"];
const LEVELS    = ["beginner", "mid", "senior"];
const CATEGORIES = [
  "All",
  "Engineering",
  "Design",
  "Data",
  "Marketing",
  "Writing",
  "Support",
  "DevOps",
  "Management",
];

// Map category label → keywords present in title/tags/skills
const CATEGORY_KEYWORDS = {
  Engineering: ["developer", "engineer", "frontend", "backend", "fullstack", "full stack", "react", "node", "javascript", "python", "java", "php", "ios", "android", "mobile"],
  Design:      ["design", "ui", "ux", "figma", "illustrator", "photoshop", "graphic", "creative"],
  Data:        ["data", "analyst", "analytics", "science", "scientist", "ml", "machine learning", "ai", "sql", "pandas"],
  Marketing:   ["marketing", "seo", "social media", "growth", "ads", "ppc", "brand", "campaign"],
  Writing:     ["writer", "writing", "content", "copywriter", "blog", "editor", "technical writer"],
  Support:     ["support", "customer", "help desk", "service", "zendesk", "success"],
  DevOps:      ["devops", "docker", "kubernetes", "aws", "gcp", "azure", "cloud", "ci/cd", "infrastructure", "sre"],
  Management:  ["manager", "lead", "head", "director", "vp", "product", "project", "scrum", "agile", "cto"],
};

function matchesCategory(job, category) {
  if (category === "All" || !category) return true;
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const haystack = [
    job.title || "",
    ...(job.tags || []),
    ...(job.skills || []),
    job.description || "",
  ].join(" ").toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

export default function Jobs() {
  const { user } = useAuth(); {};
  const userSkills = user?.skills || {};

  const [allJobs, setAllJobs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // Filter state
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("All");
  const [level, setLevel]           = useState("");
  const [type, setType]             = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy]         = useState("match"); // "match" | "recent"

  // Fetch all jobs once (no backend filters — frontend filtering)
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/jobs?limit=200`);
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        const jobs = Array.isArray(data) ? data : data.jobs || [];
        // Attach AI match score
        const withScore = jobs.map((job) => ({
          ...job,
          id: job._id || job.id,
          matchScore: calculateMatchScore(userSkills, job.skills || []),
        }));
        setAllJobs(withScore);
      } catch (e) {
        setError("Could not load jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Re-score when user skills change
  const scoredJobs = useMemo(() =>
    allJobs.map((job) => ({
      ...job,
      matchScore: calculateMatchScore(userSkills, job.skills || []),
    })),
    [allJobs, userSkills]
  );

  // Apply all frontend filters
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = scoredJobs.filter((job) => {
      // Search
      if (q) {
        const haystack = [
          job.title, job.company,
          ...(job.tags || []),
          ...(job.skills || []),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Category
      if (!matchesCategory(job, category)) return false;
      // Level
      if (level && job.level !== level) return false;
      // Type
      if (type && job.type !== type) return false;
      // Remote only
      if (remoteOnly && !job.remote) return false;

      return true;
    });

    // Sort
    if (sortBy === "match") {
      result = [...result].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else {
      result = [...result].sort((a, b) => new Date(b.posted) - new Date(a.posted));
    }

    return result;
  }, [scoredJobs, search, category, level, type, remoteOnly, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setLevel("");
    setType("");
    setRemoteOnly(false);
    setSortBy("match");
  };

  const hasActiveFilters =
    search || category !== "All" || level || type || remoteOnly || sortBy !== "match";

  return (
    <div className="jobs-page">
      {/* ── Page header ── */}
      <div className="jobs-page-header">
        <div>
          <h1 className="jobs-page-title">Remote Jobs</h1>
          <p className="jobs-page-sub">
            {loading ? "Loading…" : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="jobs-search-row">
        <div className="jobs-search-wrap">
          <svg className="jobs-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M17 17l-4-4" strokeLinecap="round" />
          </svg>
          <input
            className="jobs-search-input"
            type="text"
            placeholder="Search jobs, companies, or skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="jobs-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="jobs-sort-wrap">
          <label className="jobs-sort-label">Sort</label>
          <select
            className="jobs-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="match">Best Match</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="jobs-filter-bar">
        {/* Category pills */}
        <div className="jobs-filter-group">
          <span className="jobs-filter-group-label">Category</span>
          <div className="jobs-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`jobs-pill ${category === cat ? "jobs-pill--active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Row of select filters */}
        <div className="jobs-filter-row">
          <div className="jobs-filter-item">
            <label className="jobs-filter-label">Level</label>
            <select
              className="jobs-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="jobs-filter-item">
            <label className="jobs-filter-label">Job Type</label>
            <select
              className="jobs-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <label className="jobs-remote-toggle">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            <span className="jobs-remote-box">
              <span className="jobs-remote-check">✓</span>
            </span>
            Remote Only
          </label>

          {hasActiveFilters && (
            <button className="jobs-clear-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Job list ── */}
      <div className="jobs-content">
        {loading && (
          <div className="jobs-state-center">
            <div className="jobs-spinner" />
            <p>Loading jobs…</p>
          </div>
        )}

        {!loading && error && (
          <div className="jobs-state-center jobs-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div className="jobs-state-center jobs-empty">
            <span className="jobs-empty-icon">🔍</span>
            <p>No jobs match your filters.</p>
            <button className="jobs-clear-btn jobs-clear-btn--lg" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && (
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id || job._id}
                job={job}
                matchScore={job.matchScore}
                onClick={() => setSelectedJob(job)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Job modal ── */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          userSkills={userSkills}
        />
      )}
    </div>
  );
}
