import { useState } from 'react';
import { cvAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CVReviewer() {
  const { user } = useAuth();
  const [cvText, setCvText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (cvText.trim().length < 50) { setError('Please paste at least a few lines of your CV.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await cvAPI.review(cvText);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) => s >= 75 ? 'var(--green)' : s >= 50 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>📄 AI CV Reviewer</h3>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>
        Paste your CV text below — AI will score it and suggest improvements.
      </p>

      <textarea
        value={cvText}
        onChange={e => setCvText(e.target.value)}
        placeholder="Paste your CV / resume text here...&#10;&#10;Example:&#10;John Doe | john@email.com&#10;Skills: React, Node.js, MongoDB&#10;Experience: 2 years at TechCorp as Frontend Developer..."
        style={{ minHeight: 160, resize: 'vertical', marginBottom: 10 }}
      />

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button className="btn btn-primary" onClick={analyze} disabled={loading || !cvText.trim()}>
        {loading ? '🔍 Analyzing...' : '🤖 Analyze My CV'}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          {/* ATS Score */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>ATS Score</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(result.atsScore) }}>{result.atsScore}/100</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${result.atsScore}%`, background: scoreColor(result.atsScore), borderRadius: 99, transition: 'width 0.6s' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>{result.summary}</p>
          </div>

          {/* Detected Skills */}
          {result.detectedSkills?.length > 0 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>✅ Skills Detected</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.detectedSkills.map(s => (
                  <span key={s} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 99, fontSize: 12, color: 'var(--green)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {result.missingSkills?.length > 0 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>❌ Missing High-Value Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.missingSkills.map(s => (
                  <span key={s} style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 99, fontSize: 12, color: '#f87171' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>💡 Improvement Suggestions</div>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 14, color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--accent2)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
