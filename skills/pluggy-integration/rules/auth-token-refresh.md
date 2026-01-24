---
title: Implement Token Refresh Before Expiration
impact: CRITICAL
impactDescription: Expired tokens cause API failures and poor user experience
tags: authentication, token-refresh, api-keys
---

## Implement Token Refresh Before Expiration

API Keys expire after 2 hours. Implement proactive token refresh to avoid request failures.

**Incorrect (no token refresh):**

```typescript
// Token created once, never refreshed
const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

// Will fail after 2 hours
const accounts = await client.fetchAccounts(itemId);
```

**Correct (automatic refresh with SDK):**

```typescript
import { PluggyClient } from 'pluggy-sdk';

// SDK handles token refresh automatically
const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

// SDK refreshes token as needed
const accounts = await client.fetchAccounts(itemId);
```

**Correct (manual refresh for custom implementations):**

```typescript
class PluggyService {
  private apiKey: string | null = null;
  private expiresAt: Date | null = null;

  async getApiKey(): Promise<string> {
    // Refresh 5 minutes before expiration
    const bufferMs = 5 * 60 * 1000;

    if (!this.apiKey || !this.expiresAt ||
        Date.now() > this.expiresAt.getTime() - bufferMs) {
      await this.refreshToken();
    }

    return this.apiKey!;
  }

  private async refreshToken(): Promise<void> {
    const response = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.PLUGGY_CLIENT_ID,
        clientSecret: process.env.PLUGGY_CLIENT_SECRET,
      }),
    });

    const { apiKey } = await response.json();
    this.apiKey = apiKey;
    this.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }
}
```

Reference: [Pluggy Authentication](https://docs.pluggy.ai/docs/authentication)
