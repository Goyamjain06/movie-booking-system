import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";
import { useAuth } from "../state/auth";
import { LogoMark } from "./Logo";

export const DEMO = { email: "aarav.mehta@example.com", password: "cine1234" };

export function AuthModal() {
  const { modal, closeAuth, setMode, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isLogin = modal.mode === "login";

  useEffect(() => { setError(""); }, [modal.mode, modal.open]);
  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e) => e.key === "Escape" && closeAuth();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [modal.open, closeAuth]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e, override) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (override || isLogin) await login(override || { email: form.email, password: form.password });
      else await register(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {modal.open && (
        <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
          <motion.div role="dialog" aria-modal="true" aria-label={isLogin ? "Sign in" : "Create account"} className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-ink-800 p-6 shadow-glow sm:rounded-3xl" initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand-violet/25 blur-3xl" />
            <button onClick={closeAuth} className="focus-ring absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Close">✕</button>
            <div className="relative">
              <LogoMark size={40} />
              <h2 className="mt-4 font-display text-2xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h2>
              <p className="mt-1 text-sm text-zinc-400">{modal.reason || (isLogin ? "Sign in to book seats and see your tickets." : "It takes ten seconds.")}</p>

              <form onSubmit={submit} className="mt-5 space-y-3">
                {!isLogin && <input className="input" placeholder="Full name" autoComplete="name" value={form.name} onChange={set("name")} required autoFocus />}
                <input className="input" type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set("email")} required autoFocus={isLogin} />
                <div className="relative">
                  <input className="input pr-16" type={showPw ? "text" : "password"} placeholder="Password" autoComplete={isLogin ? "current-password" : "new-password"} value={form.password} onChange={set("password")} required minLength={6} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-200">{showPw ? "Hide" : "Show"}</button>
                </div>
                <AnimatePresence>
                  {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">{error}</motion.div>}
                </AnimatePresence>
                <Button type="submit" loading={busy} className="w-full" size="lg">{isLogin ? "Sign in" : "Create account"}</Button>
              </form>

              {isLogin && (
                <button type="button" disabled={busy} onClick={() => submit(null, DEMO)} className="mt-3 w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-zinc-300 transition hover:border-brand-violet/50 hover:bg-brand-violet/10">
                  ⚡ Continue with demo account
                </button>
              )}
              <p className="mt-5 text-center text-sm text-zinc-400">
                {isLogin ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(isLogin ? "register" : "login")} className="font-semibold text-violet-300 hover:underline">{isLogin ? "Create an account" : "Sign in"}</button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
