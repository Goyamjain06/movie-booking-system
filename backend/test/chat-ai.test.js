// Tests the AI tool-use loop with a mocked model (no API key needed).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { handleChat } from "../lib/chat.js";
import { pool } from "../db.js";

after(() => pool.end());

test("AI loop: model calls search_movies, gets real DB rows, then answers", async () => {
  let call = 0;
  const seen = [];
  const fakeModel = async (messages) => {
    seen.push(messages.length);
    call++;
    if (call === 1) {
      return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "search_movies", input: { genre: "Sci-Fi" } }] };
    }
    const toolResult = messages.at(-1).content[0];
    assert.equal(toolResult.type, "tool_result");
    const rows = JSON.parse(toolResult.content);
    assert.ok(rows.length >= 3 && rows.every((r) => r.genre === "Sci-Fi"));
    return { stop_reason: "end_turn", content: [{ type: "text", text: `Try **${rows[0].title}**!` }] };
  };
  const out = await handleChat([], "sci-fi suggest karo", { fetchModel: fakeModel });
  assert.equal(out.mode, "ai");
  assert.match(out.reply, /Try \*\*/);
  assert.ok(out.cards.length >= 3 && out.cards[0].type === "movie");
});

test("AI failure falls back to built-in mode", async () => {
  const out = await handleChat([], "hello", { fetchModel: async () => { throw new Error("boom"); } });
  assert.equal(out.mode, "basic");
  assert.ok(out.reply);
});
