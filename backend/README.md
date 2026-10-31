
# Deals24 Backend

This is the backend server for Deals24, which handles Telegram message aggregation and storage.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your environment variables by creating a `.env` file based on the template.

3. Configure your Telegram bot:
   - Create a bot using BotFather on Telegram
   - Add your bot to your channel as an admin
   - Set the bot token in the `.env` file

4. For production deployment:
   - Set `NODE_ENV=production`
   - Update the `WEBHOOK_URL` with your actual domain
   - Ensure your server is accessible from the internet with HTTPS

5. For development:
   - The bot will run in polling mode automatically

6. Start the server:
   ```
   npm run dev
   ```

## Atlas Search

Deal search uses the `deal_search_atlas_v2` Atlas Search index as its primary search engine. Atlas retrieves normalized tokens using shared lexical typo rules and keyword autocomplete. Both engines compute the same weighted exact-field and phrase boosts, so score values in pagination cursors survive failover and recovery. Model numbers are not fuzzed or prefix-expanded. If Atlas fails, both previews and results use bounded MongoDB token matching with the same coverage rules for 30 seconds before retrying Atlas. Fallback uses the `deal_search_tokens_v1` multikey index, exact single-edit alternatives, and bounded prefix ranges. After a failure, only one request probes recovery when the cooldown expires; other requests continue on fallback.

Prepare existing data and indexes after configuring `MONGODB_URI` (run from `backend`):

```bash
npm run atlas-search:backfill             # dry-run: report stale derived fields
npm run atlas-search:backfill -- --apply  # update only stale fields and ensure fallback index
npm run atlas-search:index
```

The backfill is idempotent, writes in batches of 250, and skips concurrent text/identity edits; rerun if skips are reported. The index command creates or updates v2 and waits for the requested definition to become READY and queryable. The previous v1 index is retained for rollback. Deploy the application only after these checks pass.

Run read-only verification against the configured database from `backend`:

```bash
npm run atlas-search:verify
```

This read-only check validates the deployed definition, recomputes derived fields for every stored deal (legitimately empty tokens are allowed), checks fallback index usage with explain, and asserts matching counts and top-50 ordering between Atlas and fallback for representative queries. Existing documents need correct `searchText` and `searchTokens`; ingestion derives these on validation.

Run `npm run atlas-search:verify -- --fixtures` for real database assertions covering expected relevance, typos, prefixes, synonyms, model numbers, filters, explicit sorts and pagination through failover and recovery. This additionally creates one uniquely named temporary collection and search index, then drops that exact collection in `finally`. It needs create/drop collection and search-index permissions and available Atlas index capacity.

Full-result database operations have a 4.5-second server execution limit and previews have a 1.8-second limit. The public search API captures ordered IDs once and pages through a MongoDB snapshot for two minutes, with a maximum of 64 retained sessions across instances. Snapshots hold at most 25,000 IDs; broader queries must be refined. This stays separate from the Redis budget. Page details are read fresh, deleted deals are omitted, and counts describe the captured membership. Date, price and click updates do not move members between pages. Every explicit search sort uses the same snapshot behavior. Old, expired, evicted or cross-query cursors receive HTTP 409 `SEARCH_CURSOR_EXPIRED`; both web grids clear the old pages and reload automatically. New searches include new deals; existing sessions retain their membership.

The lower-level query helper still supports keyset queries and native Atlas counts for verification. Coverage and deterministic relevance are computed after retrieval to preserve coverage-then-date ordering. Routine successful requests and cooldown fallback requests do not write logs. Process-local backend/failure/slow counters remain available through `getSearchMetrics()`; the QA metrics endpoint reads these directly rather than parsing console output. Searches taking at least 2 seconds, failed requests, and Atlas fallback warnings are limited to one warning per minute per model/category. Recovery logs once when a probe restores Atlas. No query text is logged.

### Local browser and load verification

Build the backend, then run `node dist/scripts/serveSearchQa.js` from `backend` in an environment that can connect to Atlas (WSL works). This local-only server listens on port 8091, uses the real search routes, creates snapshot TTL indexes, disconnects shared Redis, and disables ingestion, bots and production write routes. Its QA control endpoints exist only in this script. Build the frontend with `VITE_API_BASE_URL=http://127.0.0.1:8091/api` and `npm run build -- --outDir tmp/search-qa/site`, then run `npm run preview -- --outDir tmp/search-qa/site --port 8080 --host 127.0.0.1`. Using preview avoids dev-server reloads caused by trace artifacts. Wait for both servers to report readiness before testing.

From the project root, run `npm run test:search:browser` using installed Chrome. Tests cover real API filters/cursors, desktop previews and keyboard commit, infinite scrolling, mobile search, and a deliberately expired response to verify automatic recovery. Run `npm run test:search:load` separately after browser tests. It sends exactly 96 requests, at concurrency 1 and 4, against native and forced-fallback phases with Redis bypassed. Acceptance budgets are zero HTTP errors, p95 below 2 seconds and p99 below 4 seconds; 24 requests per sample are a local regression check, not a production capacity estimate. The JSON report and browser artifacts are saved under `tmp/search-qa/`.


## Product identity extraction

Every new deal first uses local headline rules to extract available brand, model, product type, and variants. Uncertain values are left empty instead of guessed. When enabled, Gemini can enrich these local results for deals that already require the AI processing path.

```env
GEMINI_DEAL_ENRICHMENT_ENABLED=true
```

This variable is the default. An authenticated admin can change the value from the Admin page; that override is stored in MongoDB and takes precedence. Turning it off prevents new ingestion requests from being sent to Gemini while local extraction continues.

The previous `GEMINI_IDENTITY_EXTRACTION_ENABLED` variable and stored admin override remain supported. A single enrichment operation returns normalized text, category, price, identity, and candidate matching. Verified prices/categories and ASIN matches take precedence in application code. Existing API-key failure rotation can retry a failed operation; separate per-task calls are never issued. Clean, complete Amazon deals and inexpensive/fashion deals stay local. Identity uncertainty can trigger the combined operation for eligible deals. Logs record the reason and candidate count.

## Search previews and Redis budget

Default search results and previews prioritize query concept coverage, then show the newest deals within each match group. Coverage recognizes synonyms, one-edit lexical typos (ASCII words of 4–30 letters, first letter preserved), and final word prefixes. For example, S25 Ultra phones rank above newer TVs matching only Ultra; newer S25 Ultra deals rank above older higher-scoring S25 Ultra deals. Shared deterministic relevance and engagement break ties. Explicit price and oldest-first sorts take precedence. Pagination follows the same coverage-then-date ordering.

`GET /api/telegram/search/suggestions?q=` returns up to five recent matching deals, five product names and three categories, respecting category/date/price filters. Atlas autocomplete uses the same search index; run `npm run atlas-search:index` after deploying this definition. Mongo prefix search provides previews while Atlas is unavailable or rebuilding. Deal age means last seen, not verified stock availability.

The navbar debounces previews by 275ms, cancels obsolete requests, and keeps recent searches on the device. On `/deals`, typing updates results after 350ms with history replacement; committing a search pushes a history entry. Browser cache entries last 30 seconds. The mobile search opens a full-width sheet. Empty results offer broader stored-product suggestions and explicit filter removal.

Redis preview payloads expire after 45 seconds. There are at most 256 cache slots, each capped at 12 KiB (3 MiB maximum serialized payload, plus Redis overhead). Fingerprints prevent cache-slot collisions returning another query's results. Popularity retains only 100 terms with a seven-day expiry and at most 128 one-minute selection guards. Only submissions/selections are counted. Popular searches fall back to defaults; unavailable Redis is bypassed with a 350ms read budget and cache writes do not delay results. No new Redis connections are created and no Gemini calls happen during search. Other existing cache usage shares the instance's remaining memory.

### Deal alert email configuration

Deal and keyword alerts use Brevo's HTTPS API. Add these variables to the backend service:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@gmail.com
BREVO_SENDER_NAME=Deals24
PUBLIC_APP_URL=https://deals24.vercel.app
PUBLIC_API_URL=https://your-render-service.onrender.com
```

If the Brevo variables are absent, subscriptions can still be managed but no emails are sent.

## Bot Functionality

The bot automatically filters messages based on the following criteria:
- Messages older than 5 minutes are ignored
- Low-context messages (too short or generic) are filtered
- Duplicate messages are detected via content hashing
- In "sale mode", only profitable product categories are processed

All filtering logic is in the `telegramService.js` file.

## API Endpoints

- `GET /api/telegram/messages` - Get paginated messages
- `GET /api/telegram/messages/:id` - Get a specific message by ID
- `POST /api/telegram/webhook` - Webhook endpoint for Telegram updates
- `GET|POST /api/alerts` - List or create browser-owned alerts
- `PATCH|DELETE /api/alerts/:id` - Pause, resume, update, or remove an alert

## Deployment

For deployment, set the proper environment variables and ensure your server can receive webhook requests from Telegram.
