# Debug Log

### 2026-04-28 — EONET API 503 rate limiting kills allocation cycles
**Symptom:** Allocation cycle aborted with "no assessments" — all bbox queries to EONET returned 503.
**Root cause:** The cycle runs 3 bbox queries (fire bioregion, water bioregion, rogue) back-to-back. EONET rate-limits after the initial bulk fetch of 6594 events, returning 503 for subsequent calls within the same minute.
**Fix:** Added in-memory cache to `nasa-eonet.ts` with 5-minute TTL. On API failure, returns cached data if available and fresh. Added cache priming on server startup in `mcp-server.ts`.
**Mechanism:** First startup fetches all events once, subsequent bbox queries filter the cached array in-memory instead of hitting the API. Cache refreshes every 5 minutes on successful API calls.

### 2026-04-28 — agents/.env missing, dotenv/config can't find EVM_PRIVATE_KEY
**Symptom:** Backend starts but all onchain operations fail — EVM_PRIVATE_KEY undefined.
**Root cause:** The agents workspace runs from `agents/` directory. `dotenv/config` looks for `.env` in CWD, but the `.env` is at the monorepo root.
**Fix:** Created symlink: `ln -sf ../../.env agents/.env`
**Mechanism:** dotenv now finds the symlink, which resolves to the root `.env` containing all secrets.
