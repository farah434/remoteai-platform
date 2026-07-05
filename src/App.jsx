import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import ResumeBuilder from './pages/ResumeBuilder';
import About from './pages/About';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import './styles/global.css';

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      background: 'rgba(255,255,255,0.02)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '48px 24px 28px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 36, marginBottom: 36 }}>

          {/* Brand */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg,#818cf8,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>RemoteAI</div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>AI-powered remote job matching for developers worldwide.</p>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Platform</div>
            {[['/', 'Home'], ['/jobs', 'Browse Jobs'], ['/signup', 'Sign Up'], ['/profile', 'Dashboard']].map(([to, label]) => (
              <Link key={to} to={to} style={{ display: 'block', fontSize: 14, color: '#475569', textDecoration: 'none', marginBottom: 8, transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >{label}</Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Company</div>
            {[['/about', 'About Us'], ['/blog', 'Blog'], ['/contact', 'Contact']].map(([to, label]) => (
              <Link key={to} to={to} style={{ display: 'block', fontSize: 14, color: '#475569', textDecoration: 'none', marginBottom: 8, transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >{label}</Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Legal</div>
            <Link to="/privacy-policy" style={{ display: 'block', fontSize: 14, color: '#475569', textDecoration: 'none', marginBottom: 8, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
              onMouseLeave={e => e.currentTarget.style.color = '#475569'}
            >Privacy Policy</Link>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#334155' }}>© {year} RemoteAI. All rights reserved.</p>
          <p style={{ fontSize: 13, color: '#334155' }}>Built with ❤️ for developers worldwide</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
        <Footer />
        <Chatbot />
      </BrowserRouter>
    </AuthProvider>
  );
}
