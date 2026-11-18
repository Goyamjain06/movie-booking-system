import { Router } from "express";
import { getMovie, getSeats, getShow, listMovies, listShows } from "../lib/queries.js";
import { releaseExpiredHolds } from "../lib/holds.js";
import { HOLD_MINUTES, MAX_SEATS_PER_BOOKING, SEAT_PRICES, CONVENIENCE_FEE_PER_TICKET, PROMOS } from "../lib/pricing.js";

export const catalog = Router();

const toInt = (v) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

catalog.get("/movies", async (_req, res) => {
  res.json(await listMovies());
});

catalog.get("/movies/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const movie = id && (await getMovie(id));
  if (!movie) return res.status(404).json({ error: "Movie not found" });
  res.json(movie);
});

catalog.get("/shows", async (req, res) => {
  const movieId = toInt(req.query.movie_id);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : null;
  res.json(await listShows({ movieId, date }));
});

catalog.get("/shows/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const show = id && (await getShow(id));
  if (!show) return res.status(404).json({ error: "Show not found" });
  res.json(show);
});

catalog.get("/seats/:show_id", async (req, res) => {
  const showId = toInt(req.params.show_id);
  if (!showId) return res.status(400).json({ error: "Invalid show_id" });
  await releaseExpiredHolds().catch(() => {});
  const seats = await getSeats(showId);
  res.json({ show_id: showId, seats, pricing: SEAT_PRICES });
});

catalog.get("/config", (_req, res) => {
  res.json({
    pricing: SEAT_PRICES,
    convenience_fee: CONVENIENCE_FEE_PER_TICKET,
    max_seats: MAX_SEATS_PER_BOOKING,
    hold_minutes: HOLD_MINUTES,
    promos: Object.entries(PROMOS).map(([code, p]) => ({ code, label: p.label, min: p.min })),
    chat_enabled: true,
    ai_powered: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});
