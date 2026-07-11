import SEO from '../components/SEO';

export default function PrivacyPolicy() {
  const updated = 'June 29, 2026';

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{title}</h2>
      <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80 }}>
      <SEO
        title="Privacy Policy"
        description="How RemoteAI collects, uses, and protects your data."
        canonical="/privacy-policy"
      />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Last updated: <strong style={{ color: '#94a3b8' }}>{updated}</strong></p>
          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 10,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            fontSize: 14, color: '#a5b4fc', lineHeight: 1.6,
          }}>
            This Privacy Policy describes how <strong>RemoteAI</strong> ("we", "us", or "our") collects, uses, and shares information when you visit remoteai.app. By using our platform, you agree to the terms below.
          </div>
        </div>

        <Section title="1. Information We Collect">
          <p style={{ marginBottom: 10 }}>We collect information you provide directly, such as:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#e2e8f0' }}>Account Data:</strong> Name, email address, and password when you register.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#e2e8f0' }}>Skills & Profile:</strong> Skills you add, jobs you save, and applications you track.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#e2e8f0' }}>CV Content:</strong> Text you paste into the CV analyser (processed locally, not stored on our servers).</li>
          </ul>
          <p>We also collect information automatically when you use our platform, including IP address, browser type, pages visited, and time spent — via cookies and similar technologies.</p>
        </Section>

        <Section title="2. Cookies">
          <p style={{ marginBottom: 10 }}>We use cookies and similar tracking technologies to:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
            <li style={{ marginBottom: 6 }}>Keep you logged in (session cookies)</li>
            <li style={{ marginBottom: 6 }}>Remember your preferences</li>
            <li style={{ marginBottom: 6 }}>Analyse site traffic via Google Analytics</li>
            <li style={{ marginBottom: 6 }}>Serve relevant advertisements via Google AdSense</li>
          </ul>
          <p>You can control cookies through your browser settings. Disabling cookies may limit some features of the platform.</p>
        </Section>

        <Section title="3. Google AdSense & Advertising">
          <p style={{ marginBottom: 10 }}>
            We use <strong style={{ color: '#e2e8f0' }}>Google AdSense</strong> to display advertisements on our platform. Google uses cookies (including the DoubleClick cookie) to serve ads based on your prior visits to our site and other sites on the internet.
          </p>
          <p style={{ marginBottom: 10 }}>
            Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our site and/or other sites on the Internet.
          </p>
          <p style={{ marginBottom: 10 }}>
            You may opt out of personalised advertising by visiting{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>Google Ads Settings</a>.
            You can also opt out via the{' '}
            <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>Network Advertising Initiative opt-out page</a>.
          </p>
          <p>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website. These cookies are governed by Google's privacy policy.</p>
        </Section>

        <Section title="4. Google Analytics">
          <p style={{ marginBottom: 10 }}>
            We use <strong style={{ color: '#e2e8f0' }}>Google Analytics</strong> to understand how visitors interact with our platform. Google Analytics collects information such as how often users visit the site, what pages they visit, and what other sites they used prior to coming to our site.
          </p>
          <p>We use this information to improve our platform. Google Analytics collects only the IP address assigned to you on the date you visit, not your name or other identifying information. We do not combine the information collected through Google Analytics with personally identifiable information.</p>
        </Section>

        <Section title="5. How We Use Your Information">
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>To provide and improve our job matching and career services</li>
            <li style={{ marginBottom: 8 }}>To personalise your experience and deliver AI-powered recommendations</li>
            <li style={{ marginBottom: 8 }}>To send service-related emails (account confirmation, updates)</li>
            <li style={{ marginBottom: 8 }}>To analyse usage patterns and improve platform performance</li>
            <li style={{ marginBottom: 8 }}>To display relevant advertisements through Google AdSense</li>
            <li style={{ marginBottom: 8 }}>To comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="6. Data Sharing">
          <p style={{ marginBottom: 10 }}>We do <strong style={{ color: '#e2e8f0' }}>not</strong> sell your personal data. We may share data with:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e2e8f0' }}>Service Providers:</strong> MongoDB Atlas (database), Railway/Vercel (hosting), Google (analytics & ads).</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: '#e2e8f0' }}>Legal Requirements:</strong> If required by law or to protect our rights.</li>
          </ul>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your account data for as long as your account is active. You may request deletion at any time by contacting us. Anonymised analytics data may be retained longer for statistical purposes.</p>
        </Section>

        <Section title="8. Your Rights">
          <p style={{ marginBottom: 10 }}>Depending on your location, you may have the right to:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>Access the personal data we hold about you</li>
            <li style={{ marginBottom: 6 }}>Request correction of inaccurate data</li>
            <li style={{ marginBottom: 6 }}>Request deletion of your account and data</li>
            <li style={{ marginBottom: 6 }}>Opt out of marketing communications</li>
            <li style={{ marginBottom: 6 }}>Lodge a complaint with your local data protection authority</li>
          </ul>
          <p style={{ marginTop: 10 }}>To exercise any of these rights, contact us at <strong style={{ color: '#a5b4fc' }}>remoteaiplatform@gmail.com</strong></p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>RemoteAI is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>
        </Section>

        <Section title="11. Contact Us">
          <p>If you have questions about this Privacy Policy, please contact:</p>
          <div style={{ marginTop: 12, padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 14 }}>
            <div><strong style={{ color: '#e2e8f0' }}>RemoteAI — Farah Irfan (Founder & Owner)</strong></div>
            <div style={{ marginTop: 4 }}>Email: <a href="mailto:remoteaiplatform@gmail.com" style={{ color: '#818cf8' }}>remoteaiplatform@gmail.com</a></div>
            <div style={{ marginTop: 2 }}></div>
          </div>
        </Section>

      </div>
    </div>
  );
}
