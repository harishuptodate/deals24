# Price History LLD

## Goal

Store one product document and append a price observation whenever the same product appears again. The deal dialog fetches these observations and renders the Recharts price graph.

## Ingestion Flow

1. Telegram calls the webhook with a channel message.
2. Filters reject old, blocked, low-context, duplicate, or unprofitable messages.
3. The backend cleans the text, resolves links/images, and extracts the Amazon ASIN, category, and price.
4. MongoDB is checked first for an exact Amazon ASIN match.
5. An exact Amazon ASIN match is updated immediately without Gemini. An unmatched Amazon deal is also handled locally when its caption passes the local approval/readiness rules.
6. Fashion deals and any deal below `1000` use only local detection and the deterministic database check. They do not call Gemini, including for non-Amazon links.
7. Remaining deals load up to ten same-category candidates from MongoDB and make one Gemini call for caption normalization, category/price extraction, product identity, and candidate selection.
8. A Gemini candidate is accepted only when `sameProduct=true`, the candidate ID exists in the supplied list, and confidence is at least `0.92`. If no candidate is selected, the generated identity key is checked in MongoDB.
9. On a match, the existing `TelegramMessage` is updated and a `DealPriceObservation` is inserted. Otherwise, a new product and its first observation are inserted.

Match methods are `amazon-asin`, `gemini-candidate`, `gemini-identity`, `new`, and `baseline`.

## Gemini Call

There are no Gemini tools or function calls. The backend makes one `models.generateContent` call using `gemini-2.5-flash`. `${PROMPT}` contains the incoming message and up to ten candidate objects with `id`, `text`, `category`, and stored `identity`.

Request body (SDK-level shape):

```json
{
  "model": "gemini-2.5-flash",
  "contents": "${PROMPT}",
  "config": {
    "temperature": 0.1,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 4096,
    "thinkingConfig": {
      "thinkingBudget": 0
    },
    "responseMimeType": "application/json",
    "responseJsonSchema": "${RESPONSE_JSON_SCHEMA}"
  }
}
```

Expected model JSON:

```json
{
  "normalizedMessage": "Samsung Galaxy S25 5G 12GB/256GB @ 64999\nhttps://example.com/deal",
  "category": "mobile-phones",
  "price": "64999",
  "identity": {
    "canonicalName": "Samsung Galaxy S25 5G 12GB 256GB",
    "brand": "Samsung",
    "model": "Galaxy S25 5G",
    "productType": "phone",
    "variant": ["12GB RAM", "256GB"]
  },
  "match": {
    "candidateId": "66f012345678901234567890",
    "sameProduct": true,
    "confidence": 0.97,
    "reason": "Brand, model, RAM and storage are identical."
  }
}
```

For no match, Gemini must return `candidateId: null`, `sameProduct: false`, and an appropriate confidence/reason.

## Fallback Flow

If API keys are missing, Gemini fails, or its JSON is invalid, local processing keeps the cleaned original text, detects the category in-house, and lets the existing price extractor provide the price. No AI identity or candidate match is used; only an earlier ASIN match can update an existing product. Otherwise, a new product is saved.

The previous `Unexpected end of JSON input` error meant Gemini returned empty or truncated JSON. Thinking is now disabled, output capacity is `4096`, and invalid responses log their finish reason before this fallback runs.

## Storage and Read Flow

`DealPriceObservation` stores `productId`, unique Telegram `sourceKey`, `observedAt`, price, link, match method, and confidence. The unique source key contains the channel/message IDs and prevents duplicate webhook observations. Historical summary values are derived from this collection rather than duplicated on the current product document.

Run `npm run migrate:price-history` from `backend` once during deployment. It backfills one baseline observation per legacy product, populates legacy Amazon ASINs, removes obsolete product fields and indexes, and removes the old globally unique `messageId` index.

The deal dialog calls `GET /api/telegram/messages/:id/price-history`. The endpoint returns ordered points plus current, previous, lowest, highest, and percentage-change values. The Recharts component displays each price with its date/time directly in the mobile-friendly dialog; hover is not required.
