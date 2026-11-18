import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { pool } from "../db.js";
import { requireAuth, signToken } from "../lib/auth.js";

export const auth = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in a few minutes" },
});

const publicUser = (u) => ({ user_id: u.user_id, name: u.name, email: u.email, phone: u.phone });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

auth.post("/auth/register", limiter, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = String(req.body?.phone || "").trim() || null;
  const password = String(req.body?.password || "");

  if (name.length < 2) return res.status(400).json({ error: "Please enter your name" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const [dup] = await pool.query("SELECT user_id FROM `USER` WHERE email = ?", [email]);
  if (dup.length) return res.status(409).json({ error: "An account with this email already exists" });

  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query("INSERT INTO `USER` (name, email, phone, password) VALUES (?, ?, ?, ?)", [name, email, phone, hash]);
  const user = { user_id: r.insertId, name, email, phone };
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

auth.post("/auth/login", limiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const [[user]] = await pool.query("SELECT * FROM `USER` WHERE email = ?", [email]);
  const ok = user && user.password && (await bcrypt.compare(password, user.password));
  if (!ok) return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

auth.get("/auth/me", requireAuth, async (req, res) => {
  const [[user]] = await pool.query("SELECT user_id, name, email, phone FROM `USER` WHERE user_id = ?", [req.userId]);
  if (!user) return res.status(401).json({ error: "Account not found" });
  res.json({ user: publicUser(user) });
});
