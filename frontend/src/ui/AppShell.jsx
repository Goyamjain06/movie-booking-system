import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const steps = [
    { path: "/", label: "Movies" },
    { path: "/shows", label: "Showtimes" },
    { path: "/seats", label: "Seats" },
    { path: "/booking", label: "Review" },
    { path: "/payment", label: "Payment" },
  ];

  const activeIdx = steps.findIndex((s) =>
    s.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(s.path)
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]" />

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="group inline-flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30">
              <span className="text-sm">🎬</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-100">
              District
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline">Movies</span>
          </Link>

          {/* Step breadcrumb — desktop */}
          <nav className="hidden items-center gap-1 sm:flex">
            {steps.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <div key={s.path} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-zinc-700">›</span>
                  )}
                  <span
                    className={`text-xs font-medium transition ${
                      active
                        ? "text-indigo-300"
                        : done
                        ? "text-zinc-400"
                        : "text-zinc-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </nav>

          {/* Mobile: current step */}
          <div className="flex items-center gap-2 sm:hidden">
            <span className="text-xs text-zinc-400">
              {activeIdx >= 0 ? steps[activeIdx].label : ""}
            </span>
            {location.pathname !== "/" && (
              <button
                onClick={() => navigate(-1)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-300"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

