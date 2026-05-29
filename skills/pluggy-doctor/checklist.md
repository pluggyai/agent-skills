# Coverage map — Pluggy Doctor

This file **does not contain the technical criteria**. The source of truth for what's "correct", the "common mistake", and the "fix" is always **Pluggy's official documentation, queried in real time via the Pluggy MCP** (see `SKILL.md` › "Query the official documentation via the MCP").

This file's job is to guarantee **coverage**: these are the areas every diagnosis must walk through, and the official guide(s) that anchor each one. For each area, search the docs (`search`), read the content (`fetch`), and when you need to validate the shape of an endpoint/payload, use `search-endpoints` / `get-endpoint`.

> **Don't hardcode guide IDs.** The IDs below are known starting points. If a `fetch` by ID fails or comes back empty, run `search` with the suggested terms and use the returned ID. The docs changed; the map doesn't have to break because of it.

---

## Mandatory areas

Every analysis walks through **all** the areas below. Each area becomes one or more ✅/❌/⚠️/➖ lines in the report.

### 1. Credential security
What to assess: `clientId`/`clientSecret` live only in the backend; no hardcoded credentials or anything exposed in the frontend bundle; correct use of `apiKey`/`connectToken`.
- Anchor guide: `pluggy/authentication` — search terms: `authentication`, `clientId clientSecret apiKey`.

### 2. Connect Token and clientUserId
What to assess: correct connect token generation; presence and uniqueness of `clientUserId` (the real end-user id, not a fixed value).
- Anchor guides: `pluggy/authentication`, `pluggy/setup-pluggyconnect-widget-on-your-app` — terms: `connect token clientUserId`, `create connect token`.

### 3. Webhooks — configuration
What to assess: relevant events registered and listened to (`item/created`, `item/updated`, `item/error`; plus the transaction ones `transactions/created|updated|deleted` if the dev consumes transactions).
- Anchor guide: `pluggy/webhooks` — terms: `webhook events`, `item created updated error`.

### 4. Webhooks — correct handling
What to assess: on receiving the event, the code queries the item via API (doesn't assume success); handles `item/error`; checks `executionStatus`/`status`; handles `PARTIAL_SUCCESS` (`statusDetail` + `warnings`); two-way transaction sync (fetch/upsert/delete, not insert-only).
- Anchor guides: `pluggy/webhooks`, `pluggy/setup-two-way-sync-with-webhooks` — terms: `two-way sync`, `executionStatus partial success`, `statusDetail warnings`.

### 5. Health check
What to assess: item status queried via `GET /items/{id}` when needed (typically triggered by a webhook); **no continuous polling** (`setInterval`/loop hitting the API).
- Anchor guides: `pluggy/webhooks`, `pluggy/integration-checklist` — endpoint: validate `GET /items/{id}` via `get-endpoint`.

### 6. Individual processing (no batch)
What to assess: each webhook/event is handled the moment it arrives, not accumulated for batch processing.
- Anchor guide: `pluggy/integration-checklist` — terms: `webhook processing`, `batch`.

### 7. Environment
What to assess: sandbox/sandbox connectors removed from the production path (`includeSandbox`, `sandbox: true`); separate applications/credentials for dev and production.
- Anchor guide: `pluggy/environments-and-configurations` — terms: `sandbox production environment`, `environments configurations`.

---

## Suggested query order

1. Always start with **`pluggy/integration-checklist`** (`search` → `fetch`): it's the official go-live checklist and anchors the "production-ready" verdict.
2. Then go deeper per area using the anchor guides above.
3. For any question about **payload shape, required parameter, or endpoint status**, validate at the source with `search-endpoints` → `get-endpoint` instead of assuming from memory.

## Golden rule
If the official docs diverge from what's written in this map (event names, fields, endpoints), **the docs win**. This file guides coverage; the docs define the criterion.
