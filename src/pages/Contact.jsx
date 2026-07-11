import { useState } from 'react';
import SEO from '../components/SEO';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');
    // Simulate submit — wire up to your backend or Formspree later
    await new Promise(r => setTimeout(r, 1200));
    setStatus('sent');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  };

  const faqs = [
    { q: 'Is RemoteAI free to use?', a: 'Yes — job browsing, AI matching, and the career mentor are completely free for developers.' },
    { q: 'How does AI matching work?', a: 'We compare your listed skills against job requirements using a weighted scoring engine. The higher the overlap, the higher your match score.' },
    { q: 'Can I list a job as an employer?', a: 'Employer features are coming soon. Email us at jobs@remoteai.app to get early access.' },
    { q: 'Is my CV data stored?', a: 'No. CV text is analysed in the browser and never sent to or stored on our servers.' },
  ];

  const channels = [
    { icon: '✉️', label: 'Email', value: 'remoteaiplatform@gmail.com', href: 'mailto:remoteaiplatform@gmail.com' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80 }}>
      <SEO
        title="Contact Us"
        description="Get in touch with the RemoteAI team — questions, feedback, or employer inquiries."
        canonical="/contact"
      />

      {/* Header */}
      <section style={{
        padding: '60px 24px 48px', textAlign: 'center',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.09) 0%, transparent 70%)',
      }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 12 }}>
          Get in Touch
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 17, maxWidth: 500, margin: '0 auto' }}>
          Questions, feedback, or partnership ideas? We'd love to hear from you.
        </p>
      </section>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 28, alignItems: 'start' }}>

        {/* Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Send a Message</h2>

          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Message Sent!</h3>
              <p style={{ color: '#94a3b8', marginBottom: 24 }}>We'll get back to you within 24 hours.</p>
              <button onClick={() => setStatus(null)} style={{
                padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc', cursor: 'pointer',
              }}>Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Name *</label>
                  <input
                    value={form.name} onChange={set('name')} required placeholder="Your name"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Email *</label>
                  <input
                    type="email" value={form.email} onChange={set('email')} required placeholder="you@email.com"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Subject</label>
                <input
                  value={form.subject} onChange={set('subject')} placeholder="What's this about?"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Message *</label>
                <textarea
                  value={form.message} onChange={set('message')} required rows={5}
                  placeholder="Tell us how we can help..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                  padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  background: status === 'sending' ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#ec4899)',
                  border: 'none', color: status === 'sending' ? '#64748b' : '#fff',
                  cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                {status === 'sending' ? '⏳ Sending…' : 'Send Message →'}
              </button>
            </form>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Contact channels */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Other Ways to Reach Us</h2>
            {channels.map(c => (
              <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                transition: 'opacity .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{c.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#a5b4fc' }}>{c.value}</div>
                </div>
              </a>
            ))}
          </div>

          {/* FAQs */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>FAQs</h2>
            {faqs.map((f, i) => (
              <details key={i} style={{ marginBottom: 14 }}>
                <summary style={{
                  fontSize: 14, fontWeight: 600, color: '#e2e8f0',
                  cursor: 'pointer', listStyle: 'none', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  userSelect: 'none',
                }}>
                  {f.q} <span style={{ color: '#6366f1', fontSize: 18 }}>+</span>
                </summary>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, padding: '10px 0 4px' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
