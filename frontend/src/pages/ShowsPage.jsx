import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useBooking } from "../state/booking";

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function ShowsPage() {
  const { movieId } = useParams();
  const movieIdNum = Number(movieId);
  const navigate = useNavigate();
  const { movie, setShow } = useBooking();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getShows(movieIdNum);
        if (!alive) return;
        setShows(data);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed to load shows");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [movieIdNum]);

  const title = useMemo(() => {
    if (movie?.movie_id === movieIdNum) return movie.title;
    if (shows[0]?.movie_title) return shows[0].movie_title;
    return "Shows";
  }, [movie, movieIdNum, shows]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const sh of shows) {
      const key = sh.show_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(sh);
    }
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [shows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-400">Pick a showtime and reserve your seats.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/")}>
          Back
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="text-sm text-rose-100">Error: {error}</div>
        </Card>
      ) : shows.length === 0 ? (
        <Card>
          <div className="text-sm text-zinc-300">No shows found for this movie.</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, list], gIdx) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge tone="info">{fmtDate(date)}</Badge>
                <div className="text-xs text-zinc-500">{list.length} show{list.length > 1 ? "s" : ""}</div>
              </div>

              <div className="space-y-3">
                {list.map((sh, idx) => (
                  <motion.div
                    key={sh.show_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (gIdx * 0.06) + (idx * 0.03), duration: 0.2 }}
                  >
                    <Card className="group flex cursor-pointer flex-col gap-4 transition hover:border-indigo-400/20 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-200">
                            🕐 {fmtTime(sh.start_time)}
                          </span>
                          <Badge>{sh.screen_name}</Badge>
                        </div>
                        <div className="text-sm font-medium text-zinc-200">
                          {sh.theatre_name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          📍 {sh.theatre_location}, {sh.theatre_city}
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setShow(sh);
                          navigate(`/shows/${sh.show_id}/seats`);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Select Seats →
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

