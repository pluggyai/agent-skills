---
title: Initialize the Connect Widget after deviceready
impact: CRITICAL
impactDescription: Constructing PluggyConnect before the native bridge is up silently fails on real devices
tags: cordova, deviceready, connect-widget, initialization
---

## Initialize the Connect Widget after deviceready

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
