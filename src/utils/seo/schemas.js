// ══════════════════════════════════════════════
//  RemoteAI — JSON-LD Schema Builders
//  Pure functions — no React, no side effects.
//  Each returns a plain object ready to JSON.stringify
//  into a <script type="application/ld+json"> tag.
// ══════════════════════════════════════════════

import { SITE_URL, SITE_NAME, ORGANIZATION } from './siteConfig';

// ── Organization ───────────────────────────────
export function buildOrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    logo: ORGANIZATION.logo,
    description: ORGANIZATION.description,
  };
  if (ORGANIZATION.email) schema.email = ORGANIZATION.email;
  if (ORGANIZATION.sameAs?.length) schema.sameAs = ORGANIZATION.sameAs;
  return schema;
}

// ── Website (+ SearchAction) ───────────────────
export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/jobs?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ── Breadcrumbs ─────────────────────────────────
// items: [{ name: 'Home', path: '/' }, { name: 'Jobs', path: '/jobs' }, ...]
export function buildBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// ── JobPosting ──────────────────────────────────
// Builds a schema.org/JobPosting from a Job document returned by
// GET /api/jobs/:id. Omits any field that isn't available rather than
// inventing placeholder data — per Google's guidelines, invalid/fake
// values are worse than a missing optional property.
export function buildJobPostingSchema(job) {
  if (!job) return null;

  const jobId = job._id || job.id;
  const postedDate = job.posted ? new Date(job.posted) : null;

  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: stripToPlainSentence(job.description) || job.title,
    identifier: {
      '@type': 'PropertyValue',
      name: SITE_NAME,
      value: String(jobId),
    },
    url: `${SITE_URL}/jobs/${jobId}`,
  };

  if (postedDate && !isNaN(postedDate)) {
    schema.datePosted = postedDate.toISOString().split('T')[0];
    // Google requires validThrough for postings not auto-expired;
    // default to 60 days after posting when the source has no expiry.
    if (!job.validThrough) {
      const validThrough = new Date(postedDate);
      validThrough.setDate(validThrough.getDate() + 60);
      schema.validThrough = validThrough.toISOString().split('T')[0];
    }
  }
  if (job.validThrough) {
    schema.validThrough = new Date(job.validThrough).toISOString().split('T')[0];
  }

  if (job.type) {
    schema.employmentType = mapEmploymentType(job.type);
  }

  if (job.company) {
    schema.hiringOrganization = {
      '@type': 'Organization',
      name: job.company,
    };
    if (job.applyUrl) {
      try {
        schema.hiringOrganization.sameAs = new URL(job.applyUrl).origin;
      } catch {
        /* ignore malformed applyUrl */
      }
    }
    if (job.logo && /^https?:\/\//.test(job.logo)) {
      schema.hiringOrganization.logo = job.logo;
    }
  }

  if (job.remote) {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: job.location && job.location !== 'Worldwide' ? job.location : 'Worldwide',
    };
  }

  if (job.location && job.location !== 'Worldwide' && !job.remote) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
      },
    };
  }

  const salaryInfo = parseSalary(job.salary);
  if (salaryInfo) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: salaryInfo.currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(salaryInfo.minValue && salaryInfo.maxValue
          ? { minValue: salaryInfo.minValue, maxValue: salaryInfo.maxValue }
          : { value: salaryInfo.minValue || salaryInfo.maxValue }),
        unitText: salaryInfo.unitText,
      },
    };
  }

  if (job.applyUrl) {
    schema.directApply = true;
  }

  return schema;
}

// ── Helpers ─────────────────────────────────────

function stripToPlainSentence(text) {
  if (!text) return '';
  // JobPosting description supports HTML, but keep it simple/plain
  // to avoid re-injecting the raw text with unescaped markup.
  return text.trim();
}

function mapEmploymentType(type) {
  const map = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    contract: 'CONTRACTOR',
    freelance: 'CONTRACTOR',
  };
  return map[type] || undefined;
}

// Best-effort parse of free-text salary strings like "$60k - $90k/year"
// or "$40/hr". Returns null when it can't confidently parse a number —
// Google would rather see no baseSalary than an incorrect one.
function parseSalary(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const currencyMatch = raw.match(/[$€£₹]/);
  const currency = { '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR' }[currencyMatch?.[0]] || 'USD';

  const numbers = raw
    .replace(/,/g, '')
    .match(/(\d+(?:\.\d+)?)(k)?/gi);
  if (!numbers || numbers.length === 0) return null;

  const values = numbers.map(n => {
    const isK = /k$/i.test(n);
    const num = parseFloat(n);
    return isK ? num * 1000 : num;
  }).filter(n => !isNaN(n) && n > 0);

  if (values.length === 0) return null;

  let unitText = 'YEAR';
  if (/\/\s*hr|hour/i.test(raw)) unitText = 'HOUR';
  else if (/\/\s*mo|month/i.test(raw)) unitText = 'MONTH';
  else if (/\/\s*day/i.test(raw)) unitText = 'DAY';

  if (values.length >= 2) {
    return { currency, minValue: Math.min(values[0], values[1]), maxValue: Math.max(values[0], values[1]), unitText };
  }
  return { currency, minValue: values[0], maxValue: null, unitText };
}
