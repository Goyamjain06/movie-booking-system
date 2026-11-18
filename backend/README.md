# CineVerse API

Express 5 · MySQL (mysql2) · JWT auth · optional Claude-powered chatbot.

```bash
cp .env.example .env     # fill in DB credentials + JWT_SECRET
npm install
npm run dev              # http://localhost:3000
npm test                 # needs the API running + a seeded DB (see root README)
```

| Method | Path | Notes |
|---|---|---|
| GET | `/health`, `/config` | liveness, pricing / promo / feature flags |
| GET | `/movies`, `/movies/:id` | with rating, synopsis, upcoming show count |
| GET | `/shows?movie_id=&date=`, `/shows/:id` | upcoming shows only, with seats left |
| GET | `/seats/:show_id` | per-seat status and server-side price |
| POST | `/auth/register`, `/auth/login`; GET `/auth/me` | bcrypt + JWT (7 days) |
| POST | `/book` | holds seats for 6 minutes (transactional, row-locked) |
| POST | `/quote` | price preview with optional promo code |
| POST | `/payment` | simulated gateway; amount is computed on the server |
| GET | `/bookings`, `/bookings/:id` | my tickets |
| DELETE | `/bookings/:id` | release a pending hold |
| POST | `/chat` | Cinebot (rate limited) |

Background jobs (`lib/scheduler.js`): keeps the next 7 days of showtimes generated and releases expired seat holds every minute.
