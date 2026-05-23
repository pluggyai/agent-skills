---
title: Keep the API key off the device, fetch data from your backend
impact: CRITICAL
impactDescription: Shipping the Pluggy CLIENT_SECRET in the app bundle leaks every user's data
tags: cordova, security, api-key, connect-token, webhooks
---

## Keep the API key off the device, fetch data from your backend

The Cordova WebView is the user's device — anything bundled into `www/` is recoverable by anyone with the IPA / APK. The Pluggy `CLIENT_SECRET` and the long-lived API key derived from it must never ship there. The widget only needs a short-lived **connect token**, which your backend exchanges for the user.

Once the widget fires `onSuccess`, the Item ID belongs to your backend, not the device. Fetch the user's accounts, transactions, investments, etc. from your own server using the API key — never from JavaScript in the WebView.

**Incorrect (CLIENT_SECRET in the bundle, data fetched from device):**

```js
// js/index.js — SHIPS THE SECRET TO EVERY USER
const CLIENT_ID = 'abcdef-1234-5678';
const CLIENT_SECRET = 'super-secret-string';  // visible in the IPA/APK

fetch('https://api.pluggy.ai/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
})
  .then((r) => r.json())
  .then(({ apiKey }) => {
    // Even worse — fetching transactions straight from the device.
    return fetch(`https://api.pluggy.ai/items/${itemId}/transactions`, {
      headers: { 'X-API-KEY': apiKey },
    });
  });
```

**Correct (device only ever sees a connect token; data flows through your backend):**

```js
// js/index.js
function onSuccess(itemData) {
  // 1. Tell YOUR backend a new item exists. The backend persists
  //    item.id against the authenticated user.
  return fetch('https://your-backend.example.com/api/pluggy/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentUserSessionToken()}`,
    },
    body: JSON.stringify({ itemId: itemData.item.id }),
  });
}
```

```js
// Backend (Node example) — uses the API key, not the connect token.
import { PluggyClient } from 'pluggy-sdk';

const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,      // server-side only
  clientSecret: process.env.PLUGGY_CLIENT_SECRET, // server-side only
});

export async function registerItem(userId, itemId) {
  await db.items.insert({ userId, itemId });
  // Don't fetch transactions here — subscribe to the
  // item/updated webhook and fetch when initial sync finishes.
}
```

### Connect token vs API key

| Token type         | Where it lives  | TTL     | Allowed to call                                    |
| ------------------ | --------------- | ------- | -------------------------------------------------- |
| **API key**        | Backend only    | 2 hours | Anything (`/items`, `/transactions`, `/accounts`)  |
| **Connect token**  | Cordova WebView | 30 min  | The Connect Widget only                            |

### The flow after `onSuccess`

1. `onSuccess({ item })` fires in the WebView.
2. WebView posts `item.id` to your backend.
3. Backend persists `{ userId, itemId }`.
4. Backend subscribes to the `item/updated` webhook (one-time setup, not per-item).
5. When the webhook fires for this item, the backend pulls fresh data using the API key.
6. The Cordova app reads the synced data from **your** backend, not from `api.pluggy.ai`.

### How to detect a misconfiguration

| Symptom                                                                | Root cause                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `strings` over the IPA/APK shows `pluggy_client_secret=...`.            | Secret bundled with the app. Rotate it in the dashboard immediately, then move the flow to the backend. |
| Connect token call works in browser but fails in the device.            | The backend's CORS policy doesn't allow the Cordova `file://` / `null` origin. Allow it, or use a Cordova HTTP plugin. |
| `onSuccess` fires but the app never sees transactions.                  | Code is trying to read data from the device. Move the fetch to the backend, gated on the `item/updated` webhook. |
| App keeps polling Pluggy for fresh data.                                | No webhook subscribed. Set up `item/updated`; Pluggy already auto-syncs every 8–24h server-side. |

Reference: [Pluggy Authentication](https://docs.pluggy.ai/docs/authentication), [Pluggy Webhooks](https://docs.pluggy.ai/docs/webhooks)
