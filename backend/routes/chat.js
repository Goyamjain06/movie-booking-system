import { Router } from "express";
import rateLimit from "express-rate-limit";
import { handleChat } from "../lib/chat.js";

export const chat = Router();

// Protects the (paid) AI key from abuse on a public deployment.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're chatting too fast, give me a moment" },
});

chat.post("/chat", limiter, async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 500);
  if (!message) return res.status(400).json({ error: "message is required" });

  // stateless: the client sends the last few turns, we sanitise them
  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
  // the Messages API must start with a user turn and alternate
  while (history.length && history[0].role !== "user") history.shift();
  const cleaned = history.filter((m, i) => i === 0 || m.role !== history[i - 1].role);

  res.json(await handleChat(cleaned, message));
});
