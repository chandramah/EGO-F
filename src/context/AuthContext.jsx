// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import AuthService from "../services/AuthService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return AuthService.getAuthToken(); } catch { return null; }
  });
  const [user, setUser] = useState(() => {
    try { return AuthService.getStoredUser(); } catch { return null; }
  });

  const login = useCallback(async (username, password) => {
    const payload = await AuthService.login({ username, password });
    const tokenFromPayload = payload?.token || payload?.data?.token;
    if (tokenFromPayload) {
      setToken(tokenFromPayload);
      // Prefer server/user from storage populated by AuthService
      const stored = AuthService.getStoredUser();
      const possible = payload?.user || payload?.data?.user || payload;
      const nextUser = stored || (typeof possible === "object" ? possible : { username });
      setUser(nextUser || null);
    }
    return payload;
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setToken(null);
    setUser(null);
  }, []);

  // Sync user from storage in case of reloads or external updates
  React.useEffect(() => {
    try {
      const stored = AuthService.getStoredUser();
      if (stored && !user) setUser(stored);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
