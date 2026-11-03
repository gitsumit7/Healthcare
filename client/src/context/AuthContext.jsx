import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, TOKEN_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const applySession = useCallback(({ token, user: u, doctor: d }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    setDoctor(d || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setDoctor(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi
      .me()
      .then(applySession)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [applySession, logout]);

  const value = useMemo(
    () => ({
      user,
      doctor,
      loading,
      setUser,
      setDoctor,
      login: async (credentials) => applySession(await authApi.login(credentials)),
      register: async (data) => applySession(await authApi.register(data)),
      googleLogin: async (credential) => {
        const data = await authApi.google(credential);
        applySession(data);
        return data;
      },
      resetPassword: async (token, password) => applySession(await authApi.resetPassword(token, password)),
      // Used after a password change, which invalidates the previous token.
      replaceToken: (token) => localStorage.setItem(TOKEN_KEY, token),
      logout,
    }),
    [user, doctor, loading, applySession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
