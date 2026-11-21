import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";
// In production a missing secret would let anyone forge tokens with the public fallback,
// so refuse to start instead of only warning.
if (isProd && !process.env.JWT_SECRET) {
  throw new Error("[auth] JWT_SECRET must be set in production (use a long random string)");
}
const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

export function signToken(user) {
  return jwt.sign({ uid: user.user_id }, SECRET, { expiresIn: "7d" });
}

function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Attaches req.userId when a valid token is present (never blocks). */
export function optionalAuth(req, _res, next) {
  const t = readToken(req);
  if (t) {
    try {
      req.userId = jwt.verify(t, SECRET).uid;
    } catch {
      /* ignore invalid token */
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  const t = readToken(req);
  if (!t) return res.status(401).json({ error: "Please sign in to continue" });
  try {
    req.userId = jwt.verify(t, SECRET).uid;
    next();
  } catch {
    res.status(401).json({ error: "Your session expired, please sign in again" });
  }
}
