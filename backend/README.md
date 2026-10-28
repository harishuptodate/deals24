
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

Deal search uses the `deal_search_atlas_v1` Atlas Search index as its primary search engine. If Atlas Search is unavailable or the index is still building, the backend automatically retries the request with the existing MongoDB text index.

Create or update the Atlas Search index after configuring `MONGODB_URI`:

```bash
npm run atlas-search:index
```

The command is safe to rerun. It updates the existing index definition and waits until Atlas reports that the index is queryable.

## Product identity extraction

Every new deal first uses local headline rules to extract available brand, model, product type, and variants. Uncertain values are left empty instead of guessed. When enabled, Gemini can enrich these local results for deals that already require the AI processing path.

```env
GEMINI_DEAL_ENRICHMENT_ENABLED=true
```

This variable is the default. An authenticated admin can change the value from the Admin page; that override is stored in MongoDB and takes precedence. Turning it off prevents new ingestion requests from being sent to Gemini while local extraction continues.

The previous `GEMINI_IDENTITY_EXTRACTION_ENABLED` variable and stored admin override remain supported. A single enrichment operation returns normalized text, category, price, identity, and candidate matching. Verified prices/categories and ASIN matches take precedence in application code. Existing API-key failure rotation can retry a failed operation; separate per-task calls are never issued. Clean, complete Amazon deals and inexpensive/fashion deals stay local. Identity uncertainty can trigger the combined operation for eligible deals. Logs record the reason and candidate count.

## Search previews and Redis budget

Default search results and previews prioritize query concept coverage, then show the newest deals within each match group. For example, S25 Ultra phones rank above newer TVs matching only Ultra; newer S25 Ultra deals rank above older higher-scoring S25 Ultra deals. Text relevance and engagement break ties in full results. Explicit price and oldest-first sorts take precedence. Pagination follows the same coverage-then-date ordering.

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
