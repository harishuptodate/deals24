# Deals24 architecture

This repository uses a layered backend and a page/component frontend. File placement is based on responsibility, not function size.

## Backend

```text
backend/
  controllers/  HTTP validation, status codes, and response shaping
  middleware/   Cross-cutting Express middleware
  models/       Mongoose schemas and indexes
  routes/       URL, middleware, and controller registration only
  services/     Business rules, integrations, and persistence workflows
  scripts/      Operational jobs and one-off migrations
  utils/        Small pure helpers
```

Routes may contain a trivial transport-only callback, such as a static health response. Database access, external integrations, and business decisions do not belong in route modules.

Controllers translate HTTP input into service calls. Reusable workflows and state synchronization belong in services. Models define storage shape but do not own request handling.

Price history follows this boundary:

```text
routes/telegram.ts
  -> controllers/priceHistoryController.ts
    -> services/priceHistoryService.ts
      -> models/DealPriceObservation.ts and models/TelegramMessage.ts
```

## Frontend

```text
src/
  pages/        Route-level composition
  components/   Reusable UI grouped by feature
  hooks/        Reusable state and side-effect logic
  services/     API and browser-service boundaries
  types/        Shared TypeScript contracts
  lib/          Framework-independent helpers
```

Feature-specific UI belongs under a feature folder such as `components/deal` or `components/admin`. Generic design-system primitives remain under `components/ui` and should not import feature code.

Pages may coordinate feature components, but reusable forms, dialogs, charts, and data editors should be extracted into their feature component folder. API calls stay in services rather than components.

The API layer is split by domain under `services/api/`. `services/api.ts` is a compatibility barrel so existing consumers can keep a stable import path while implementations remain focused:

```text
services/api/
  client.ts             Shared Axios configuration and authentication
  dealsApi.ts           Deal, category, click, and analytics requests
  adminApi.ts           Admin logs, posting, and policy requests
  priceHistoryApi.ts    Price-history requests
```

## Change guidelines

- Preserve public API paths unless a versioned migration is planned.
- Keep routes declarative and thin.
- Keep controllers free of reusable business rules.
- Put multi-model consistency logic in a service.
- Add tests beside pure services and utilities; use integration tests for database-backed workflows.
- Avoid reorganizing generated UI primitives solely to reduce file size.
