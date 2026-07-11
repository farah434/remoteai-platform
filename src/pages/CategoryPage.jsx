import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import Breadcrumbs from '../components/Breadcrumbs';
import { categoriesAPI } from '../services/api';

// Reuses the exact same JobCard/JobModal components and page/skeleton
// styling classes as Jobs.jsx — no new UI system introduced.
export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedJob, setSelected] = useState(null);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    categoriesAPI.get(slug, { page, limit: 20 })
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setNotFound(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [slug, page]);

  const goToPage = (p) => {
    setSearchParams(p > 1 ? { page: String(p) } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (notFound) {
    return (
      <div className="page">
        <Helmet>
          <title>Category Not Found | RemoteAI</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="no-jobs">
          <div className="emoji">🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Category not found</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 16 }}>
            This category doesn't currently have any open remote jobs.
          </div>
          <Link to="/jobs" className="btn btn-outline btn-sm">Browse all jobs</Link>
        </div>
      </div>
    );
  }

  const label = data?.label || slug;
  const jobCount = data?.jobCount ?? 0;
  const canonicalUrl = `${siteUrl}/jobs/category/${slug}${page > 1 ? `?page=${page}` : ''}`;
  const metaDescription = `Browse ${jobCount} verified remote ${label} jobs. Apply directly to real companies hiring remote ${label.toLowerCase()} talent, updated every few hours.`;

  const jsonLd = data ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Remote ${label} Jobs`,
    description: metaDescription,
    numberOfItems: jobCount,
    itemListElement: (data.jobs || []).map((job, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * (data.limit || 20) + i + 1,
      item: {
        '@type': 'JobPosting',
        title: job.title,
        hiringOrganization: { '@type': 'Organization', name: job.company },
        datePosted: job.posted,
        employmentType: job.type,
        jobLocationType: 'TELECOMMUTE',
        applicantLocationRequirements: { '@type': 'Country', name: job.location || 'Worldwide' },
        url: `${siteUrl}/jobs/category/${slug}`,
      },
    })),
  } : null;

  return (
    <div className="page">
      <Helmet>
        <title>{`${jobCount} Remote ${label} Jobs — Apply Now | RemoteAI`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`Remote ${label} Jobs | RemoteAI`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      </Helmet>

      <Breadcrumbs
        siteUrl={siteUrl}
        items={[
          { label: 'Home', href: '/' },
          { label: 'Jobs', href: '/jobs' },
          { label },
        ]}
      />

      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Remote {label} Jobs</h1>
        <p className="page-sub">
          {loading ? 'Loading verified jobs…' : `${jobCount} verified remote ${label.toLowerCase()} jobs`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, height: 140 }}>
              <div className="skeleton" style={{ height: 15, width: '45%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '65%' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="jobs-list">
            {(data?.jobs || []).map(job => (
              <JobCard key={job._id || job.id} job={job} onClick={setSelected} />
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                ← Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text3)' }}>
                Page {page} of {data.totalPages}
              </span>
              <button className="btn btn-outline btn-sm" disabled={page >= data.totalPages} onClick={() => goToPage(page + 1)}>
                Next →
              </button>
            </div>
          )}

          {data?.relatedCategories?.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: 12 }}>Related Categories</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.relatedCategories.map(c => (
                  <Link
                    key={c.slug}
                    to={`/jobs/category/${c.slug}`}
                    style={{
                      padding: '5px 12px', borderRadius: 99, fontSize: 13,
                      background: 'var(--bg2)', color: 'var(--text2)',
                      border: '1px solid var(--border)', textDecoration: 'none',
                    }}
                  >
                    {c.label} ({c.jobCount})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedJob && <JobModal job={selectedJob} onClose={() => setSelected(null)} />}
    </div>
  );
}
