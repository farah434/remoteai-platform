import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { blogPosts } from '../data/blogPosts';

const ALL_CATEGORIES = ['All', ...new Set(blogPosts.map(p => p.category))];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = blogPosts.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 80 }}>
      <SEO
        title="Blog"
        description="Career advice, remote work tips, and AI job-search strategies from the RemoteAI team."
        canonical="/blog"
      />

      {/* Header */}
      <section style={{
        padding: '60px 24px 48px', textAlign: 'center',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.09) 0%, transparent 70%)',
      }}>
        <span style={{
          display: 'inline-block', marginBottom: 16,
          padding: '5px 14px', borderRadius: 99,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          fontSize: 12, color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>Developer Resources</span>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 14 }}>
          The RemoteAI Blog
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 17, maxWidth: 520, margin: '0 auto 32px' }}>
          Actionable guides on remote work, freelancing, career growth, and the skills that matter in 2026.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search articles…"
            style={{
              width: '100%', padding: '12px 18px', borderRadius: 12, fontSize: 14,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color .15s, box-shadow .15s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </section>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 18px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                border: '1px solid',
                borderColor: activeCategory === cat ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                background: activeCategory === cat ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat ? '#a5b4fc' : '#64748b',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Featured post */}
        {filtered.length > 0 && activeCategory === 'All' && !search && (
          <Link to={`/blog/${filtered[0].slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.06))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 20, padding: '36px 32px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28,
              alignItems: 'center',
              transition: 'border-color .2s, transform .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${filtered[0].categoryColor}18`, color: filtered[0].categoryColor, border: `1px solid ${filtered[0].categoryColor}30` }}>{filtered[0].category}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Featured</span>
                </div>
                <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 14, color: '#f1f5f9' }}>{filtered[0].title}</h2>
                <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{filtered[0].excerpt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748b' }}>
                  <span>📅 {filtered[0].date}</span>
                  <span>⏱ {filtered[0].readTime}</span>
                </div>
              </div>
              <div style={{ fontSize: 80, textAlign: 'center' }}>{filtered[0].emoji}</div>
            </div>
          </Link>
        )}

        {/* Post grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
          {(activeCategory === 'All' && !search ? filtered.slice(1) : filtered).map(post => (
            <Link key={post.id} to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: '24px 22px', height: '100%', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'border-color .2s, transform .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 40 }}>{post.emoji}</div>
                <div>
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${post.categoryColor}18`, color: post.categoryColor, border: `1px solid ${post.categoryColor}30` }}>{post.category}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: '#f1f5f9', flex: 1 }}>{post.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{post.excerpt.slice(0, 100)}…</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#475569', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15 }}>No articles found for "{search || activeCategory}"</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); }} style={{
              marginTop: 16, padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc', cursor: 'pointer',
            }}>Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
