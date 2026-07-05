// ══════════════════════════════════════════════
//  RemoteAI — Resume Builder AI Assist
//  Lightweight, rule-based "AI" text generation —
//  same pattern as utils/matching.js (no network
//  call required, so it never blocks the builder).
// ══════════════════════════════════════════════

const FRAMEWORKS = ['react', 'vue', 'angular', 'next.js', 'nuxt', 'django', 'flask', 'express', 'spring', 'laravel', '.net'];
const DATABASES  = ['mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'firebase', 'dynamodb'];
const CLOUD      = ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd'];

function detect(list, text) {
  const t = text.toLowerCase();
  return list.filter(k => t.includes(k));
}

// ── Professional Summary ──────────────────────
// Input:  "Backend developer with Python"
// Output: "Backend developer experienced in building REST APIs using
//          Python and modern backend technologies, ..."
export function generateSummary({ rawInput = '', role = '', skills = [], yearsExperience = '' } = {}) {
  const text = rawInput.trim();
  if (!text && skills.length === 0) return '';

  const skillList = skills.length ? skills : detect([...FRAMEWORKS, ...DATABASES, ...CLOUD], text);
  const topSkills = (skillList.length ? skillList : ['modern web technologies']).slice(0, 4);
  const inferredRole = role || (text.match(/([A-Za-z\s]+?)(developer|engineer|designer|analyst|manager)/i)?.[0] || 'Software Developer').trim();
  const exp = yearsExperience ? `${yearsExperience} of experience` : 'hands-on experience';

  const cloud = detect(CLOUD, text.concat(' ', skillList.join(' ')));
  const cloudPhrase = cloud.length ? `, with working knowledge of ${cloud.slice(0, 2).join(' and ')}` : '';

  const base = text || `${inferredRole} focused on building reliable, scalable software.`;

  return `${capitalize(inferredRole)} with ${exp} building production-grade applications using ${joinList(topSkills)}${cloudPhrase}. ` +
    `${sentenceFromRaw(base, inferredRole)} Passionate about writing clean, maintainable code and collaborating effectively in remote, cross-functional teams.`;
}

function sentenceFromRaw(base, role) {
  const lower = base.toLowerCase();
  if (lower.startsWith(role.toLowerCase())) return '';
  return capitalize(base.replace(/\.$/, '')) + '.';
}

function joinList(arr) {
  const clean = arr.map(s => s.trim()).filter(Boolean);
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Bullet Point Improver ─────────────────────
// Rewrites a plain responsibility line into a stronger,
// action-verb-led, metric-aware resume bullet.
const ACTION_VERBS = [
  'Built', 'Designed', 'Developed', 'Implemented', 'Led', 'Optimized',
  'Automated', 'Architected', 'Delivered', 'Improved', 'Maintained', 'Launched',
];

const WEAK_STARTS = ['responsible for', 'worked on', 'helped with', 'was in charge of', 'did', 'in charge of', 'tasked with'];

export function improveBullet(raw) {
  let text = (raw || '').trim();
  if (!text) return '';

  let lower = text.toLowerCase();
  const weakStart = WEAK_STARTS.find(w => lower.startsWith(w));
  if (weakStart) text = text.slice(weakStart.length).trim();

  // Already starts with a strong verb? leave it.
  const firstWord = text.split(' ')[0]?.replace(/[.,]/g, '');
  const alreadyStrong = ACTION_VERBS.some(v => v.toLowerCase() === firstWord?.toLowerCase());

  if (!alreadyStrong) {
    const verb = pickVerb(text);
    text = `${verb} ${lowerFirst(text)}`;
  } else {
    text = capitalize(text);
  }

  text = text.replace(/\.?$/, '');
  if (!/\d/.test(text)) {
    text += ', improving performance and reliability';
  }
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

function pickVerb(text) {
  const t = text.toLowerCase();
  if (t.includes('test') || t.includes('bug') || t.includes('fix')) return 'Resolved';
  if (t.includes('team') || t.includes('mentor') || t.includes('manage')) return 'Led';
  if (t.includes('design') || t.includes('ui') || t.includes('ux')) return 'Designed';
  if (t.includes('deploy') || t.includes('ci') || t.includes('pipeline')) return 'Automated';
  if (t.includes('api') || t.includes('backend') || t.includes('build')) return 'Built';
  return ACTION_VERBS[Math.floor(Math.random() * ACTION_VERBS.length)];
}

function lowerFirst(s) {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
