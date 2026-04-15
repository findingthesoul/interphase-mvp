// Interphase — Supabase logging.
// Fire-and-forget insert into public.reflections for every completed turn.
// Uses Supabase's PostgREST directly so we don't need @supabase/supabase-js.

export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    // Soft-fail so the client doesn't blow up if logging isn't configured yet.
    return new Response(null, { status: 204 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const session_id     = String(body?.session_id || "").slice(0, 200);
  const user_text      = String(body?.user_text || "").slice(0, 10000);
  const assistant_text = String(body?.assistant_text || "").slice(0, 10000);
  if (!session_id || !user_text || !assistant_text) {
    return new Response("missing fields", { status: 400 });
  }

  const resp = await fetch(`${url.replace(/\/$/, "")}/rest/v1/reflections`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: key,
      authorization: `Bearer ${key}`,
      prefer: "return=minimal",
    },
    body: JSON.stringify({ session_id, user_text, assistant_text }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error("supabase insert failed", resp.status, err);
    return new Response(err || "insert failed", { status: resp.status });
  }

  return new Response(null, { status: 204 });
}
