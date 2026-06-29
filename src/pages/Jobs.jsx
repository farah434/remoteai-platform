import { useState, useMemo, useEffect } from 'react';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import { rankJobsByMatch } from '../utils/matching';

const TYPES  = ['full-time', 'part-time', 'contract', 'freelance'];
const LEVELS = ['beginner', 'mid', 'senior'];

const CATEGORIES = [
  { id: 'all',              label: 'All Categories',    icon: '🌐' },
  { id: 'software-dev',     label: 'Software Dev',      icon: '💻' },
  { id: 'ai-data',          label: 'AI & Data',         icon: '🤖' },
  { id: 'design',           label: 'Design',            icon: '🎨' },
  { id: 'devops',           label: 'DevOps',            icon: '⚙️' },
  { id: 'writing',          label: 'Writing',           icon: '✍️' },
  { id: 'marketing',        label: 'Marketing',         icon: '📣' },
  { id: 'customer-support', label: 'Support',           icon: '💬' },
  { id: 'virtual-assistant',label: 'Virtual Assistant', icon: '🗂' },
  { id: 'sales',            label: 'Sales',             icon: '📈' },
  { id: 'finance',          label: 'Finance',           icon: '💰' },
  { id: 'education',        label: 'Education',         icon: '📚' },
  { id: 'qa-testing',       label: 'QA & Testing',      icon: '🧪' },
  { id: 'cybersecurity',    label: 'Security',          icon: '🔐' },
  { id: 'product',          label: 'Product',           icon: '📦' },
];

// Client-side category keyword map mirrors the backend's CATEGORY_KEYWORDS
const CAT_KEYWORDS = {
  'software-dev':    ['developer','engineer','software','fullstack','backend','frontend','node','react','python','java','ruby','golang','php','typescript'],
  'ai-data':         ['data','analyst','machine learning','ai','ml','data science','nlp','analytics','tensorflow'],
  'design':          ['design','ux','ui','figma','graphic','motion','visual'],
  'writing':         ['writer','content','copywriter','editor','technical writer','documentation','blog'],
  'marketing':       ['marketing','growth','seo','social media','email marketing','brand','campaign','ads','ppc'],
  'customer-support':['support','customer success','customer service','helpdesk','zendesk'],
  'virtual-assistant':['virtual assistant','executive assistant','administrative','admin'],
  'sales':           ['sales','account executive','business development','bdr','sdr','revenue'],
  'finance':         ['finance','accounting','bookkeeper','financial analyst','tax'],
  'education':       ['teacher','tutor','instructor','education','elearning','curriculum'],
  'devops':          ['devops','sre','infrastructure','cloud','aws','kubernetes','docker','platform engineer'],
  'qa-testing':      ['qa','quality assurance','tester','test engineer','automation test','sdet'],
  'product':         ['product manager','product owner','scrum','agile','pm'],
  'cybersecurity':   ['security','infosec','penetration','soc','cybersecurity'],
};

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

  useEffect(() => {
    setLoading(true);
    // Fetch API jobs only — backend already filters source:'api'
    jobsAPI.list()
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

    // Fetch sync status for the banner
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/jobs/sync-status')
      .then(r => r.json())
      .then(d => setSyncStatus(d))
      .catch(() => {});
  }, []);

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    // Category filter (client-side, matches backend logic)
    if (activeCategory !== 'all') {
      const kws = CAT_KEYWORDS[activeCategory] || [];
      if (kws.length > 0) {
        list = list.filter(j => {
          const haystack = `${j.title} ${(j.tags || []).join(' ')} ${(j.skills || []).join(' ')}`.toLowerCase();
          return kws.some(kw => haystack.includes(kw));
        });
      }
    }

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
            : `${filteredJobs.length} verified remote jobs${activeCategory !== 'all' ? ` in ${CATEGORIES.find(c => c.id === activeCategory)?.label}` : ''}`}
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
        marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 99, fontSize: 13,
              cursor: 'pointer',
              background: activeCategory === cat.id ? 'var(--accent)' : 'var(--bg2)',
              color:      activeCategory === cat.id ? 'white' : 'var(--text2)',
              border: `1px solid ${activeCategory === cat.id ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'all 0.15s',
              fontWeight: activeCategory === cat.id ? 600 : 400,
            }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

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
