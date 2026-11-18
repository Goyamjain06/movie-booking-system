# 🎬 CineVerse: Online Movie Ticket Booking

A full-stack movie booking platform: cinematic UI, live seat maps, time-boxed seat holds, promo codes, QR tickets and **Cinebot**, an AI movie assistant.

**Stack:** React 19 · Tailwind CSS · Framer Motion · Node.js · Express 5 · MySQL · JWT · Claude API (optional)

---

## ✨ Features

**Booking experience**
- Animated intro, auto-rotating hero carousel, 3D-tilt poster cards
- Search (`/` shortcut), genre chips, language filter, sorting
- Movie page with 7-day date strip and theatre-wise showtimes colour-coded by availability (*Filling fast*, *Almost full*, *Sold out*)
- Curved-screen seat map with Regular / Premium / VIP-recliner tiers and an aisle
- **✨ Best seats**: picks the best side-by-side seats in the sweet-spot rows for N people
- Live availability: the seat map refreshes itself and tells you if someone grabs your seat
- **6-minute seat hold** with a countdown ring; seats are released automatically (or instantly if you go back)
- Checkout with UPI / Card / Wallet, card-brand detection, promo codes
- Confirmation with confetti, **QR ticket**, add-to-calendar (.ics), print / PDF, share
- My Bookings (upcoming / past), sign in / register

**Cinebot, the AI assistant** (floating chat on every page)
- Recommends movies, finds showtimes, explains seats, prices and offers, replies in English / Hindi / Hinglish
- With `ANTHROPIC_API_KEY`: Claude with **tool use** over your live database (it never invents titles or showtimes)
- Without a key: a built-in rule-based mode answers from the same database, so the demo always works
- Rich replies: tappable movie and showtime cards that deep-link into booking; rate-limited to protect your key

**Engineering**
- Server-side pricing: the client never decides what a ticket costs
- Transactional booking with `SELECT … FOR UPDATE`, DB triggers as a second line of defence, deadlock retry
- JWT auth (bcrypt), rate-limited auth and chat, Helmet, CORS allow-list
- Scheduler keeps the next 7 days of shows populated, so a deployed demo never runs dry
- Showtimes use the cinema's time zone (IST) regardless of server time zone
- Accessible: keyboard-operable seats, ARIA labels, reduced-motion support, skip link

---

## 🏗️ Architecture

```
React (Vercel)  ──HTTPS──►  Express API (Render/Railway)  ──►  MySQL
   │                              │
   │  /chat                       ├──► Claude API (tool use: search_movies, get_showtimes)
   └─ Cinebot widget              └──► scheduler: seat-hold expiry · show generation
```

```
movie-booking-system/
├── backend/            Express API (routes/, lib/, test/)
├── frontend/           React app (pages/, components/, state/)
├── schema.sql          tables + triggers
├── data.sql            seed data (users, movies, theatres, screens, seats, sample bookings)
└── submissions/        course documents (ER diagram, queries, …)
```

---

## 🚀 Run it locally

**Prerequisites:** Node 20+, MySQL 8 (or MariaDB 10.5+).

```bash
# 1. database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS movie_booking"
mysql -u root -p movie_booking < schema.sql
mysql -u root -p movie_booking < data.sql

# 2. API
cd backend
cp .env.example .env        # set DB_PASSWORD and JWT_SECRET; ANTHROPIC_API_KEY is optional
npm install
npm run dev                 # http://localhost:3000

# 3. web app (new terminal)
cd frontend
cp .env.example .env.local
npm install
PORT=3001 npm start         # http://localhost:3001
```

**Demo account:** `aarav.mehta@example.com` / `cine1234` (or use the *Continue with demo account* button).

### Tests
```bash
cd backend && npm test      # API must be running; covers auth, hold → promo → pay, race conditions, chatbot
```

---

## 💳 Payments (simulated)

No real money moves and no card data is stored. Use these inputs to demo both outcomes:

| Method | Success | Failure |
|---|---|---|
| Card | `4242 4242 4242 4242`, any future expiry, any CVV | `4000 0000 0000 0002` (declined), `4000 0000 0000 9995` (insufficient funds) |
| UPI | any valid ID, e.g. `demo@okhdfc` | `fail@upi` |
| Wallet | Paytm / PhonePe / Amazon Pay | n/a |

A failed payment releases the seats immediately.

**Promo codes:** `CINE20` (20% off, up to ₹150, min ₹400) · `WELCOME50` (₹50 off, min ₹300) · `VIPNIGHT` (₹100 off on 4+ tickets, min ₹800)

**Prices:** Regular ₹200 · Premium ₹320 · VIP ₹480, plus ₹20 convenience fee per ticket (defined once in `backend/lib/pricing.js`).

---

## 🤖 Enabling the AI mode

1. Create an API key at <https://console.anthropic.com>.
2. Put it in `backend/.env` as `ANTHROPIC_API_KEY=...` and restart the API.
3. The chat header switches from *Movie assistant* to *AI assistant*. The model is `claude-haiku-5-5` by default; override with `CHAT_MODEL`.

If the AI call ever fails, Cinebot falls back to built-in mode instead of showing an error.

---

## 🖼️ Posters

Posters load from TMDB URLs stored in `MOVIE.poster_url`. If an image can't load, the UI shows generated poster art (gradient, initial and title), so nothing looks broken. To change a poster, update that column.

---

## ☁️ Deployment (summary)

- **Database:** any managed MySQL (set `DB_SSL=true` if the provider requires TLS); load `schema.sql` then `data.sql`
- **API:** `render.yaml` (Render) or `railway.json` (Railway). Set `DB_*`, `JWT_SECRET`, `FRONTEND_URL`, optionally `ANTHROPIC_API_KEY`
- **Web:** Vercel (root `frontend`, build `npm run build`, env `REACT_APP_API_URL`); `vercel.json` already handles SPA routing

---

## 👥 Team

Built by [@Goyamjain06](https://github.com/Goyamjain06) and [@ddostomax](https://github.com/ddostomax).
