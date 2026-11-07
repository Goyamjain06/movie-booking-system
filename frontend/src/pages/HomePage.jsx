import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { useBooking } from "../state/booking";

// Ratings seeded per movie title for display
const RATINGS = {
  "Dune: Part Two": 8.5,
  "Oppenheimer": 8.9,
  "3 Idiots": 8.4,
  "Gully Boy": 7.9,
  "Spider-Man: Into the Spider-Verse": 8.4,
  "Inception": 8.8,
  "Interstellar": 8.7,
  "The Dark Knight": 9.0,
  "Zindagi Na Milegi Dobara": 8.2,
  "Drishyam": 8.1,
  "KGF: Chapter 2": 7.8,
  "Barbie": 7.0,
};

function StarRating({ rating }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold">
      ★ {rating.toFixed(1)}
    </span>
  );
}

export function HomePage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const navigate = useNavigate();
  const { setMovie, reset } = useBooking();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getMovies();
        if (!alive) return;
        setMovies(data);
        reset();
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed to load movies");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reset]);

  const genres = useMemo(() => {
    const set = new Set(movies.map((m) => m.genre).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [movies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies.filter((m) => {
      const matchesQuery = !q || `${m.title} ${m.genre || ""} ${m.language || ""}`.toLowerCase().includes(q);
      const matchesGenre = activeGenre === "All" || m.genre === activeGenre;
      return matchesQuery && matchesGenre;
    });
  }, [movies, query, activeGenre]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-fuchsia-500/5 p-7 shadow-glow">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,1)]" />
              Delhi NCR · Live seats
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Now Playing
            </h1>
            <p className="mt-2 max-w-lg text-sm text-zinc-400">
              Browse movies, pick your seats on an interactive map, and confirm in seconds.
            </p>
          </div>

          <div className="w-full sm:w-[320px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                🔍
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, genre, language…"
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-9 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-indigo-400/40 focus:bg-black/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Genre filter chips */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                activeGenre === g
                  ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Movies grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="text-sm text-rose-100">⚠ {error}</div>
          <div className="mt-1 text-xs text-rose-200/70">Make sure the backend is running.</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-sm text-zinc-400">No movies found for "{query || activeGenre}".</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, idx) => (
              <motion.div
                key={m.movie_id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.04, duration: 0.22 }}
              >
                <button
                  onClick={() => {
                    setMovie(m);
                    navigate(`/movies/${m.movie_id}/shows`);
                  }}
                  className="w-full text-left"
                >
                  <Card className="group h-full cursor-pointer transition hover:border-indigo-400/20 hover:bg-white/[0.06]">
                    <div className="flex items-start gap-4">
                      {/* Poster */}
                      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {m.poster_url ? (
                          <img
                            src={m.poster_url}
                            alt={m.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-2xl">
                            🎬
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-base font-semibold leading-snug text-white line-clamp-2">
                            {m.title}
                          </div>
                          <StarRating rating={RATINGS[m.title]} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {m.genre ? <Badge>{m.genre}</Badge> : null}
                          {m.language ? <Badge tone="info">{m.language}</Badge> : null}
                          {m.duration ? (
                            <span className="text-[11px] text-zinc-500">{m.duration} min</span>
                          ) : null}
                        </div>

                        {m.cast_names ? (
                          <div className="mt-2 line-clamp-1 text-[11px] text-zinc-500">
                            {m.cast_names}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <span className="text-xs text-zinc-500">View showtimes</span>
                      <span className="text-xs text-indigo-400 transition group-hover:translate-x-0.5">→</span>
                    </div>
                  </Card>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

