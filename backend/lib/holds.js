import { pool } from "../db.js";
import { nowLocal } from "./time.js";

/**
 * Releases seats of Pending bookings whose hold timer ran out.
 * Safe to call as often as we like (it is cheap and idempotent).
 */
export async function releaseExpiredHolds() {
  const now = nowLocal().ts;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [expired] = await conn.query(
      "SELECT booking_id FROM BOOKING WHERE status = 'Pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < ? FOR UPDATE",
      [now]
    );
    if (expired.length) {
      const ids = expired.map((r) => r.booking_id);
      await conn.query(
        `UPDATE SHOW_SEAT ss JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
         SET ss.status = 'Available' WHERE t.booking_id IN (?)`,
        [ids]
      );
      await conn.query("DELETE FROM TICKET WHERE booking_id IN (?)", [ids]);
      await conn.query("UPDATE BOOKING SET status = 'Cancelled', hold_expires_at = NULL WHERE booking_id IN (?)", [ids]);
    }
    await conn.commit();
    return expired.length;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Release one specific Pending booking (user left checkout). */
export async function releaseBooking(bookingId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[b]] = await conn.query(
      "SELECT booking_id, status FROM BOOKING WHERE booking_id = ? AND user_id = ? FOR UPDATE",
      [bookingId, userId]
    );
    if (!b) {
      await conn.rollback();
      return { ok: false, code: 404 };
    }
    if (b.status !== "Pending") {
      await conn.rollback();
      return { ok: false, code: 409 };
    }
    await conn.query(
      `UPDATE SHOW_SEAT ss JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
       SET ss.status = 'Available' WHERE t.booking_id = ?`,
      [bookingId]
    );
    await conn.query("DELETE FROM TICKET WHERE booking_id = ?", [bookingId]);
    await conn.query("UPDATE BOOKING SET status = 'Cancelled', hold_expires_at = NULL WHERE booking_id = ?", [bookingId]);
    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
