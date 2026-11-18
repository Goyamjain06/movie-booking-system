import { pool } from "../db.js";
import { dateOffset, nowLocal } from "./time.js";
import { releaseExpiredHolds } from "./holds.js";

const SLOTS = ["10:30:00", "13:45:00", "17:00:00", "20:30:00"];
const DAYS_AHEAD = 7;

/**
 * Keeps the next 7 days of showtimes populated so a deployed demo never runs out of shows.
 * Deterministic: every movie plays two slots a day, rotating so each day looks different.
 * Also creates SHOW_SEAT rows and (optionally) simulates some already-sold seats.
 */
export async function ensureSchedule({ simulateOccupancy = process.env.SIMULATE_OCCUPANCY !== "false" } = {}) {
  const [movies] = await pool.query("SELECT movie_id FROM MOVIE ORDER BY movie_id");
  const [screens] = await pool.query("SELECT screen_id FROM SCREEN ORDER BY screen_id");
  if (!movies.length || !screens.length) return { created: 0 };

  const from = dateOffset(0);
  const to = dateOffset(DAYS_AHEAD - 1);
  const [existing] = await pool.query(
    "SELECT movie_id, screen_id, show_date, start_time FROM SHOWS WHERE show_date BETWEEN ? AND ?",
    [from, to]
  );
  const busy = new Set(existing.map((s) => `${s.screen_id}|${s.show_date}|${s.start_time}`));
  const hasMovieAt = new Set(existing.map((s) => `${s.movie_id}|${s.show_date}|${s.start_time}`));

  const toCreate = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = dateOffset(d);
    movies.forEach((m, i) => {
      for (const j of [0, 2]) {
        const time = SLOTS[(i + d + j) % SLOTS.length];
        if (hasMovieAt.has(`${m.movie_id}|${date}|${time}`)) continue;
        // first free screen at that time, starting from a movie-specific offset for variety
        for (let k = 0; k < screens.length; k++) {
          const sc = screens[(i + k) % screens.length].screen_id;
          const key = `${sc}|${date}|${time}`;
          if (busy.has(key)) continue;
          busy.add(key);
          hasMovieAt.add(`${m.movie_id}|${date}|${time}`);
          toCreate.push([m.movie_id, sc, date, time]);
          break;
        }
      }
    });
  }
  if (!toCreate.length) return { created: 0 };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query("INSERT INTO SHOWS (movie_id, screen_id, show_date, start_time) VALUES ?", [toCreate]);
    const firstId = res.insertId;
    const lastId = firstId + toCreate.length - 1;
    // one SHOW_SEAT per physical seat of the screen
    await conn.query(
      `INSERT INTO SHOW_SEAT (show_id, seat_id, status)
       SELECT sh.show_id, st.seat_id, 'Available'
       FROM SHOWS sh JOIN SEAT st ON st.screen_id = sh.screen_id
       WHERE sh.show_id BETWEEN ? AND ?`,
      [firstId, lastId]
    );
    if (simulateOccupancy) {
      // Demo realism: mark a deterministic 8-70% of seats as already sold (no tickets are created for these).
      await conn.query(
        `UPDATE SHOW_SEAT ss
         JOIN SHOWS sh ON sh.show_id = ss.show_id
         SET ss.status = 'Booked'
         WHERE ss.show_id BETWEEN ? AND ?
           AND MOD(CRC32(CONCAT(ss.show_id, '-', ss.seat_id)), 100) < 8 + MOD(sh.show_id * 17, 63)`,
        [firstId, lastId]
      );
    }
    await conn.commit();
    return { created: toCreate.length };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export function startScheduler() {
  const tick = async () => {
    try {
      const released = await releaseExpiredHolds();
      if (released) console.log(`[holds] released ${released} expired booking(s)`);
    } catch (e) {
      console.error("[holds] failed:", e.message);
    }
  };
  const schedule = async () => {
    try {
      const { created } = await ensureSchedule();
      if (created) console.log(`[schedule] created ${created} show(s) for ${nowLocal().date} +${DAYS_AHEAD}d`);
    } catch (e) {
      console.error("[schedule] failed:", e.message);
    }
  };
  schedule();
  setInterval(schedule, 3 * 60 * 60 * 1000).unref();
  setInterval(tick, 60 * 1000).unref();
}
