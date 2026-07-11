import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!form.email || !form.password) { setError('Please fill all fields'); return; }
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <SEO title="Login" description="Log in to RemoteAI to see your AI job matches." noIndex />
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="auth-sub">Login to see your AI job matches</p>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div className="form-field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px' }}
          onClick={handle} disabled={loading}>
          {loading ? 'Logging in...' : 'Login →'}
        </button>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up free</Link>
        </div>
      </div>
    </div>
  );
}
