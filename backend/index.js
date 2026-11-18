import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pool } from "./db.js";
import { optionalAuth } from "./lib/auth.js";
import { startScheduler } from "./lib/scheduler.js";
import { catalog } from "./routes/catalog.js";
import { auth } from "./routes/auth.js";
import { bookings } from "./routes/bookings.js";
import { chat } from "./routes/chat.js";

const app = express();
app.set("trust proxy", 1); // behind Render/Railway proxies: correct client IPs for rate limiting

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")),
].filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
  })
);
app.use(express.json({ limit: "20kb" }));
app.use(optionalAuth);

app.get("/", (_req, res) => {
  res.json({
    name: "CineVerse API",
    ok: true,
    endpoints: [
      "GET  /health", "GET  /config", "GET  /movies", "GET  /movies/:id", "GET  /shows?movie_id=&date=", "GET  /shows/:id", "GET  /seats/:show_id",
      "POST /auth/register", "POST /auth/login", "GET  /auth/me",
      "POST /book", "POST /quote", "POST /payment", "GET  /bookings", "GET  /bookings/:id", "DELETE /bookings/:id",
      "POST /chat",
    ],
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Database connection failed", details: { code: err?.code } });
  }
});

app.use(catalog);
app.use(auth);
app.use(bookings);
app.use(chat);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// Express 5 forwards rejected async handlers here
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`CineVerse API listening on http://localhost:${port}`);
  startScheduler();
});
