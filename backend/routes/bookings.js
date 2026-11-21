import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { HOLD_MINUTES, MAX_SEATS_PER_BOOKING, computeTotals, priceFor } from "../lib/pricing.js";
import { localPlusMinutes, nowLocal } from "../lib/time.js";
import { releaseBooking, releaseExpiredHolds } from "../lib/holds.js";
import { chargeSimulated } from "../lib/gateway.js";

export const bookings = Router();

const toInt = (v) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};
const httpError = (status, message) => Object.assign(new Error(message), { status });

async function loadBooking(conn, bookingId, userId) {
  const [[b]] = await conn.query(
    `SELECT b.booking_id, b.user_id, b.show_id, b.booking_date, b.status, b.booking_code, b.promo_code,
            b.discount, b.convenience_fee, b.hold_expires_at,
            sh.show_date, sh.start_time, sh.movie_id,
            m.title AS movie_title, m.poster_url, m.language, m.duration, m.certificate, m.genre,
            sc.screen_name, th.name AS theatre_name, th.location AS theatre_location, th.city AS theatre_city,
            p.amount AS paid_amount, p.method AS paid_method, p.status AS payment_status, p.reference AS payment_reference
     FROM BOOKING b
     JOIN SHOWS sh ON sh.show_id = b.show_id
     JOIN MOVIE m ON m.movie_id = sh.movie_id
     JOIN SCREEN sc ON sc.screen_id = sh.screen_id
     JOIN THEATRE th ON th.theatre_id = sc.theatre_id
     LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id
     WHERE b.booking_id = ? AND b.user_id = ?`,
    [bookingId, userId]
  );
  if (!b) return null;
  const [tickets] = await conn.query(
    `SELECT t.ticket_id, t.price, st.row_num, st.seat_num, st.type
     FROM TICKET t JOIN SHOW_SEAT ss ON ss.show_seat_id = t.show_seat_id JOIN SEAT st ON st.seat_id = ss.seat_id
     WHERE t.booking_id = ? ORDER BY st.row_num, st.seat_num`,
    [bookingId]
  );
  const subtotal = tickets.reduce((s, t) => s + Number(t.price), 0);
  // Seconds left on the seat hold, computed server-side so the client's clock/time zone never matters.
  const holdSecondsLeft =
    b.status === "Pending" && b.hold_expires_at
      ? Math.max(0, Math.round((Date.parse(`${b.hold_expires_at.replace(" ", "T")}Z`) - Date.parse(`${nowLocal().ts.replace(" ", "T")}Z`)) / 1000))
      : null;
  return {
    ...b,
    hold_seconds_left: holdSecondsLeft,
    seats: tickets.map((t) => ({ ticket_id: t.ticket_id, label: `${t.row_num}${t.seat_num}`, type: t.type, price: Number(t.price) })),
    subtotal,
    total: b.paid_amount != null ? Number(b.paid_amount) : null,
  };
}

/* ---------- create a booking = hold seats for HOLD_MINUTES ---------- */
async function createHold(userId, showId, ids) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[show]] = await conn.query("SELECT show_id, show_date, start_time FROM SHOWS WHERE show_id = ?", [showId]);
    if (!show) throw httpError(404, "Show not found");
    if (`${show.show_date} ${show.start_time}` <= nowLocal().ts) throw httpError(409, "This show has already started");

    // A user holds at most one pending booking per show: free the previous one first.
    const [mine] = await conn.query("SELECT booking_id FROM BOOKING WHERE user_id = ? AND show_id = ? AND status = 'Pending' FOR UPDATE", [userId, showId]);
    for (const row of mine) {
      await conn.query("UPDATE SHOW_SEAT ss JOIN TICKET t ON t.show_seat_id = ss.show_seat_id SET ss.status = 'Available' WHERE t.booking_id = ?", [row.booking_id]);
      await conn.query("DELETE FROM TICKET WHERE booking_id = ?", [row.booking_id]);
      await conn.query("UPDATE BOOKING SET status = 'Cancelled', hold_expires_at = NULL WHERE booking_id = ?", [row.booking_id]);
    }

    const [seatRows] = await conn.query(
      `SELECT ss.show_seat_id, ss.status, st.type
       FROM SHOW_SEAT ss JOIN SEAT st ON st.seat_id = ss.seat_id
       WHERE ss.show_id = ? AND ss.show_seat_id IN (?) FOR UPDATE`,
      [showId, ids]
    );
    if (seatRows.length !== ids.length) throw httpError(409, "Some of those seats are not valid for this show");
    if (seatRows.some((r) => r.status === "Booked")) throw httpError(409, SEAT_TAKEN);

    const hold = localPlusMinutes(HOLD_MINUTES);
    const [ins] = await conn.query("INSERT INTO BOOKING (user_id, show_id, status, hold_expires_at, convenience_fee) VALUES (?, ?, 'Pending', ?, 0)", [userId, showId, hold]);
    const bookingId = ins.insertId;
    await conn.query("UPDATE BOOKING SET booking_code = ? WHERE booking_id = ?", [`CV${String(bookingId).padStart(6, "0")}`, bookingId]);

    // The TICKET triggers re-check availability and flip the seats to 'Booked' (= held).
    for (const r of seatRows) {
      await conn.query("INSERT INTO TICKET (booking_id, show_seat_id, price) VALUES (?, ?, ?)", [bookingId, r.show_seat_id, priceFor(r.type)]);
    }
    await conn.commit();
    return { bookingId, hold };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const SEAT_TAKEN = "Someone just took one of those seats. Please pick again.";

bookings.post("/book", requireAuth, async (req, res) => {
  const showId = toInt(req.body?.show_id);
  const ids = [...new Set((Array.isArray(req.body?.show_seat_ids) ? req.body.show_seat_ids : []).map(toInt).filter((x) => x > 0))];
  if (!showId || ids.length === 0) return res.status(400).json({ error: "show_id and show_seat_ids[] are required" });
  if (ids.length > MAX_SEATS_PER_BOOKING) return res.status(400).json({ error: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time` });

  await releaseExpiredHolds().catch(() => {});
  // Two people grabbing the same seat can make InnoDB abort one transaction (deadlock). The loser
  // simply retries once and then sees "seat taken" - exactly what the user should see.
  let result;
  for (let attempt = 1; ; attempt++) {
    try {
      result = await createHold(req.userId, showId, ids);
      break;
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      if (err?.sqlState === "45000") return res.status(409).json({ error: SEAT_TAKEN });
      if (err?.code === "ER_LOCK_DEADLOCK" || err?.code === "ER_LOCK_WAIT_TIMEOUT") {
        if (attempt < 3) continue;
        return res.status(409).json({ error: SEAT_TAKEN });
      }
      throw err;
    }
  }
  const booking = await loadBooking(pool, result.bookingId, req.userId);
  res.status(201).json({ booking_id: result.bookingId, hold_expires_at: result.hold, booking, quote: computeTotals(booking.seats.map((s) => s.type), null) });
});

/* ---------- price preview (with optional promo) ---------- */
bookings.post("/quote", requireAuth, async (req, res) => {
  const bookingId = toInt(req.body?.booking_id);
  const b = bookingId && (await loadBooking(pool, bookingId, req.userId));
  if (!b) return res.status(404).json({ error: "Booking not found" });
  res.json(computeTotals(b.seats.map((s) => s.type), req.body?.promo_code));
});

/* ---------- pay ---------- */
bookings.post("/payment", requireAuth, async (req, res) => {
  const bookingId = toInt(req.body?.booking_id);
  const method = req.body?.method;
  if (!bookingId || !method) return res.status(400).json({ error: "booking_id and method are required" });
  if (!["UPI", "Card", "Wallet"].includes(method)) return res.status(400).json({ error: "Unsupported payment method" });

  // Talk to the (simulated) gateway BEFORE opening the transaction, so the booking row is never
  // locked while we wait on the network. Malformed details fail fast and don't touch the hold.
  const outcome = chargeSimulated(method, req.body?.details);
  if (outcome.error) return res.status(400).json({ error: outcome.error });
  await new Promise((r) => setTimeout(r, 900)); // feels like a real gateway round-trip

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.query("SELECT booking_id, status, hold_expires_at FROM BOOKING WHERE booking_id = ? AND user_id = ? FOR UPDATE", [bookingId, req.userId]);
    if (!row) throw httpError(404, "Booking not found");
    if (row.status !== "Pending") throw httpError(409, "This booking is no longer pending");
    if (row.hold_expires_at && row.hold_expires_at < nowLocal().ts) {
      await conn.rollback();
      await releaseExpiredHolds().catch(() => {});
      return res.status(410).json({ error: "Your seat hold expired. Please select seats again." });
    }

    const [tix] = await conn.query("SELECT st.type FROM TICKET t JOIN SHOW_SEAT ss ON ss.show_seat_id = t.show_seat_id JOIN SEAT st ON st.seat_id = ss.seat_id WHERE t.booking_id = ?", [bookingId]);
    if (!tix.length) throw httpError(409, "No seats on this booking");
    const totals = computeTotals(tix.map((t) => t.type), req.body?.promo_code);
    if (totals.promoError) throw httpError(400, totals.promoError);


    const ok = outcome.ok;
    // Amount is always computed here from the tickets - the client's number is never trusted.
    await conn.query("INSERT INTO PAYMENT (booking_id, amount, method, status, reference) VALUES (?, ?, ?, ?, ?)", [bookingId, totals.total, method, ok ? "Successful" : "Failed", outcome.ref || null]);
    if (ok) {
      await conn.query("UPDATE BOOKING SET promo_code = ?, discount = ?, convenience_fee = ?, hold_expires_at = NULL WHERE booking_id = ?", [totals.promo?.code || null, totals.discount, totals.fee, bookingId]);
    } else {
      await conn.query("UPDATE SHOW_SEAT ss JOIN TICKET t ON t.show_seat_id = ss.show_seat_id SET ss.status = 'Available' WHERE t.booking_id = ?", [bookingId]);
      await conn.query("DELETE FROM TICKET WHERE booking_id = ?", [bookingId]);
      await conn.query("UPDATE BOOKING SET hold_expires_at = NULL WHERE booking_id = ?", [bookingId]);
    }
    await conn.commit();

    if (!ok) return res.status(402).json({ error: outcome.reason, payment_status: "Failed", seats_released: true });
    res.status(201).json({ payment_status: "Successful", booking: await loadBooking(pool, bookingId, req.userId) });
  } catch (err) {
    await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Payment already exists for this booking" });
    throw err;
  } finally {
    conn.release();
  }
});

/* ---------- my bookings ---------- */
bookings.get("/bookings", requireAuth, async (req, res) => {
  const [ids] = await pool.query("SELECT booking_id FROM BOOKING WHERE user_id = ? AND status = 'Confirmed' ORDER BY booking_id DESC LIMIT 50", [req.userId]);
  const list = [];
  for (const { booking_id } of ids) list.push(await loadBooking(pool, booking_id, req.userId));
  res.json(list);
});

bookings.get("/bookings/:id", requireAuth, async (req, res) => {
  const id = toInt(req.params.id);
  await releaseExpiredHolds().catch(() => {});
  const b = id && (await loadBooking(pool, id, req.userId));
  if (!b) return res.status(404).json({ error: "Booking not found" });
  res.json(b);
});

/* ---------- user left checkout: free the seats right away ---------- */
bookings.delete("/bookings/:id", requireAuth, async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid booking id" });
  const r = await releaseBooking(id, req.userId);
  if (!r.ok) return res.status(r.code).json({ error: r.code === 404 ? "Booking not found" : "Only pending bookings can be released" });
  res.json({ released: true });
});
