import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui";
import { useAuth } from "../state/auth";
import { useChat } from "../state/chat";
import { BRAND } from "../config";

const FLOW = [
  { match: /^\/shows\/\d+\/seats/, label: "Select seats", pct: 33 },
  { match: /^\/checkout\//, label: "Payment", pct: 66 },
  { match: /^\/ticket\//, label: "Ticket", pct: 100 },
];

function UserMenu() {
  const { user, logout, openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) {
    return <Button size="sm" onClick={() => openAuth("login")}>Sign in</Button>;
  }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="focus-ring flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-1 pr-3 text-sm hover:bg-white/10" aria-haspopup="menu" aria-expanded={open}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-violet text-xs font-bold">{user.name?.[0]?.toUpperCase()}</span>
        <span className="hidden max-w-[110px] truncate sm:inline">{user.name?.split(" ")[0]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-800/95 p-1.5 shadow-glow backdrop-blur-xl" role="menu">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <button role="menuitem" onClick={() => { setOpen(false); navigate("/bookings"); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">🎟️ My bookings</button>
            <button role="menuitem" onClick={() => { setOpen(false); logout(); navigate("/"); }} className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/10">Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { openChat } = useChat();
  const flow = FLOW.find((f) => f.match.test(pathname));

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const link = ({ isActive }) => `rounded-full px-3 py-1.5 text-[13px] font-medium transition sm:px-3.5 sm:text-sm ${isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-violet/15 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand-rose/10 blur-[120px]" />
      </div>

      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black">Skip to content</a>

      <header className={`no-print sticky top-0 z-40 transition-all duration-300 ${scrolled ? "border-b border-white/[0.08] bg-ink-950/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <Link to="/" className="focus-ring rounded-lg"><Logo /></Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={link}>Movies</NavLink>
            <NavLink to="/bookings" className={link}><span className="sm:hidden">Tickets</span><span className="hidden sm:inline">My bookings</span></NavLink>
            <button onClick={() => openChat()} className="focus-ring hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white sm:inline-flex">
              <span className="gradient-text">✦</span> Ask {BRAND.bot}
            </button>
          </nav>
          <div className="flex items-center gap-2"><span className="hidden text-xs text-zinc-500 md:inline">📍 {BRAND.city}</span><UserMenu /></div>
        </div>
        {flow && (
          <div className="relative h-[3px] bg-white/5" role="progressbar" aria-label={flow.label} aria-valuenow={flow.pct}>
            <motion.div className="h-full bg-gradient-to-r from-brand-rose to-brand-violet" initial={{ width: 0 }} animate={{ width: `${flow.pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        {children}
      </main>

      <footer className="no-print border-t border-white/[0.06] py-10 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4">
          <Logo />
          <p className="mt-3">A demo booking platform. Payments are simulated, no real money is charged.</p>
          <p className="mt-1">Built with React, Express and MySQL · AI assistant powered by Claude</p>
        </div>
      </footer>
    </div>
  );
}
