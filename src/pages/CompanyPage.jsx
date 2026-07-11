import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import Breadcrumbs from '../components/Breadcrumbs';
import { companiesAPI } from '../services/api';

// Reuses the exact same JobCard/JobModal components and page/skeleton
// styling classes as Jobs.jsx — no new UI system introduced.
export default function CompanyPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedJob, setSelected] = useState(null);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    companiesAPI.get(slug)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setNotFound(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [slug]);

  if (notFound) {
    return (
      <div className="page">
        <Helmet>
          <title>Company Not Found | RemoteAI</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="no-jobs">
          <div className="emoji">🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Company not found</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 16 }}>
            This company doesn't currently have any open remote jobs listed.
          </div>
          <Link to="/jobs" className="btn btn-outline btn-sm">Browse all jobs</Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, height: 140 }}>
              <div className="skeleton" style={{ height: 15, width: '45%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '65%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canonicalUrl = `${siteUrl}/company/${slug}`;
  const metaDescription = `${data.name} has ${data.openJobs} open remote position${data.openJobs === 1 ? '' : 's'}. Explore roles across ${(data.categories || []).slice(0, 3).map(c => c.label).join(', ') || 'multiple teams'} and apply directly.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: canonicalUrl,
    ...(data.logo ? { logo: data.logo } : {}),
    ...(data.jobs?.length ? {
      makesOffer: data.jobs.slice(0, 20).map(job => ({
        '@type': 'JobPosting',
        title: job.title,
        hiringOrganization: { '@type': 'Organization', name: data.name },
        datePosted: job.posted,
        employmentType: job.type,
        jobLocationType: 'TELECOMMUTE',
        applicantLocationRequirements: { '@type': 'Country', name: job.location || 'Worldwide' },
        url: job.applyUrl,
      })),
    } : {}),
  };

  return (
    <div className="page">
      <Helmet>
        <title>{`${data.name} Remote Jobs — ${data.openJobs} Open Positions | RemoteAI`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${data.name} Remote Jobs | RemoteAI`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {data.logo && <meta property="og:image" content={data.logo} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Breadcrumbs
        siteUrl={siteUrl}
        items={[
          { label: 'Home', href: '/' },
          { label: 'Jobs', href: '/jobs' },
          { label: 'Companies', href: '/company' },
          { label: data.name },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white',
          background: data.logoColor || 'var(--accent)', flexShrink: 0,
        }}>
          {data.logo && /^https?:\/\//.test(data.logo)
            ? <img src={data.logo} alt={`${data.name} logo`} style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
            : (data.logo || data.name.slice(0, 2).toUpperCase())}
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>{data.name} Remote Jobs</h1>
          <p className="page-sub">{data.openJobs} open remote position{data.openJobs === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Company facts strip */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', padding: '14px 18px', marginBottom: 24,
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
      }}>
        <div><strong>{data.totalJobs}</strong> <span style={{ color: 'var(--text3)' }}>total jobs tracked</span></div>
        {data.jobTypes?.length > 0 && (
          <div><span style={{ color: 'var(--text3)' }}>Job types:</span> {data.jobTypes.join(', ')}</div>
        )}
        {data.locations?.length > 0 && (
          <div><span style={{ color: 'var(--text3)' }}>Locations:</span> {data.locations.slice(0, 3).join(', ')}{data.locations.length > 3 ? '…' : ''}</div>
        )}
      </div>

      {data.categories?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 10 }}>Categories</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.categories.map(c => (
              <Link
                key={c.slug}
                to={`/jobs/category/${c.slug}`}
                style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 13,
                  background: 'var(--bg2)', color: 'var(--text2)',
                  border: '1px solid var(--border)', textDecoration: 'none',
                }}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.skills?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h4 style={{ marginBottom: 10 }}>Skills They're Hiring For</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.skills.map(s => (
              <span key={s} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                background: 'rgba(99,102,241,0.08)', color: 'var(--accent)',
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <h4 style={{ marginBottom: 12 }}>Open Positions</h4>
      <div className="jobs-list">
        {(data.jobs || []).map(job => (
          <JobCard key={job._id || job.id} job={job} onClick={setSelected} />
        ))}
      </div>

      {data.relatedCompanies?.length > 0 && (
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <h4 style={{ marginBottom: 12 }}>Related Companies</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.relatedCompanies.map(c => (
              <Link
                key={c.slug}
                to={`/company/${c.slug}`}
                style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 13,
                  background: 'var(--bg2)', color: 'var(--text2)',
                  border: '1px solid var(--border)', textDecoration: 'none',
                }}
              >
                {c.name} ({c.jobCount})
              </Link>
            ))}
          </div>
        </div>
      )}

      {selectedJob && <JobModal job={selectedJob} onClose={() => setSelected(null)} />}
    </div>
  );
}
