import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, resumeAPI, getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

// Resume cache key — prefers the user's DB id (stable across sessions),
// falls back to email if id isn't present for some reason.
const resumeKey = (u) => u && `remoteai_resume_${u.id || u._id || u.email}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // check token on boot

  // On app load: if token exists, fetch current user (and their saved
  // resume, if any) from the backend. Falls back to the localStorage
  // cache when the backend has no resume saved yet (e.g. older deploy).
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(u => {
        let resume = u.resume;
        if (!resume) {
          try {
            const cached = localStorage.getItem(resumeKey(u));
            if (cached) resume = JSON.parse(cached);
          } catch { /* ignore */ }
        }
        setUser({ ...u, resume, avatar: u.name[0].toUpperCase() });
      })
      .catch(() => clearToken()) // token expired or invalid
      .finally(() => setLoading(false));
  }, []);

  const signup = async (name, email, password, skills) => {
    const data = await authAPI.signup(name, email, password, skills);
    setToken(data.token);
    setUser({ ...data.user, avatar: data.user.name[0].toUpperCase() });
    return { success: true };
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setToken(data.token);
    setUser({ ...data.user, avatar: data.user.name[0].toUpperCase() });
    return { success: true };
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateSkills = async (skills) => {
    const updated = await authAPI.updateSkills(skills);
    setUser(prev => ({ ...prev, skills: updated.skills }));
  };

  // Saves resume builder data onto the user's profile.
  // Always persists locally so the feature works even if the backend
  // hasn't been redeployed with the `/api/resume` route yet.
  const updateResume = async (resume) => {
    setUser(prev => (prev ? { ...prev, resume } : prev));
    try {
      if (user) localStorage.setItem(resumeKey(user), JSON.stringify(resume));
    } catch { /* storage unavailable — ignore */ }
    await resumeAPI.save(resume); // let the caller (Save button) know if this fails
  };

  // Re-fetches the saved resume from the backend, falling back to the
  // localStorage cache. Used by the Resume Builder on mount so it always
  // shows the latest saved version, even if it changed in another tab.
  const loadResume = async () => {
    if (!user) return null;
    let resume = null;
    try {
      resume = await resumeAPI.get();
    } catch { /* backend unavailable — fall back to cache below */ }
    if (!resume) {
      try {
        const cached = localStorage.getItem(resumeKey(user));
        if (cached) resume = JSON.parse(cached);
      } catch { /* ignore */ }
    }
    if (resume) setUser(prev => (prev ? { ...prev, resume } : prev));
    return resume;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateSkills, updateResume, loadResume }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
