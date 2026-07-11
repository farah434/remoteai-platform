import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import { rankJobsByMatch } from '../utils/matching';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    jobsAPI.list()
      .then(data => {
        const list = user?.skills?.length > 0
          ? rankJobsByMatch(data, user.skills).slice(0, 3)
          : data.slice(0, 3);
        setFeatured(list);
      })
      .catch(() => {});
  }, [user]);

  return (
    <>
      <SEO
        title="RemoteAI - AI Powered Remote Jobs Platform"
        rawTitle
        description="Find 500+ verified remote jobs with AI-powered matching."
        canonical="https://remoteai-platform.vercel.app/"
      />

      <section className="hero">
        <div className="hero-tag">✦ AI-Powered Job Matching</div>
        <h1>
          Find Your Perfect<br />
          <span className="gradient">Remote Job</span>
        </h1>
        <p>AI matches your skills to the best remote opportunities — worldwide, no commute required.</p>
        <div className="hero-cta">
          <button className="btn btn-primary" style={{ fontSize: 16, padding: '12px 28px' }} onClick={() => navigate('/jobs')}>
            Browse Jobs →
          </button>
          {!user && (
            <button className="btn btn-ghost" style={{ fontSize: 16, padding: '12px 28px' }} onClick={() => navigate('/signup')}>
              Get AI Match Score
            </button>
          )}
        </div>

        <div className="hero-stats">
          <div className="stat"><div className="number">8+</div><div className="label">Live Remote Jobs</div></div>
          <div className="stat"><div className="number">AI</div><div className="label">Skill Matching</div></div>
          <div className="stat"><div className="number">100%</div><div className="label">Remote Only</div></div>
          <div className="stat"><div className="number">Free</div><div className="label">Forever</div></div>
        </div>
      </section>

      <section className="section-container">
        <div className="feature-grid">
          {[
            { icon: '🎯', title: 'AI Match Score', desc: 'See how well your skills match each job — instantly.' },
            { icon: '🔍', title: 'Smart Filters', desc: 'Filter by level, type, or required skills in seconds.' },
            { icon: '📈', title: 'Skill Gap Analysis', desc: "Know exactly what's missing before you apply." },
            { icon: '🤖', title: 'Career Mentor AI', desc: 'Chat with our AI mentor for personalized roadmaps.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '20px 24px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>
              {user?.skills?.length > 0 ? '✦ Your Best Matches' : 'Featured Jobs'}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>
              {user?.skills?.length > 0 ? 'Ranked by AI match score based on your skills' : 'Top remote opportunities right now'}
            </p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/jobs')}>View All →</button>
        </div>

        <div className="jobs-list">
          {featured.map(job => (
            <JobCard
              key={job._id || job.id}
              job={job}
              onClick={() => navigate('/jobs')}
              matchScore={job.matchScore}
              showMatch={user?.skills?.length > 0}
            />
          ))}
        </div>
      </section>
    </>
  );
}
