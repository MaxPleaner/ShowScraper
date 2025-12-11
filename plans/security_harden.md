# LLM Endpoint Hardening Notes

- Lock CORS: restrict to `https://bayareashows.org` and `http://localhost:3000` (dev). Avoid `*`.
- API key handling: keep keys server-side only; ensure they are read from env and never echoed in errors/logs. Confirm no client exposure.
- Rate limiting / abuse: add per-IP (and per venue/date combo) rate limiting in FastAPI; also cap request size.
- Input validation: validate/normalize query params (date format, max lengths for title/venue/url), reject overlong/empty. Strip/escape before logging.
- Prompt injection mitigation: treat user strings as untrusted data; truncate lengths; avoid following instructions embedded in inputs.
- Auth (optional): if public, add shared secret header or signed token to SSE endpoint.
- SSE safety: timebox streams (keep 2–5 min), close on client disconnect, heartbeat if needed.
- Logging/privacy: avoid logging raw prompts/responses; scrub query strings.
- Dependency updates: audit & pin `fastapi`, `sse-starlette`, `langchain`, `openai`, `uvicorn`; run `pip-audit`.
- HTTPS: terminate TLS in front; enforce HTTPS when auth added.
- CSP: tighten on frontend (default-src 'self'; connect-src 'self' backend domain; img-src https: data:).
- Error handling: generic client errors; detailed server logs only.
- Request size limits: cap body/header sizes; SSE doesn’t need big payloads.
- Caching: if added later, ensure per-user or sanitized; do not mix user queries.
