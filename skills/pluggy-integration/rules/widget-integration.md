---
title: Integrate Connect Widget Properly
impact: CRITICAL
impactDescription: Incorrect widget setup blocks user account connections
tags: connect-widget, frontend, react, integration
---

## Integrate Connect Widget Properly

The Connect Widget is the primary way users connect their financial accounts. Proper integration ensures a smooth user experience.

**Incorrect (missing token or wrong configuration):**

```typescript
// Missing connect token
<PluggyConnect
  onSuccess={(itemData) => console.log(itemData)}
/>

// Using API key instead of connect token
<PluggyConnect
  connectToken={apiKey} // WRONG - this is API key
  onSuccess={(itemData) => console.log(itemData)}
/>
```

**Correct (React integration):**

```typescript
import { useState, useEffect } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';

function ConnectAccount() {
  const [connectToken, setConnectToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch connect token from your backend
    async function getToken() {
      const response = await fetch('/api/pluggy/connect-token');
      const { accessToken } = await response.json();
      setConnectToken(accessToken);
    }
    getToken();
  }, []);

  const handleSuccess = async (itemData: { item: { id: string } }) => {
    // Send item ID to backend for data retrieval
    await fetch('/api/pluggy/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: itemData.item.id }),
    });
  };

  const handleError = (error: { message: string; code: string }) => {
    console.error('Connection failed:', error.message);
    // Handle error appropriately
  };

  if (!connectToken) return <div>Loading...</div>;

  return (
    <PluggyConnect
      connectToken={connectToken}
      onSuccess={handleSuccess}
      onError={handleError}
      onClose={() => console.log('Widget closed')}
    />
  );
}
```

**Backend endpoint to generate connect token:**

```typescript
// pages/api/pluggy/connect-token.ts (Next.js example)
import { PluggyClient } from 'pluggy-sdk';

const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID!,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
});

export default async function handler(req, res) {
  try {
    const connectToken = await client.createConnectToken();
    res.json({ accessToken: connectToken.accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create connect token' });
  }
}
```

### Widget Callbacks

| Callback    | When Called                          | Data Provided          |
| ----------- | ------------------------------------ | ---------------------- |
| `onSuccess` | User successfully connects account   | `{ item: { id } }`     |
| `onError`   | Connection fails                     | `{ message, code }`    |
| `onClose`   | User closes widget                   | None                   |
| `onOpen`    | Widget opens                         | None                   |

Reference: [Connect Widget](https://docs.pluggy.ai/docs/connect-widget)
