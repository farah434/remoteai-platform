export default function About() {
  const stats = [
    { value: '10,000+', label: 'Remote Jobs Listed' },
    { value: '150+', label: 'Countries Reached' },
    { value: '98%', label: 'AI Match Accuracy' },
    { value: '50K+', label: 'Developers Helped' },
  ];

  const values = [
    {
      icon: '🌍',
      title: 'Global First',
      desc: 'We believe great talent exists everywhere. RemoteAI connects developers from Karachi to Nairobi to São Paulo with top remote opportunities worldwide.',
    },
    {
      icon: '🤖',
      title: 'AI-Powered Matching',
      desc: 'Our matching engine analyses your skills against job requirements in real time — no more scrolling through irrelevant listings.',
    },
    {
      icon: '📈',
      title: 'Career Growth',
      desc: 'Beyond job listings, we give you a personalised roadmap, skill-gap analysis, and an AI mentor to guide every step of your career.',
    },
    {
      icon: '🔒',
      title: 'Transparent & Fair',
      desc: 'No pay-to-rank. Every developer sees job matches purely based on their skills. Your score is yours.',
    },
  ];

  const team = [
    { name: 'Farah Irfan', role: 'Founder & Owner', emoji: '👩‍💻' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80 }}>

      {/* Hero */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <span style={{
            display: 'inline-block', marginBottom: 20,
            padding: '6px 16px', borderRadius: 99,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: 13, color: '#a5b4fc', fontWeight: 500,
          }}>🚀 Our Story</span>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' }}>
            Built for developers who{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              refuse to be limited
            </span>
            {' '}by geography
          </h1>
          <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7 }}>
            RemoteAI was born from a simple frustration: brilliant developers in emerging markets
            were being overlooked — not because of skill, but because of location. We built the
            platform we wish had existed.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 24px 60px' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16,
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '28px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(135deg,#818cf8,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '20px 24px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20, padding: '40px 36px',
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Our Mission</h2>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.8, marginBottom: 16 }}>
              To democratise access to remote work for every developer on the planet — regardless
              of country, time zone, or background. We combine AI-powered job matching with
              personalised career mentoring so that your skills, not your passport, define your ceiling.
            </p>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.8 }}>
              We believe a React developer in Lahore deserves the same shot at a $120k remote role
              as one in London. RemoteAI is the bridge.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '0 24px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>What We Stand For</h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 36 }}>The principles that guide every decision we make.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {values.map(v => (
              <div key={v.title} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 28,
                transition: 'border-color .2s, transform .2s',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 14 }}>{v.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>The Team</h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 36 }}>A small team with a big mission.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
            {team.map(t => (
              <div key={t.name} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: '28px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{t.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
