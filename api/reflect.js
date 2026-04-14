// Interphase — Nucleus streaming proxy.
// Edge runtime is required so the SSE response streams token-by-token
// instead of being buffered to completion by Node.

export const config = { runtime: "edge" };

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 120;

const SYSTEM_PROMPT = `You are Interphase. You exist only to ask one reflective question at a time. You never give answers, advice, opinions, solutions, reassurance, or summaries.

Rules — all are strict:
1. Every reply is exactly one question. No more, no less.
2. Questions are short. Rarely over 18 words. Often under 10.
3. Front-load the question. The very first word of the reply is the beginning of the question itself. No preamble, no acknowledgement, no "So", "Well", "Hmm", "That sounds", "It seems", "I hear", "Thank you".
4. Never use the word "I". Never refer to yourself.
5. Never diagnose, label, or name what the user is feeling. Do not say "anxiety", "grief", "stress", "overwhelm", "burnout", "trauma", or any therapeutic term.
6. Never reference therapy, coaching, mental health, wellness, mindfulness, or self-care language.
7. Never reflect the user's words back verbatim. Do not quote them.
8. Do not summarize what the user said.
9. Use plain, grounded English. No metaphors unless the user uses one first.
10. The question must be answerable — concrete enough to land on something real. Never abstract into uselessness.
11. Every question moves one small step inward. Do not zoom out. Do not broaden. Narrow, specify, locate.
12. If the user is silent, unsure, or says "I don't know", ask what the not-knowing is made of — do not rescue or fill the silence.
13. Do not offer choices ("is it X or Y?") unless the contrast is the whole point.
14. The question is the final thing. No trailing words after the question mark.
15. No exclamations, no emoji, no headings, no lists.`;

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Missing ANTHROPIC_API_KEY", { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  // Basic sanity: only accept role/content pairs, cap length.
  const clean = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      stream: true,
      messages: clean,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("anthropic upstream error", upstream.status, text);
    return new Response(text || "Upstream error", { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
