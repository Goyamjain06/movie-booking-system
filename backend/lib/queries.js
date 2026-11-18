import { pool } from "../db.js";
import { nowLocal } from "./time.js";
import { SEAT_PRICES } from "./pricing.js";

export async function listMovies() {
  const { ts } = nowLocal();
  const [rows] = await pool.query(
    `SELECT m.movie_id, m.title, m.genre, m.language, m.duration, m.poster_url, m.cast_names,
            m.rating, m.certificate, m.release_year, m.synopsis,
            (SELECT COUNT(*) FROM SHOWS sh
              WHERE sh.movie_id = m.movie_id AND TIMESTAMP(sh.show_date, sh.start_time) > ?) AS upcoming_shows
     FROM MOVIE m
     ORDER BY m.rating DESC, m.title`,
    [ts]
  );
  return rows.map((r) => ({ ...r, rating: r.rating == null ? null : Number(r.rating) }));
}

export async function getMovie(id) {
  const all = await listMovies();
  return all.find((m) => m.movie_id === id) || null;
}

const SHOW_SELECT = `
  SELECT sh.show_id, sh.show_date, sh.start_time, sh.movie_id,
         m.title AS movie_title, m.poster_url, m.cast_names, m.duration, m.language, m.genre, m.certificate,
         sh.screen_id, sc.screen_name,
         th.theatre_id, th.name AS theatre_name, th.location AS theatre_location, th.city AS theatre_city,
         (SELECT COUNT(*) FROM SHOW_SEAT x WHERE x.show_id = sh.show_id AND x.status = 'Available') AS seats_available,
         (SELECT COUNT(*) FROM SHOW_SEAT x WHERE x.show_id = sh.show_id) AS seats_total
  FROM SHOWS sh
  JOIN MOVIE m ON m.movie_id = sh.movie_id
  JOIN SCREEN sc ON sc.screen_id = sh.screen_id
  JOIN THEATRE th ON th.theatre_id = sc.theatre_id`;

/** Upcoming shows only (anything that already started is hidden). */
export async function listShows({ movieId = null, date = null, limit = 500 } = {}) {
  const { ts } = nowLocal();
  const [rows] = await pool.query(
    `${SHOW_SELECT}
     WHERE TIMESTAMP(sh.show_date, sh.start_time) > ?
       AND (? IS NULL OR sh.movie_id = ?)
       AND (? IS NULL OR sh.show_date = ?)
     ORDER BY sh.show_date, sh.start_time, th.name
     LIMIT ?`,
    [ts, movieId, movieId, date, date, limit]
  );
  return rows;
}

export async function getShow(showId) {
  const [rows] = await pool.query(`${SHOW_SELECT} WHERE sh.show_id = ?`, [showId]);
  return rows[0] || null;
}

export async function getSeats(showId) {
  const [rows] = await pool.query(
    `SELECT ss.show_seat_id, st.seat_id, st.row_num, st.seat_num, st.type, ss.status
     FROM SHOW_SEAT ss JOIN SEAT st ON st.seat_id = ss.seat_id
     WHERE ss.show_id = ?
     ORDER BY st.row_num, st.seat_num`,
    [showId]
  );
  return rows.map((r) => ({ ...r, price: SEAT_PRICES[r.type] ?? SEAT_PRICES.Regular }));
}
