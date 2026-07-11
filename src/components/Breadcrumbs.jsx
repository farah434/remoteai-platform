import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

/**
 * Shared breadcrumb nav + JSON-LD BreadcrumbList structured data.
 *
 * items: [{ label: 'Home', href: '/' }, { label: 'Jobs', href: '/jobs' }, { label: 'Frontend' }]
 * The last item is the current page and is rendered without a link.
 * siteUrl is only used to build absolute URLs for the JSON-LD @id fields —
 * pass window.location.origin from the page that renders this.
 */
export default function Breadcrumbs({ items, siteUrl }) {
  if (!items || items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl || ''}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: 13 }}>
        <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--text3)' }}>/</span>}
                {isLast || !item.href ? (
                  <span style={{ color: 'var(--text2)', fontWeight: isLast ? 600 : 400 }}>{item.label}</span>
                ) : (
                  <Link to={item.href} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
