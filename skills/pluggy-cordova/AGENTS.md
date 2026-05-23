# Pluggy Cordova - Complete Guide

This document contains all rules for add the pluggy connect widget to an apache cordova app (ios / android).

> **Generated:** 2026-05-23
> **Total Rules:** 3

## Table of Contents

### CRITICAL

- [Configure the Cordova WebView for Pluggy Connect](#configure-the-cordova-webview-for-pluggy-connect)
- [Initialize the Connect Widget after deviceready](#initialize-the-connect-widget-after-deviceready)
- [Keep the API key off the device, fetch data from your backend](#keep-the-api-key-off-the-device-fetch-data-from-your-backend)

---

## CRITICAL Rules

### Configure the Cordova WebView for Pluggy Connect

**Impact:** CRITICAL

Without these two WebView settings the widget will not open or will land on a blank screen mid-flow

Cordova's WebView ships locked down by default. Two changes are required before the Connect Widget can render and complete its connector flow: relax the Content-Security-Policy to allow the widget bundle, and declare `allow-navigation` for the connector redirect targets.

**Incorrect (defaults that block the widget):**

```xml
<!-- config.xml -->
<widget id="com.example.app" xmlns="http://www.w3.org/ns/widgets">
  <name>My App</name>
  <content src="index.html" />
  <!-- no allow-navigation — WebView blocks connector redirects -->
</widget>
```

```html
<!-- index.html — default Cordova CSP from `cordova create` -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval';
               style-src 'self' 'unsafe-inline';
               media-src *">
<!-- This blocks https://*.pluggy.ai as an origin and breaks the widget. -->
```

**Correct:**

```xml
<!-- config.xml -->
<widget id="com.example.app" xmlns="http://www.w3.org/ns/widgets">
  <name>My App</name>
  <content src="index.html" />

  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />
  <!-- Required: the Pluggy connector flow redirects through bank
       and IdP domains the WebView would otherwise block. -->
  <allow-navigation href="https://*/*" />
</widget>
```

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' data: gap: https://ssl.gstatic.com https://*.pluggy.ai 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  media-src *;
">
```

### Why each exception is required

| Exception          | Why                                                                           |
| ------------------ | ----------------------------------------------------------------------------- |
| `'unsafe-eval'`    | The CDN widget bundle evaluates inline code at runtime.                       |
| `gap:`             | Cordova's native ↔ JS bridge uses the `gap:` scheme.                          |
| `https://*.pluggy.ai` | The widget loads connector logos and OAuth-style flows from `*.pluggy.ai`. |

Do **not** drop CSP entirely or change `default-src` to `*`. The two narrow allowances above are the minimum the widget needs.

### How to detect a misconfiguration

| Symptom                              | Root cause                                                 |
| ------------------------------------ | ---------------------------------------------------------- |
| Widget never opens; blank WebView mid-flow. | Missing `allow-navigation href="https://*/*"`.      |
| Console: `Refused to evaluate a string as JavaScript`. | CSP missing `'unsafe-eval'`.                 |
| Connector logos broken; widget partly renders.         | CSP missing `https://*.pluggy.ai` in `default-src`. |

Reference: [Cordova WebView Engine](https://cordova.apache.org/docs/en/latest/guide/appdev/whitelist/index.html), [Pluggy Connect Widget](https://docs.pluggy.ai/#pluggy-connect-widget)


---

### Initialize the Connect Widget after deviceready

**Impact:** CRITICAL

Constructing PluggyConnect before the native bridge is up silently fails on real devices

The Cordova bridge fires a `deviceready` event when the native side is up and `cordova.platformId` is populated. Constructing `PluggyConnect` (or calling `fetch`) before that event sometimes works in the desktop browser but fails on real devices.

Pin the widget version in the CDN URL so a CDN update doesn't silently change behaviour mid-deploy.

**Incorrect (race against the bridge, unpinned CDN):**

```html
<!-- index.html -->
<script src="https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js"></script>
<script>
  // Runs before `deviceready` — cordova.platformId is undefined,
  // and fetch may not be wired up to the native HTTP stack yet.
  const pc = new PluggyConnect({ connectToken: '???' });
  pc.init();
</script>
<script src="cordova.js"></script>
```

**Correct:**

```html
<!-- index.html -->
<script src="cordova.js"></script>
<!-- Pin the widget version. Bump it intentionally after reading the
     release notes; don't track `latest`. -->
<script src="https://cdn.pluggy.ai/pluggy-connect/v2.3.1/pluggy-connect.js"></script>
<script src="js/index.js"></script>
```

```js
// js/index.js
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
  // Fetch a connect token from YOUR backend, then construct the widget.
  fetch('https://your-backend.example.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      options: { clientUserId: currentUserId() },
    }),
  })
    .then((r) => r.json())
    .then(({ accessToken }) => {
      const pluggyConnect = new PluggyConnect({
        connectToken: accessToken,
        includeSandbox: true, // remove in production

        onSuccess: (itemData) => {
          // See cordova-data-flow for what to do with itemData.item.id.
          console.log('Pluggy Connect success', itemData);
        },

        onError: (error) => {
          console.error('Pluggy Connect error', error);
        },
      });

      pluggyConnect.init();
    });
}
```

### Script ordering rules

1. `cordova.js` first — it installs the bridge and the `deviceready` listener.
2. The pinned Pluggy Connect bundle next — so `PluggyConnect` is defined before your app code runs.
3. Your own JS last — and it must wait on `deviceready` before touching either of the above.

### How to detect a misconfiguration

| Symptom                                            | Root cause                                         |
| -------------------------------------------------- | -------------------------------------------------- |
| `PluggyConnect is not defined`.                    | CDN script ordered before `cordova.js` is loaded, or your JS runs before the CDN script.       |
| Widget opens in browser but does nothing on device. | Initialization happens before `deviceready` — only the browser hands you a fully populated environment up front. |
| Widget behaviour changed after a quiet day.        | CDN URL points at `latest` instead of a pinned version. Pin and bump intentionally.                |

Reference: [Cordova deviceready event](https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready), [Pluggy Connect Widget](https://docs.pluggy.ai/#pluggy-connect-widget)


---

### Keep the API key off the device, fetch data from your backend

**Impact:** CRITICAL

Shipping the Pluggy CLIENT_SECRET in the app bundle leaks every user's data

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

---

## Quick Reference

| Rule | Impact | Tags |
| ---- | ------ | ---- |
| Configure the Cordova WebView for Pluggy Connect | CRITICAL | cordova, csp, config.xml, webview, connect-widget |
| Initialize the Connect Widget after deviceready | CRITICAL | cordova, deviceready, connect-widget, initialization |
| Keep the API key off the device, fetch data from your backend | CRITICAL | cordova, security, api-key, connect-token, webhooks |
