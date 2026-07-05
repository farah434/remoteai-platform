// ══════════════════════════════════════════════
//  RemoteAI — Reusable SEO Component
//  Drop <SEO ... /> near the top of any page. Handles:
//  title, description, keywords, canonical, robots/noIndex,
//  Open Graph, Twitter Card, and arbitrary JSON-LD blocks.
//  Route (canonical URL) is auto-detected via useLocation
//  unless a `canonical` override is passed.
// ══════════════════════════════════════════════

import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
} from '../utils/seo/siteConfig';

/**
 * @param {Object} props
 * @param {string} [props.title] - Page title. Rendered as "{title} | RemoteAI" unless rawTitle is true.
 * @param {boolean} [props.rawTitle] - If true, render title exactly as given (no " | RemoteAI" suffix).
 * @param {string} [props.description]
 * @param {string} [props.keywords]
 * @param {string} [props.canonical] - Absolute or root-relative URL override. Defaults to current route.
 * @param {string} [props.image] - Absolute OG/Twitter image URL.
 * @param {string} [props.type] - og:type, e.g. 'website', 'article'. Defaults to 'website'.
 * @param {boolean} [props.noIndex] - If true, emits robots "noindex, nofollow".
 * @param {Object|Object[]} [props.jsonLd] - One schema object or an array of them to embed as JSON-LD.
 */
export default function SEO({
  title,
  rawTitle = false,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noIndex = false,
  jsonLd,
}) {
  const location = useLocation();

  const resolvedCanonical = canonical
    ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`)
    : `${SITE_URL}${location.pathname}`;

  const resolvedTitle = title
    ? (rawTitle ? title : `${title} | ${SITE_NAME}`)
    : DEFAULT_TITLE;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      {/* Primary */}
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={resolvedCanonical} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
