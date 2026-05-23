---
name: pluggy-cordova
description: Add the Pluggy Connect Widget to an existing Apache Cordova app (iOS / Android). Use when the user is building or maintaining a Cordova-based hybrid app and needs to embed the Connect Widget, request a connect token from a backend, and receive the onSuccess / onError callbacks.
license: MIT
metadata:
  author: pluggy
  version: "1.0.0"
---

# Pluggy Connect for Apache Cordova

Embed the [Pluggy Connect Widget](https://docs.pluggy.ai/#pluggy-connect-widget) inside an existing Apache Cordova app. This skill assumes the user already has a Cordova project — it does not scaffold a new one.

## When to Apply

Reference these guidelines when the user says any of:

- "Add Pluggy to my Cordova app"
- "Embed the Pluggy Connect Widget in a hybrid app"
- "Integrate Pluggy on iOS/Android via Cordova"
- "My Cordova app needs to launch the Pluggy Connect flow"

Do **not** apply this skill for:

- Native iOS or Android apps (no Cordova) — use the patterns in `pluggy-integration` directly.
- React Native / Expo apps — use [`react-native-pluggy-connect`](https://www.npmjs.com/package/react-native-pluggy-connect) instead.
- Pure web apps — load the CDN script directly without the Cordova-specific guidance.

## Prerequisites

- A Cordova 11+ project (`cordova-ios` ≥ 7.0 / `cordova-android` ≥ 12.0).
- A backend endpoint that issues a Pluggy **connect token** from your Client ID and Client Secret. The Connect Widget must never see your `CLIENT_SECRET`. See [`pluggy-integration`](../pluggy-integration/SKILL.md) for the backend pattern, and the [`vercel-node-connect-token`](https://github.com/pluggyai/quickstart/tree/master/examples/vercel-node-connect-token) example for a minimal Vercel implementation.

## Rule Categories by Priority

| Priority | Category                       | Impact   | Prefix      |
| -------- | ------------------------------ | -------- | ----------- |
| 1        | WebView configuration          | CRITICAL | `cordova-`  |
| 2        | Widget initialization          | CRITICAL | `cordova-`  |
| 3        | Token + data flow              | CRITICAL | `cordova-`  |

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/cordova-webview-config.md
rules/cordova-widget-init.md
rules/cordova-data-flow.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Common pitfalls and how to detect them

## Key Concepts

### Two-token security model

- **API key** (server-side only) — generated from your `CLIENT_ID` + `CLIENT_SECRET`. Never put it in the app bundle.
- **Connect token** (client-side safe) — scoped to a single widget session, exchanged from the API key by your backend. This is the only Pluggy credential the Cordova WebView should ever see.

### Cordova-specific gotchas

- The native bridge fires `deviceready` asynchronously — don't construct the widget before it.
- The WebView's `Content-Security-Policy` blocks `eval` by default, which the widget bundle needs.
- The WebView blocks navigation to external origins by default — the Pluggy connector flow needs `allow-navigation` for `https://*/*` in `config.xml`.

## Production checklist

- [ ] `includeSandbox: false` (or omit the option).
- [ ] CSP only includes the two specific exceptions (`'unsafe-eval'`, `gap:`), not blanket `*`.
- [ ] Widget version is pinned in the `<script src>` URL.
- [ ] Backend endpoint validates the user before issuing a connect token.
- [ ] `item.id` is persisted server-side.
- [ ] Webhook handler in place for `item/updated`.

## See Also

- [`pluggy-integration`](../pluggy-integration/SKILL.md) — backend token endpoint, item lifecycle, webhooks. Read this first if the user hasn't already.
- [`pluggy-open-finance`](../pluggy-open-finance/SKILL.md) — how to consume the data after the connection succeeds.
- [`pluggyai/quickstart`](https://github.com/pluggyai/quickstart) — full backend examples (Vercel, NestJS, AWS SST, Java) that pair with this skill.
- [Pluggy Connect Widget reference](https://docs.pluggy.ai/#pluggy-connect-widget).

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
