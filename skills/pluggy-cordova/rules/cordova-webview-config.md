---
title: Configure the Cordova WebView for Pluggy Connect
impact: CRITICAL
impactDescription: Without these two WebView settings the widget will not open or will land on a blank screen mid-flow
tags: cordova, csp, config.xml, webview, connect-widget
---

## Configure the Cordova WebView for Pluggy Connect

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
