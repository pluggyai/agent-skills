---
title: Use API Keys Only on Backend
impact: CRITICAL
impactDescription: Exposing API keys in frontend code compromises all user data
tags: authentication, security, api-keys, backend
---

## Use API Keys Only on Backend

API Keys provide full access to user financial data and must never be exposed in frontend code. Use Connect Tokens for frontend operations.

**Incorrect (API key in frontend):**

```typescript
// NEVER do this - exposes credentials in browser
const client = new PluggyClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret', // EXPOSED!
});
```

**Correct (API key on backend only):**

```typescript
// Backend: Create API key and use it server-side
import { PluggyClient } from 'pluggy-sdk';

const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

// Generate connect token for frontend use
app.post('/api/connect-token', async (req, res) => {
  const connectToken = await client.createConnectToken();
  res.json({ accessToken: connectToken.accessToken });
});
```

```typescript
// Frontend: Only use connect token
const response = await fetch('/api/connect-token');
const { accessToken } = await response.json();

// Use accessToken with Connect Widget
```

### Token Comparison

| Token Type    | Expiration | Use Case                    | Data Access |
| ------------- | ---------- | --------------------------- | ----------- |
| API Key       | 2 hours    | Backend data retrieval      | Full        |
| Connect Token | 30 minutes | Frontend Connect Widget     | None        |

Reference: [Pluggy Authentication](https://docs.pluggy.ai/docs/authentication)
