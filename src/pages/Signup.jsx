import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { parseSkillsInput } from '../utils/matching';
import { skillCategories } from '../data/jobs';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', skills: '' });
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handle = async () => {
    setLoading(true);
    setError('');
    try {
      const skills = [...new Set([...selectedSkills, ...parseSkillsInput(form.skills)])];
      await signup(form.name, form.email, form.password, skills);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Signup failed. Try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) return (
    <div className="auth-page">
      <SEO title="Sign Up" description="Create your free RemoteAI account and get AI-powered job matches." canonical="/signup" noIndex />
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h2>Add Your Skills</h2>
        <p className="auth-sub">So AI can match you with the best jobs</p>

        {error && <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}

        {Object.entries(skillCategories).map(([cat, skills]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8 }}>{cat}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <button key={s} onClick={() => toggleSkill(s)} className="btn btn-sm"
                  style={{
                    background: selectedSkills.includes(s) ? 'var(--accent)' : 'var(--bg3)',
                    color: selectedSkills.includes(s) ? 'white' : 'var(--text2)',
                    border: `1px solid ${selectedSkills.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
                    textTransform: 'capitalize'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="form-field" style={{ marginTop: 12 }}>
          <label>Or type custom skills (comma separated)</label>
          <input placeholder="e.g. Photoshop, Canva, Video Editing"
            value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
          <button className="btn btn-primary" onClick={handle} style={{ flex: 2 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account ✦'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <SEO title="Sign Up" description="Create your free RemoteAI account and get AI-powered job matches." canonical="/signup" noIndex />
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-sub">Join thousands of remote workers</p>

        <div className="form-field">
          <label>Full Name</label>
          <input placeholder="Ahmed Ali" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input type="password" placeholder="Min 6 characters" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: 12, marginTop: 8 }}
          onClick={() => form.name && form.email && form.password ? setStep(2) : setError('Please fill all fields')}>
          Next: Add Skills →
        </button>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}

        <div className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
