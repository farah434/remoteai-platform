import { useState, useMemo, useEffect } from 'react';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, categoriesAPI } from '../services/api';
import { rankJobsByMatch } from '../utils/matching';

const TYPES  = ['full-time', 'part-time', 'contract', 'freelance'];
const LEVELS = ['beginner', 'mid', 'senior'];

// Used only if GET /api/categories fails — keeps the pills usable offline.
const FALLBACK_CATEGORIES = [
  { slug: 'software-dev',     label: 'Software Dev',     jobCount: 0 },
  { slug: 'ai-data',          label: 'AI & Data',        jobCount: 0 },
  { slug: 'design',           label: 'Design',           jobCount: 0 },
  { slug: 'devops',           label: 'DevOps',           jobCount: 0 },
  { slug: 'writing',          label: 'Writing',          jobCount: 0 },
  { slug: 'marketing',        label: 'Marketing',        jobCount: 0 },
  { slug: 'customer-support', label: 'Support',          jobCount: 0 },
  { slug: 'sales',            label: 'Sales',            jobCount: 0 },
];

// Best-effort emoji per category — matched by keyword against slug/label so
// it works for any slug the backend returns, not just a fixed list.
const ICON_RULES = [
  [/front.?end|react|vue|angular|css|html/, '🖥️'],
  [/back.?end|api|server|django|rails|spring|node/, '🗄️'],
  [/full.?stack/, '💻'],
  [/software|developer|engineer/, '💻'],
  [/mobile|ios|android|flutter|swift|kotlin/, '📱'],
  [/ai|artificial intelligence|machine learning|ml\b|data science|llm|genai/, '🤖'],
  [/data engineer|data pipeline|etl|warehouse/, '🗃️'],
  [/^data|analyst|analytics/, '📊'],
  [/ux/, '🧭'],
  [/ui|interface/, '🎛️'],
  [/graphic/, '🖌️'],
  [/design/, '🎨'],
  [/devops|sre|infrastructure|platform engineer/, '⚙️'],
  [/cloud|aws|azure|gcp/, '☁️'],
  [/blockchain|web3|crypto|nft|dao|solidity/, '⛓️'],
  [/game/, '🎮'],
  [/security|infosec|cyber|penetration|soc/, '🔐'],
  [/network/, '📡'],
  [/database|dba/, '🗂️'],
  [/writ|content|copy|editor|documentation|blog/, '✍️'],
  [/seo/, '🔎'],
  [/social media|community/, '📱'],
  [/marketing|growth|brand|campaign|ads|ppc/, '📣'],
  [/support|helpdesk|zendesk|it support/, '💬'],
  [/virtual assistant|executive assistant|admin/, '🗂'],
  [/sales|business development|account executive|bdr|sdr/, '📈'],
  [/finance|accounting|bookkeep|tax/, '💰'],
  [/education|teacher|tutor|instructor|curriculum/, '📚'],
  [/qa|quality assurance|tester|test engineer|sdet/, '🧪'],
  [/product/, '📦'],
  [/hr|human resources|people operations/, '🧑\u200d💼'],
  [/recruit|talent acquisition/, '🧲'],
  [/ecommerce|e-commerce|shopify|marketplace/, '🛒'],
  [/operations|logistics/, '🧰'],
  [/healthcare|nurse|clinical|medical|telehealth/, '🩺'],
  [/legal|attorney|paralegal|compliance/, '⚖️'],
  [/translat|localization|interpreter/, '🌐'],
  [/video|motion graphics|premiere|after effects/, '🎬'],
  [/no-code|no code|low-code|low code|bubble\.io|webflow/, '🧩'],
  [/project management|program manager|pmp/, '🗓️'],
];

function getCategoryIcon(slug = '', label = '') {
  const haystack = `${slug} ${label}`.toLowerCase();
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(haystack)) return icon;
  }
  return '🏷️';
}

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs]             = useState([]);
  const [loadingJobs, setLoading]   = useState(true);
  const [selectedJob, setSelected]  = useState(null);
  const [search, setSearch]         = useState('');
  const [filterTypes, setFilterTypes]   = useState([]);
  const [filterLevels, setFilterLevels] = useState([]);
  const [activeCategory, setCategory]   = useState('all');
  const [aiSort, setAiSort]         = useState(!!user?.skills?.length);
  const [syncStatus, setSyncStatus] = useState(null); // { apiJobs, lastSynced }

  const [categories, setCategories]           = useState([]);
  const [categoriesLoading, setCategoriesLoad] = useState(true);
  const [categoriesError, setCategoriesError]  = useState(false);

  // Jobs are re-fetched from the server whenever the active category
  // changes — /api/jobs?category=<slug> already applies the exact same
  // keyword matching the backend uses for GET /api/categories, so this
  // stays correct for every dynamic category the API returns (not just a
  // fixed client-side list).
  useEffect(() => {
    setLoading(true);
    jobsAPI.list(activeCategory !== 'all' ? { category: activeCategory } : {})
      .then(data => {
        // Client-side double-guard: only show jobs with a real externalId and applyUrl
        const verified = (data || []).filter(j => j.source === 'api' && j.externalId && j.applyUrl);
        setJobs(verified);
      })
      .catch(err => {
        console.error('Failed to load jobs:', err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, [activeCategory]);

  // Sync-status banner — independent of category, fetched once.
  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/jobs/sync-status')
      .then(r => r.json())
      .then(d => setSyncStatus(d))
      .catch(() => {});
  }, []);

  // Dynamic categories for the pill bar.
  useEffect(() => {
    setCategoriesLoad(true);
    setCategoriesError(false);
    categoriesAPI.list()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Failed to load categories:', err);
        setCategories(FALLBACK_CATEGORIES);
        setCategoriesError(true);
      })
      .finally(() => setCategoriesLoad(false));
  }, []);

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    // Category filtering now happens server-side (jobs are re-fetched with
    // ?category=<slug> whenever activeCategory changes), so `jobs` here is
    // already scoped to the active category.

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.tags?.some(t => t.toLowerCase().includes(q)) ||
        j.skills?.some(s => s.toLowerCase().includes(q))
      );
    }

    if (filterTypes.length)  list = list.filter(j => filterTypes.includes(j.type));
    if (filterLevels.length) list = list.filter(j => filterLevels.includes(j.level));

    if (aiSort && user?.skills?.length) {
      list = rankJobsByMatch(list, user.skills);
    }

    return list;
  }, [jobs, search, filterTypes, filterLevels, activeCategory, aiSort, user]);

  const clearAll = () => {
    setFilterTypes([]); setFilterLevels([]);
    setSearch(''); setCategory('all');
  };

  const hasFilters = filterTypes.length > 0 || filterLevels.length > 0 || search || activeCategory !== 'all';

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Remote Jobs</h1>
        <p className="page-sub">
          {loadingJobs
            ? 'Loading verified jobs…'
            : `${filteredJobs.length} verified remote jobs${activeCategory !== 'all' ? ` in ${categories.find(c => c.slug === activeCategory)?.label || ''}` : ''}`}
          {user?.skills?.length && aiSort ? ' — sorted by AI match score' : ''}
        </p>
      </div>

      {/* Verified API banner */}
      {!loadingJobs && syncStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', marginBottom: 20,
          background: 'rgba(16,185,129,0.07)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 10, fontSize: 13,
        }}>
          <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
          <span style={{ color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--green)' }}>{syncStatus.apiJobs || jobs.length} verified API jobs</strong>
            {' '}from real companies via Remotive
            {syncStatus.lastSynced && (
              <span style={{ color: 'var(--text3)', marginLeft: 8 }}>
                · Last updated {new Date(syncStatus.lastSynced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Category pills */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
        marginBottom: 8, paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {categoriesLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ width: 90 + (i % 3) * 20, height: 28, borderRadius: 99 }} />
          ))
        ) : (
          <>
            {/* "All Categories" is always available regardless of what the API returns */}
            <button
              onClick={() => setCategory('all')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99, fontSize: 13,
                cursor: 'pointer',
                background: activeCategory === 'all' ? 'var(--accent)' : 'var(--bg2)',
                color:      activeCategory === 'all' ? 'white' : 'var(--text2)',
                border: `1px solid ${activeCategory === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'all 0.15s',
                fontWeight: activeCategory === 'all' ? 600 : 400,
              }}>
              🌐 All Categories
            </button>

            {categories.map(cat => (
              <button key={cat.slug}
                onClick={() => setCategory(cat.slug)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 99, fontSize: 13,
                  cursor: 'pointer',
                  background: activeCategory === cat.slug ? 'var(--accent)' : 'var(--bg2)',
                  color:      activeCategory === cat.slug ? 'white' : 'var(--text2)',
                  border: `1px solid ${activeCategory === cat.slug ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                  fontWeight: activeCategory === cat.slug ? 600 : 400,
                }}>
                {getCategoryIcon(cat.slug, cat.label)} {cat.label}
                {typeof cat.jobCount === 'number' && cat.jobCount > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 99,
                    background: activeCategory === cat.slug ? 'rgba(255,255,255,0.25)' : 'var(--bg3)',
                    color: activeCategory === cat.slug ? 'white' : 'var(--text3)',
                  }}>
                    {cat.jobCount}
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      {categoriesError ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: -4, marginBottom: 20 }}>
          Couldn't load live categories — showing a default list instead.
        </p>
      ) : (
        <div style={{ marginBottom: 20 }} />
      )}

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍  Search by title, skill, or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 480 }}
        />
      </div>

      <div className="jobs-layout">
        {/* FILTERS SIDEBAR */}
        <aside className="filters-panel">
          {user?.skills?.length > 0 && (
            <div className="filter-section">
              <h4>AI Features</h4>
              <label className="filter-option">
                <input type="checkbox" checked={aiSort} onChange={e => setAiSort(e.target.checked)} />
                Sort by AI Match Score
              </label>
            </div>
          )}

          <div className="filter-section">
            <h4>Job Type</h4>
            <div className="filter-options">
              {TYPES.map(t => (
                <label key={t} className="filter-option">
                  <input type="checkbox" checked={filterTypes.includes(t)} onChange={() => toggle(filterTypes, setFilterTypes, t)} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h4>Experience Level</h4>
            <div className="filter-options">
              {LEVELS.map(l => (
                <label key={l} className="filter-option">
                  <input type="checkbox" checked={filterLevels.includes(l)} onChange={() => toggle(filterLevels, setFilterLevels, l)} />
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={clearAll}>
              Clear All Filters
            </button>
          )}
        </aside>

        {/* JOBS LIST */}
        <div>
          {loadingJobs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, height: 140 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 15, width: '45%', marginBottom: 8 }} />
                      <div className="skeleton" style={{ height: 12, width: '28%' }} />
                    </div>
                    <div className="skeleton" style={{ height: 14, width: 80 }} />
                  </div>
                  <div className="skeleton" style={{ height: 10, width: '65%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%' }} />
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="no-jobs">
              <div className="emoji">🔍</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No verified jobs found</div>
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 16 }}>
                {jobs.length === 0
                  ? 'Jobs are being synced from our API. Try refreshing in a moment.'
                  : 'Try a different category, search term, or clear your filters.'}
              </div>
              {hasFilters && (
                <button className="btn btn-outline btn-sm" onClick={clearAll}>Clear Filters</button>
              )}
            </div>
          ) : (
            <div className="jobs-list">
              {filteredJobs.map(job => (
                <div key={job._id || job.id} style={{ position: 'relative' }}>
                  {/* Verified API badge — sits above the card */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', marginBottom: 4,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.18)',
                    borderRadius: '6px 6px 0 0',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--green)',
                  }}>
                    ✓ Verified API Job
                  </div>
                  <JobCard
                    job={job}
                    onClick={setSelected}
                    matchScore={job.matchScore}
                    showMatch={aiSort && !!user?.skills?.length}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedJob && <JobModal job={selectedJob} onClose={() => setSelected(null)} />}
    </div>
  );
}
