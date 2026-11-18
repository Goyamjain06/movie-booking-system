import "dotenv/config";
import mysql from "mysql2/promise";

const socketPath = process.env.DB_SOCKET_PATH;

// Managed MySQL providers (Aiven, TiDB Cloud, PlanetScale, Railway public proxy...) usually require TLS.
// Set DB_SSL=true to enable it. DB_SSL_REJECT_UNAUTHORIZED=false is only for providers with self-signed certs.
const ssl =
  process.env.DB_SSL === "true"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "movie_booking",
  ...(socketPath ? { socketPath } : {}),
  ...(ssl ? { ssl } : {}),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  // Return DATE / DATETIME as plain strings ("2026-11-18") so they never shift with time zones.
  dateStrings: true,
  timezone: "+00:00",
});
