// ══════════════════════════════════════════════
//  Toast Notification System
//  Usage: import { useToast } from './Toast'
//         const toast = useToast()
//         toast.success('Applied successfully!')
// ══════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const COLORS = {
  success: { bg: '#052e16', border: '#16a34a', icon: '#4ade80', text: '#bbf7d0' },
  error:   { bg: '#2d0a0a', border: '#dc2626', icon: '#f87171', text: '#fecaca' },
  info:    { bg: '#0c1445', border: '#6366f1', icon: '#818cf8', text: '#c7d2fe' },
  warning: { bg: '#2a1800', border: '#d97706', icon: '#fbbf24', text: '#fde68a' },
};

function ToastItem({ id, type = 'info', message, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const c = COLORS[type] || COLORS.info;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(id), 300);
  }, [id, onRemove]);

  useEffect(() => {
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  }, [dismiss]);

  return (
    <div
      onClick={dismiss}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '13px 16px',
        borderRadius: '10px',
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        minWidth: '260px',
        maxWidth: '380px',
        backdropFilter: 'blur(12px)',
        transform: exiting ? 'translateX(120%)' : 'translateX(0)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s ease',
        userSelect: 'none',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <span style={{ color: c.icon, opacity: 0.6, fontSize: '18px', marginLeft: '4px' }}>×</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error', msg),
    info:    (msg) => add('info', msg),
    warning: (msg) => add('warning', msg),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
