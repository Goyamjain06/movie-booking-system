import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, tokenStore } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!tokenStore.get());
  const [modal, setModal] = useState({ open: false, mode: "login", reason: "" });
  const afterAuth = useRef(null);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then((r) => setUser(r.user)).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => { tokenStore.set(null); setUser(null); };
    window.addEventListener("cineverse:unauthorized", onUnauthorized);
    return () => window.removeEventListener("cineverse:unauthorized", onUnauthorized);
  }, []);

  const finish = useCallback((r) => {
    tokenStore.set(r.token);
    setUser(r.user);
    setModal((m) => ({ ...m, open: false }));
    const cb = afterAuth.current;
    afterAuth.current = null;
    if (cb) setTimeout(cb, 150);
    return r.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      modal,
      login: async (body) => finish(await api.login(body)),
      register: async (body) => finish(await api.register(body)),
      logout: () => { tokenStore.set(null); setUser(null); },
      /** Opens the sign-in dialog. `then` runs after a successful sign-in (e.g. continue booking). */
      requireLogin: (then, reason = "") => {
        if (user) { then?.(); return true; }
        afterAuth.current = then || null;
        setModal({ open: true, mode: "login", reason });
        return false;
      },
      openAuth: (mode = "login") => setModal({ open: true, mode, reason: "" }),
      closeAuth: () => { afterAuth.current = null; setModal((m) => ({ ...m, open: false })); },
      setMode: (mode) => setModal((m) => ({ ...m, mode })),
    }),
    [user, ready, modal, finish]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
