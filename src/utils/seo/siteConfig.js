// ══════════════════════════════════════════════
//  RemoteAI — SEO Site Config
//  Single source of truth for site-wide SEO values.
//  Update SITE_URL once here (and in scripts/generate-sitemap.js's
//  fallback) if the production domain ever changes.
// ══════════════════════════════════════════════

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://remoteai-platform.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'RemoteAI';

export const DEFAULT_TITLE = 'RemoteAI - AI Powered Remote Jobs Platform | Find Remote Work Instantly';

export const DEFAULT_DESCRIPTION =
  'RemoteAI helps you find remote jobs using AI skill matching, CV analysis, and smart career recommendations. Apply to global remote jobs instantly.';

export const DEFAULT_KEYWORDS =
  'remote jobs, work from home jobs, AI jobs, freelancing jobs, career AI, job matching, CV analysis, remoteAI platform';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/preview.png`;

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: DEFAULT_DESCRIPTION,
  email: 'jobs@remoteai.app',
  sameAs: [
    // Add real social profile URLs here when available, e.g.
    // 'https://twitter.com/remoteai',
    // 'https://www.linkedin.com/company/remoteai',
  ],
};
