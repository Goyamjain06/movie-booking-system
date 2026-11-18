import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Poster } from "./Poster";
import { Badge, Button } from "./ui";
import { artFor, duration } from "../lib/format";
import { useChat } from "../state/chat";
import { BRAND } from "../config";

const SLIDE_MS = 6500;

export function Hero({ movies }) {
  const reduce = useReducedMotion();
  const { openChat } = useChat();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = movies.length;

  useEffect(() => {
    if (paused || reduce || n < 2) return;
    const id = setTimeout(() => setI((x) => (x + 1) % n), SLIDE_MS);
    return () => clearTimeout(id);
  }, [i, paused, reduce, n]);

  if (!n) return null;
  const m = movies[i];
  const art = artFor(m.title);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-glow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Featured movies">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={m.movie_id} className="relative grid min-h-[30rem] items-center gap-8 p-6 sm:p-10 md:grid-cols-[1.25fr_1fr] lg:min-h-[34rem] lg:p-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
          {/* blurred, colour-matched backdrop */}
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${art.angle}deg, ${art.a}55, ${art.b}33 60%, #07070d)` }} />
          <div className="absolute inset-0 overflow-hidden opacity-40 blur-3xl"><Poster movie={m} compact className="h-full w-full scale-125" /></div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />

          <div className="relative z-10">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-200 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Now showing · {BRAND.city}
              </span>
              <Badge tone="warn">★ {Number(m.rating).toFixed(1)}</Badge>
              {m.certificate && <Badge>{m.certificate}</Badge>}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }} className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {m.title}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="mt-3 text-sm text-zinc-300">
              {[m.genre, m.language, duration(m.duration), m.release_year].filter(Boolean).join("  ·  ")}
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {m.synopsis}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-7 flex flex-wrap gap-3">
              <Link to={`/movies/${m.movie_id}`}><Button size="lg">🎟️ Book tickets</Button></Link>
              <Button size="lg" variant="ghost" onClick={() => openChat(`Tell me about ${m.title}`)}><span className="gradient-text">✦</span> Ask {BRAND.bot}</Button>
            </motion.div>
          </div>

          <motion.div className="relative z-10 hidden justify-self-center md:block" initial={{ opacity: 0, x: 60, rotate: 6 }} animate={{ opacity: 1, x: 0, rotate: 3 }} transition={{ delay: 0.2, type: "spring", stiffness: 90, damping: 16 }}>
            <div className="animate-float">
              <div className="absolute -inset-6 rounded-[2rem] opacity-60 blur-3xl" style={{ background: `linear-gradient(${art.angle}deg, ${art.a}, ${art.b})` }} />
              <Poster movie={m} className="relative aspect-[2/3] w-[17rem] rounded-3xl border border-white/20 shadow-2xl lg:w-[19rem]" />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 p-5 sm:px-10">
        <div className="flex flex-1 gap-2" role="tablist" aria-label="Choose slide">
          {movies.map((mv, idx) => (
            <button key={mv.movie_id} role="tab" aria-selected={idx === i} aria-label={mv.title} onClick={() => setI(idx)} className="focus-ring group h-6 max-w-[5rem] flex-1">
              <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/20 transition-all group-hover:h-[5px]">
                {idx === i && (
                  <motion.span key={`${i}-${paused}`} className="absolute inset-y-0 left-0 bg-white" initial={{ width: reduce ? "100%" : 0 }} animate={{ width: "100%" }} transition={{ duration: paused || reduce ? 0 : SLIDE_MS / 1000, ease: "linear" }} />
                )}
                {idx < i && <span className="absolute inset-0 bg-white/60" />}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => setI((i - 1 + n) % n)} className="focus-ring h-9 w-9 rounded-full border border-white/15 bg-black/30 backdrop-blur hover:bg-white/10" aria-label="Previous movie">‹</button>
          <button onClick={() => setI((i + 1) % n)} className="focus-ring h-9 w-9 rounded-full border border-white/15 bg-black/30 backdrop-blur hover:bg-white/10" aria-label="Next movie">›</button>
        </div>
      </div>
    </section>
  );
}
