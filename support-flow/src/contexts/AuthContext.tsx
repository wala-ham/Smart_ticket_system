import React, { createContext, useContext, useEffect, useState } from 'react';

export type User = any;

export type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  // login now returns the user object on success or null on failure
  login: (email: string, password: string) => Promise<User | null>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const API_BASE = 'http://localhost:5000';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));

  useEffect(() => {
    if (token) {
      // load profile on start if token exists
      (async () => {
        await fetchProfile(token);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToken = (t: string | null) => {
    setToken(t);
    if (t) localStorage.setItem('auth_token', t);
    else localStorage.removeItem('auth_token');
  };

  const fetchProfile = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const json = await res.json();
      // adjust according to your API shape
      setUser(json.data?.user ?? json.user ?? null);
    } catch (err) {
      console.warn('Profile load failed', err);
      saveToken(null);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const payload = { email, password };
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.success === true && json?.data?.token) {
        const t = json.data.token;
        saveToken(t);
        const u = json.data.user ?? null;
        setUser(u);
        return u;
      }
      return null;
    } catch (err) {
      console.error('Login error', err);
      return null;
    }
  };

  const register = async (fullName: string, email: string, password: string, phone?: string): Promise<boolean> => {
    try {
      const body: any = { email, password, full_name: fullName };
      if (phone) body.phone = phone;
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json?.data?.token) {
        const t = json.data.token;
        saveToken(t);
        setUser(json.data.user ?? null);
        return true;
      }
      // fallback: try login and convert to boolean
      const u = await login(email, password);
      return !!u;
    } catch (err) {
      console.error('Register error', err);
      return false;
    }
  };

  const logout = () => {
    saveToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!token) return;
    await fetchProfile(token);
  };

  // ✅ Calculate isAuthenticated based on token & user
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
