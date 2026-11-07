import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin requests (curl, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

app.get("/", (_req, res) => {
  res.json({
    name: "Movie Booking API",
    ok: true,
    endpoints: [
      "GET /health",
      "GET /movies",
      "GET /shows?movie_id=1",
      "GET /seats/:show_id",
      "POST /book",
      "POST /payment"
    ]
  });
});

app.get("/movies", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT movie_id, title, genre, language, duration, poster_url, cast_names FROM MOVIE ORDER BY title"
    );
    res.json(rows);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

app.get("/shows", async (_req, res) => {
  try {
    const movieId = toInt(_req.query?.movie_id);
    const [rows] = await pool.query(
      `
      SELECT
        sh.show_id,
        sh.show_date,
        sh.start_time,
        sh.movie_id,
        m.title AS movie_title,
        m.poster_url,
        m.cast_names,
        sh.screen_id,
        sc.screen_name,
        th.theatre_id,
        th.name AS theatre_name,
        th.location AS theatre_location,
        th.city AS theatre_city
      FROM SHOWS sh
      JOIN MOVIE m ON m.movie_id = sh.movie_id
      JOIN SCREEN sc ON sc.screen_id = sh.screen_id
      JOIN THEATRE th ON th.theatre_id = sc.theatre_id
      WHERE (? IS NULL OR sh.movie_id = ?)
      ORDER BY sh.show_date, sh.start_time, m.title
      `
      ,
      [movieId, movieId]
    );
    res.json(rows);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

app.get("/seats/:show_id", async (req, res) => {
  const showId = toInt(req.params.show_id);
  if (!showId) return res.status(400).json({ error: "Invalid show_id" });

  try {
    const [rows] = await pool.query(
      `
      SELECT
        ss.show_seat_id,
        st.seat_id,
        st.row_num,
        st.seat_num,
        st.type,
        ss.status
      FROM SHOW_SEAT ss
      JOIN SEAT st ON st.seat_id = ss.seat_id
      WHERE ss.show_id = ?
      ORDER BY st.row_num, st.seat_num
      `,
      [showId]
    );
    res.json({ show_id: showId, seats: rows });
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch seats" });
  }
});

app.post("/book", async (req, res) => {
  const userId = toInt(req.body?.user_id);
  const showId = toInt(req.body?.show_id);
  const showSeatIds = Array.isArray(req.body?.show_seat_ids) ? req.body.show_seat_ids : [];
  const normalizedSeatIds = showSeatIds
    .map((x) => toInt(x))
    .filter((x) => x && x > 0);

  if (!userId || !showId || normalizedSeatIds.length === 0) {
    return res.status(400).json({ error: "user_id, show_id, show_seat_ids[] are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock and validate requested seats belong to show and are available
    const placeholders = normalizedSeatIds.map(() => "?").join(",");
    const [seatRows] = await conn.query(
      `
      SELECT
        ss.show_seat_id,
        ss.status,
        st.type
      FROM SHOW_SEAT ss
      JOIN SEAT st ON st.seat_id = ss.seat_id
      WHERE ss.show_id = ?
        AND ss.show_seat_id IN (${placeholders})
      FOR UPDATE
      `,
      [showId, ...normalizedSeatIds]
    );

    if (seatRows.length !== normalizedSeatIds.length) {
      throw Object.assign(new Error("Some seats are invalid for this show"), { code: "INVALID_SEATS" });
    }
    const anyBooked = seatRows.some((r) => r.status === "Booked");
    if (anyBooked) {
      throw Object.assign(new Error("One or more seats already booked"), { code: "SEAT_TAKEN" });
    }

    const [bookingResult] = await conn.query(
      "INSERT INTO BOOKING (user_id, show_id, status) VALUES (?, ?, 'Pending')",
      [userId, showId]
    );
    const bookingId = bookingResult.insertId;

    // Insert tickets; triggers will mark seats as Booked
    const priceForType = (type) => {
      if (type === "VIP") return 500.0;
      if (type === "Premium") return 350.0;
      return 250.0;
    };

    for (const r of seatRows) {
      await conn.query("INSERT INTO TICKET (booking_id, show_seat_id, price) VALUES (?, ?, ?)", [
        bookingId,
        r.show_seat_id,
        priceForType(r.type)
      ]);
    }

    await conn.commit();
    res.status(201).json({ booking_id: bookingId });
  } catch (err) {
    await conn.rollback();

    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Invalid user_id or show_id" });
    }
    if (err?.code === "INVALID_SEATS" || err?.code === "SEAT_TAKEN") {
      return res.status(409).json({ error: err.message });
    }
    if (err?.sqlState === "45000") {
      return res.status(409).json({ error: err?.message || "Seat already booked" });
    }
    res.status(500).json({ error: "Failed to create booking" });
  } finally {
    conn.release();
  }
});

app.post("/payment", async (req, res) => {
  const bookingId = toInt(req.body?.booking_id);
  const amount = Number(req.body?.amount);
  const method = req.body?.method;

  if (!bookingId || !Number.isFinite(amount) || amount < 0 || !method) {
    return res.status(400).json({ error: "booking_id, amount, method are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const paymentStatus = amount > 0 ? "Successful" : "Failed";
    await conn.query(
      "INSERT INTO PAYMENT (booking_id, amount, method, status) VALUES (?, ?, ?, ?)",
      [bookingId, amount, method, paymentStatus]
    );

    // If payment fails, release seats + remove tickets for this booking
    if (paymentStatus === "Failed") {
      await conn.query(
        `
        UPDATE SHOW_SEAT ss
        JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
        SET ss.status = 'Available'
        WHERE t.booking_id = ?
        `,
        [bookingId]
      );
      await conn.query("DELETE FROM TICKET WHERE booking_id = ?", [bookingId]);
    }

    await conn.commit();
    const [[bookingRow]] = await pool.query(
      "SELECT booking_id, status FROM BOOKING WHERE booking_id = ?",
      [bookingId]
    );
    res.status(201).json({
      booking_id: bookingId,
      payment_status: paymentStatus,
      booking_status: bookingRow?.status || null
    });
  } catch (err) {
    await conn.rollback();

    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Invalid booking_id" });
    }
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Payment already exists for this booking" });
    }

    res.status(500).json({ error: "Failed to process payment" });
  } finally {
    conn.release();
  }
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
      details: {
        code: err?.code,
        message: err?.message
      }
    });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

