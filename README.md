# Interphase — Nucleus (MVP)

> change begins before it shows

The live reflection conversation. iPhone-optimised progressive web app — streaming + speech together.

## What it is

A single-page app (`index.html`) plus one Vercel Edge Function (`api/reflect.js`) that streams questions from Claude via Server-Sent Events. The browser parses the stream, renders tokens as they arrive, and begins speaking the first sentence 400 ms after its closing punctuation — so the voice overlaps the text and the conversation feels alive.

## Local development

```bash
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY
npx vercel dev               # serves on http://localhost:3000
```

## Deploy

Connected to Vercel via GitHub. Push to `main` → production. Push any other branch → preview URL.

## Stack

- **Front end** — single HTML file, no build step, Web Speech API for voice input + output
- **API** — `/api/reflect` Vercel Edge Function, proxies streaming to Anthropic with the system prompt and parameters locked (`max_tokens: 120`, the 15-rule prompt)
- **Secrets** — `ANTHROPIC_API_KEY` lives only in Vercel env vars, never in the browser

## Parameters that must not change

- `max_tokens: 120` — forces short questions
- Voice rate `0.88`, pitch `0.95`
- Voice priority: Samantha → Daniel → en-GB → en-US → default
- 400 ms delay before the first spoken sentence only
- System prompt rule 15: front-load the question, no preamble
