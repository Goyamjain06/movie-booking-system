import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRAND } from "../config";

const KEY = "cineverse_splash_seen";

/** Cinematic intro: aperture opens, logo letters rise, light beam sweeps, curtains part. Plays once per session. */
export function Splash() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem(KEY); } catch { return false; }
  });
  const [phase, setPhase] = useState(0); // 0 intro, 1 curtains opening

  useEffect(() => {
    if (!show) return;
    if (reduce) { setShow(false); return; }
    const t1 = setTimeout(() => setPhase(1), 2300);
    const t2 = setTimeout(() => { setShow(false); try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ } }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show, reduce]);

  const skip = () => { setPhase(1); setTimeout(() => { setShow(false); try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ } }, 500); };
  const letters = BRAND.name.toUpperCase().split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[200] overflow-hidden"
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          onClick={skip}
          role="presentation"
        >
          {/* curtains */}
          <motion.div className="absolute inset-y-0 left-0 w-1/2 bg-ink-950" animate={{ x: phase ? "-100%" : 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} />
          <motion.div className="absolute inset-y-0 right-0 w-1/2 bg-ink-950" animate={{ x: phase ? "100%" : 0 }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(124,92,255,0.22),transparent)]" />

          <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-6" animate={{ opacity: phase ? 0 : 1, scale: phase ? 1.15 : 1 }} transition={{ duration: 0.5 }}>
            {/* aperture / reel mark */}
            <motion.svg width="120" height="120" viewBox="0 0 64 64" initial={{ scale: 0.2, rotate: -180, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3d6e" /><stop offset="1" stopColor="#7c5cff" /></linearGradient>
              </defs>
              <motion.circle cx="32" cy="32" r="26" fill="none" stroke="url(#sg)" strokeWidth="3.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
              {[0, 72, 144, 216, 288].map((a) => (
                <motion.circle key={a} cx={32 + 14 * Math.cos((a * Math.PI) / 180)} cy={32 + 14 * Math.sin((a * Math.PI) / 180)} r="4" fill="none" stroke="url(#sg)" strokeWidth="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + a / 900 }} />
              ))}
              <motion.path d="M28 24l14 8-14 8z" fill="url(#sg)" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ originX: "35px", originY: "32px" }} transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 14 }} />
            </motion.svg>

            <div className="relative overflow-hidden">
              <div className="flex font-display text-4xl font-extrabold tracking-[0.3em] sm:text-6xl">
                {letters.map((l, i) => (
                  <motion.span key={i} className="gradient-text" initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    {l}
                  </motion.span>
                ))}
              </div>
              <div className="absolute inset-y-0 left-0 w-1/4 animate-beam bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            <motion.p className="text-xs uppercase tracking-[0.5em] text-zinc-400 sm:text-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}>
              {BRAND.tagline}
            </motion.p>
          </motion.div>

          <motion.div className="absolute bottom-8 left-0 right-0 text-center text-[11px] text-zinc-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            tap to skip
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
