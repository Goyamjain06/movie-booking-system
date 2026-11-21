// Concurrency check: N different users try to hold the SAME seat at the same moment.
// Exactly one must win (201); every other request must be rejected with 409.
//
//   npm run race            # 20 users (default)
//   npm run race -- 50      # 50 users
//
// Needs the API running and the same backend/.env (it creates throwaway users directly in
// the DB and signs their tokens with JWT_SECRET, so the auth rate limiter is not involved).
import "dotenv/config";
import { pool } from "../db.js";
import { signToken } from "../lib/auth.js";

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const N = Number(process.argv[2]) || 20;

async function makeUsers(n) {
  const tag = Date.now();
  const users = [];
  for (let i = 0; i < n; i++) {
    const [r] = await pool.query("INSERT INTO `USER` (name, email, password) VALUES (?, ?, NULL)", [`Race ${i}`, `race${tag}_${i}@example.test`]);
    users.push({ user_id: r.insertId });
  }
  return users;
}

async function freeSeat() {
  const shows = await (await fetch(`${API}/shows`)).json();
  for (const show of shows) {
    const { seats } = await (await fetch(`${API}/seats/${show.show_id}`)).json();
    const seat = seats.find((s) => s.status === "Available");
    if (seat) return { showId: show.show_id, seatId: seat.show_seat_id };
  }
  throw new Error("No free seat found");
}

const users = await makeUsers(N);
const { showId, seatId } = await freeSeat();

const started = performance.now();
const results = await Promise.all(
  users.map(async (u) => {
    const res = await fetch(`${API}/book`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${signToken(u)}` },
      body: JSON.stringify({ show_id: showId, show_seat_ids: [seatId] }),
    });
    return res.status;
  })
);
const ms = Math.round(performance.now() - started);

const count = (code) => results.filter((s) => s === code).length;
const won = count(201);
const rejected = count(409);
console.log(`${N} concurrent requests for seat ${seatId} (show ${showId}) in ${ms} ms`);
console.log(`  201 Created : ${won}`);
console.log(`  409 Conflict: ${rejected}`);
const other = results.filter((s) => s !== 201 && s !== 409);
if (other.length) console.log(`  other       : ${other.join(", ")}`);

// clean up: cancel the winning hold and remove the throwaway users
const ids = users.map((u) => u.user_id);
await pool.query(
  "UPDATE SHOW_SEAT ss JOIN TICKET t ON t.show_seat_id = ss.show_seat_id JOIN BOOKING b ON b.booking_id = t.booking_id SET ss.status = 'Available' WHERE b.user_id IN (?)",
  [ids]
);
await pool.query("DELETE t FROM TICKET t JOIN BOOKING b ON b.booking_id = t.booking_id WHERE b.user_id IN (?)", [ids]);
await pool.query("DELETE FROM BOOKING WHERE user_id IN (?)", [ids]);
await pool.query("DELETE FROM `USER` WHERE user_id IN (?)", [ids]);
await pool.end();

const pass = won === 1 && rejected === N - 1;
console.log(pass ? "PASS: exactly one booking, no double-booking" : "FAIL");
process.exit(pass ? 0 : 1);
