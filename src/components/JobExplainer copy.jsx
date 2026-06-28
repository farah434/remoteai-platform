import { useState } from 'react';
import { aiAPI } from '../services/api';

/**
 * JobExplainer
 * Props:
 *   job      — the full job object from the jobs list
 *   onClose  — optional callback when modal is closed
 */
export default function JobExplainer({ job, onClose }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const handleOpen = async () => {
    setOpen(true);
    if (result) return; // already fetched for this job
    setLoading(true);
    setError('');
    try {
      const data = await aiAPI.explainJob(job);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get AI explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const difficultyColor = {
    Easy:        'var(--green)',
    Moderate:    'var(--yellow)',
    Challenging: 'var(--red)',
  };

  return (
    <>
      {/* ── Trigger button — drop this inside any JobCard ── */}
      <button className="job-explainer-btn" onClick={handleOpen}>
        🤖 Explain this Job
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="je-overlay" onClick={handleClose}>
          <div className="je-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="je-header">
              <div className="je-header-info">
                <h2 className="je-title">{job.title}</h2>
                <p className="je-company">{job.company}</p>
              </div>
              <button className="je-close" onClick={handleClose}>✕</button>
            </div>

            {/* Body */}
            <div className="je-body">

              {/* Loading */}
              {loading && (
                <div className="je-loading">
                  <div className="je-spinner" />
                  <p>AI is analyzing this job...</p>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="je-error">
                  <p>⚠️ {error}</p>
                  <button className="btn btn-outline btn-sm" onClick={handleOpen}>
                    Retry
                  </button>
                </div>
              )}

              {/* Result */}
              {result && !loading && (
                <div className="je-result">

                  {/* TL;DR */}
                  {result.tldr && (
                    <div className="je-section je-tldr">
                      <p>{result.tldr}</p>
                    </div>
                  )}

                  {/* Difficulty badge */}
                  {result.difficultyLevel && (
                    <div className="je-difficulty">
                      <span
                        className="je-difficulty-badge"
                        style={{ color: difficultyColor[result.difficultyLevel] || 'var(--accent2)', borderColor: difficultyColor[result.difficultyLevel] || 'var(--accent2)' }}
                      >
                        {result.difficultyLevel === 'Easy'        && '🟢'}
                        {result.difficultyLevel === 'Moderate'    && '🟡'}
                        {result.difficultyLevel === 'Challenging' && '🔴'}
                        {' '}{result.difficultyLevel}
                      </span>
                      {result.difficultyReason && (
                        <span className="je-difficulty-reason">{result.difficultyReason}</span>
                      )}
                    </div>
                  )}

                  {/* What you'll do */}
                  {result.whatYouDo?.length > 0 && (
                    <div className="je-section">
                      <h4 className="je-section-title">📋 What You'll Do</h4>
                      <ul className="je-list">
                        {result.whatYouDo.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Ideal candidate */}
                  {result.idealCandidate && (
                    <div className="je-section">
                      <h4 className="je-section-title">🎯 Ideal Candidate</h4>
                      <p className="je-text">{result.idealCandidate}</p>
                    </div>
                  )}

                  {/* Why apply */}
                  {result.whyApply?.length > 0 && (
                    <div className="je-section">
                      <h4 className="je-section-title">✅ Why Apply</h4>
                      <ul className="je-list je-list--green">
                        {result.whyApply.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Watch out */}
                  {result.watchOut?.length > 0 && (
                    <div className="je-section">
                      <h4 className="je-section-title">⚠️ Watch Out</h4>
                      <ul className="je-list je-list--yellow">
                        {result.watchOut.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Salary context */}
                  {result.salaryContext && (
                    <div className="je-section je-salary-ctx">
                      <h4 className="je-section-title">💰 Salary Context</h4>
                      <p className="je-text">{result.salaryContext}</p>
                    </div>
                  )}

                  {/* Interview tips */}
                  {result.interviewTips?.length > 0 && (
                    <div className="je-section">
                      <h4 className="je-section-title">💡 Interview Tips</h4>
                      <ul className="je-list je-list--accent">
                        {result.interviewTips.map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Footer */}
            {result && !loading && (
              <div className="je-footer">
                <button className="btn btn-ghost btn-sm" onClick={handleClose}>Close</button>
                {job.applyUrl && (
                  <a
                    className="btn btn-primary btn-sm"
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply Now →
                  </a>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
