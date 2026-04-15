// Interphase — sentence-level TTS proxy (ElevenLabs).
// Wraps ElevenLabs /v1/text-to-speech and streams MP3 bytes back to the browser.
// Edge runtime so the audio body streams through without buffering.

export const config = { runtime: "edge" };

// Voice: "Rachel" — warm, unhurried, classic ElevenLabs default.
// Swap via body.voice_id if you want to try another (e.g. Charlotte XB0fDUnXU5powFXDhCwa).
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// eleven_turbo_v2_5 — fastest + cheapest, good quality. Use eleven_multilingual_v2 for top quality.
const MODEL_ID = "eleven_turbo_v2_5";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const text = String(body?.text || "").slice(0, 1000).trim();
  if (!text) return new Response("text required", { status: 400 });

  const voiceId = String(body?.voice_id || DEFAULT_VOICE_ID);

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    console.error("elevenlabs tts error", upstream.status, errText);
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
