// Interphase — sentence-level TTS proxy.
// Wraps OpenAI's /v1/audio/speech and streams MP3 bytes back to the browser.
// Edge runtime so the audio body streams through without buffering.

export const config = { runtime: "edge" };

const MODEL = "tts-1";           // tts-1 = cheapest (~$15 / 1M chars). tts-1-hd for higher quality (~$30).
const DEFAULT_VOICE = "nova";    // alloy · echo · fable · onyx · nova · shimmer
const DEFAULT_SPEED = 0.92;      // honours briefing: warm and unhurried

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const text = String(body?.text || "").slice(0, 1000).trim();
  if (!text) return new Response("text required", { status: 400 });

  const voice = String(body?.voice || DEFAULT_VOICE);
  const speed = typeof body?.speed === "number" ? body.speed : DEFAULT_SPEED;

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: text,
      speed,
      response_format: "mp3",
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    console.error("openai tts error", upstream.status, errText);
    return new Response(errText || "tts upstream error", { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}
