import { useParams, Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { blogPosts } from '../data/blogPosts';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '80px 24px' }}>
        <SEO title="Post Not Found" noIndex />
        <div style={{ fontSize: 60 }}>📭</div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Post not found</h2>
        <p style={{ color: '#64748b' }}>This article doesn't exist or may have moved.</p>
        <Link to="/blog" style={{ padding: '10px 22px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontWeight: 600, textDecoration: 'none' }}>← Back to Blog</Link>
      </div>
    );
  }

  const related = blogPosts.filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t)))).slice(0, 2);

  // Convert markdown-ish content to JSX paragraphs
  const renderContent = (text) => {
    return text.trim().split('\n\n').map((block, i) => {
      if (block.startsWith('**') && block.endsWith('**') && !block.slice(2).includes('**')) {
        return <h3 key={i} style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '28px 0 10px' }}>{block.slice(2, -2)}</h3>;
      }
      // Bold inline text
      const parts = block.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} style={{ color: '#e2e8f0' }}>{part.slice(2, -2)}</strong>;
        }
        // Italic (headings within paragraphs like *Niche down*)
        return part.split(/(\*[^*]+\*)/g).map((p, k) => {
          if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
            return <em key={k} style={{ color: '#a5b4fc', fontStyle: 'normal', fontWeight: 600 }}>{p.slice(1, -1)}</em>;
          }
          return p;
        });
      });

      // Unordered list
      if (block.includes('\n- ')) {
        const [intro, ...rest] = block.split('\n- ');
        return (
          <div key={i}>
            {intro && <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.8, marginBottom: 10 }}>{intro}</p>}
            <ul style={{ paddingLeft: 22, margin: '0 0 4px' }}>
              {rest.map((item, j) => (
                <li key={j} style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginBottom: 6 }}
                  dangerouslySetInnerHTML={{ __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }}
                />
              ))}
            </ul>
          </div>
        );
      }

      // Numbered list
      if (/^\d+\./.test(block)) {
        const lines = block.split('\n').filter(Boolean);
        return (
          <ol key={i} style={{ paddingLeft: 22, margin: '12px 0' }}>
            {lines.map((line, j) => (
              <li key={j} style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginBottom: 6 }}
                dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }}
              />
            ))}
          </ol>
        );
      }

      // Emoji flag lines (country list) — starts with flag emoji
      // Check if block starts with a flag emoji (regional indicator: U+1F1E6–U+1F1FF)
      const cp = block.codePointAt(0) || 0;
      if (cp >= 0x1F1E6 && cp <= 0x1F1FF) {
        const lines = block.split('\n').filter(Boolean);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0' }}>
            {lines.map((line, j) => (
              <div key={j} style={{ color: '#94a3b8', fontSize: 14, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }}
              />
            ))}
          </div>
        );
      }

      return <p key={i} style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.85, marginBottom: 6 }}>{parts}</p>;
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80 }}>
      <SEO
        title={post.title}
        description={post.excerpt}
        canonical={`/blog/${post.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          keywords: (post.tags || []).join(', '),
        }}
      />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back */}
        <button onClick={() => navigate('/blog')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginBottom: 32, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#64748b', cursor: 'pointer', transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        >← Back to Blog</button>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${post.categoryColor}18`, color: post.categoryColor, border: `1px solid ${post.categoryColor}30` }}>{post.category}</span>
            <span style={{ fontSize: 13, color: '#475569' }}>📅 {post.date}</span>
            <span style={{ fontSize: 13, color: '#475569' }}>⏱ {post.readTime}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 18 }}>{post.title}</h1>
          <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, borderLeft: '3px solid rgba(99,102,241,0.4)', paddingLeft: 18 }}>{post.excerpt}</p>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            {post.tags.map(t => (
              <span key={t} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569' }}>#{t}</span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 40 }} />

        {/* Content */}
        <article style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {renderContent(post.content)}
        </article>

        {/* CTA */}
        <div style={{
          marginTop: 56, padding: '32px 28px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.06))',
          border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Ready to find your next remote role?</h3>
          <p style={{ color: '#94a3b8', marginBottom: 22, fontSize: 15 }}>Get AI-matched to remote jobs that fit your skills.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/jobs" style={{
              padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg,#6366f1,#ec4899)', color: '#fff', textDecoration: 'none',
              transition: 'opacity .2s',
            }}>Browse Jobs →</Link>
            <Link to="/signup" style={{
              padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0', textDecoration: 'none',
            }}>Create Free Account</Link>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div style={{ marginTop: 52 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Related Articles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
              {related.map(p => (
                <Link key={p.id} to={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '20px 18px',
                    transition: 'border-color .2s, transform .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{p.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3, marginBottom: 8 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{p.readTime}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
