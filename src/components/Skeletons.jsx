// ══════════════════════════════════════════════
//  Loading Skeletons
//  Usage: <SkeletonJobCard /> | <SkeletonProfileWidget />
// ══════════════════════════════════════════════

const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -600px 0 }
    100% { background-position: 600px 0 }
  }
`;

// Inject once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = shimmer + `
    .skel {
      background: linear-gradient(90deg, #1e2030 25%, #262840 50%, #1e2030 75%);
      background-size: 600px 100%;
      animation: shimmer 1.6s infinite linear;
      border-radius: 6px;
    }
  `;
  document.head.appendChild(style);
}

function Skel({ w = '100%', h = 14, r = 6, style = {} }) {
  return (
    <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
  );
}

export function SkeletonJobCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skel w={48} h={48} r={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skel w="60%" h={16} />
          <Skel w="40%" h={12} />
        </div>
        <Skel w={60} h={24} r={20} />
      </div>
      <Skel h={14} />
      <Skel w="80%" h={14} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skel w={64} h={24} r={20} />
        <Skel w={80} h={24} r={20} />
        <Skel w={72} h={24} r={20} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skel w="35%" h={16} />
        <Skel w={100} h={36} r={8} />
      </div>
    </div>
  );
}

export function SkeletonProfileWidget({ height = 180 }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height,
    }}>
      <Skel w="40%" h={18} />
      <Skel h={12} />
      <Skel w="90%" h={12} />
      <Skel w="70%" h={12} />
      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
        <Skel w={72} h={28} r={20} />
        <Skel w={60} h={28} r={20} />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Skel w={36} h={36} r={8} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skel w={`${60 + (i * 7) % 30}%`} h={14} />
            <Skel w="40%" h={11} />
          </div>
          <Skel w={70} h={28} r={6} />
        </div>
      ))}
    </div>
  );
}
