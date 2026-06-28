import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // check token on boot

  // On app load: if token exists, fetch current user from backend
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(u => setUser({ ...u, avatar: u.name[0].toUpperCase() }))
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

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateSkills }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
