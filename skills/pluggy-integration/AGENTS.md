# Pluggy Integration - Complete Guide

This document contains all rules for core pluggy integration patterns and best practices.

> **Generated:** 2026-01-24
> **Total Rules:** 9

## Table of Contents

### CRITICAL

- [Configure Webhooks for Real-Time Updates](#configure-webhooks-for-real-time-updates)
- [Implement Token Refresh Before Expiration](#implement-token-refresh-before-expiration)
- [Integrate Connect Widget Properly](#integrate-connect-widget-properly)
- [Use API Keys Only on Backend](#use-api-keys-only-on-backend)

### HIGH

- [Delete Items When Users Revoke Consent](#delete-items-when-users-revoke-consent)
- [Manage Item Lifecycle Correctly](#manage-item-lifecycle-correctly)
- [Use Connect Token with Item ID for Updates](#use-connect-token-with-item-id-for-updates)

### MEDIUM

- [Handle API Errors Gracefully](#handle-api-errors-gracefully)
- [Handle MFA Flows Correctly](#handle-mfa-flows-correctly)

---

## CRITICAL Rules

### Configure Webhooks for Real-Time Updates

**Impact:** CRITICAL

Webhooks are the primary mechanism for data synchronization

**Webhooks are essential for proper Pluggy integration.** Pluggy automatically syncs Items (connections) on a schedule. When a sync completes, Pluggy notifies you via webhook—this is when you should fetch and store data.

**Key Principle:** Connection sync is handled by Pluggy. Data sync to your database is triggered by webhooks.

**Incorrect (polling for updates):**

```typescript
// Wrong: Inefficient polling wastes resources
async function checkForUpdates(itemId: string) {
  while (true) {
    const item = await client.fetchItem(itemId);
    if (item.status === 'UPDATED') {
      await syncData(itemId);
      break;
    }
    await sleep(5000); // Wasteful
  }
}
```

**Correct (webhook-based updates):**

```typescript
// 1. Register webhook via webhookUrl in connect token (recommended)
const connectToken = await client.createConnectToken({
  webhookUrl: 'https://your-app.com/api/webhooks/pluggy',
  clientUserId: userId,
});

// Or register via API for all events
const webhook = await client.createWebhook({
  event: 'all',
  url: 'https://your-app.com/api/webhooks/pluggy',
});
```

```typescript
// 2. Handle webhook in your backend
// pages/api/webhooks/pluggy.ts (Next.js example)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Respond quickly (within 5 seconds) - process async
  res.status(200).json({ received: true });

  const { event, eventId, itemId, error, triggeredBy } = req.body;

  // Queue for background processing
  await webhookQueue.add({
    event,
    eventId,
    itemId,
    error,
    triggeredBy,
  });
}

// Background worker
async function processWebhook(data: WebhookPayload) {
  const { event, itemId, error, accountId, transactionIds, createdTransactionsLink } = data;

  switch (event) {
    // Item events - sync entity data (accounts, investments, etc.)
    case 'item/created':
    case 'item/updated':
      await syncEntityData(itemId);
      break;

    case 'item/error':
      await handleItemError(itemId, error);
      break;

    case 'item/waiting_user_input':
      await notifyUserMFARequired(itemId);
      break;

    case 'item/deleted':
      await cleanupLocalData(itemId);
      break;

    // Transaction events - handle separately from item events
    case 'transactions/created':
      // Use the createdTransactionsLink to fetch new transactions
      await syncNewTransactions(createdTransactionsLink);
      break;

    case 'transactions/updated':
      // Refetch specific transactions that were modified
      await updateTransactions(transactionIds);
      break;

    case 'transactions/deleted':
      // Delete specific transactions from your database
      await deleteTransactions(transactionIds);
      break;
  }
}

// Fetch new transactions using the webhook-provided link
async function syncNewTransactions(createdTransactionsLink: string) {
  const response = await fetch(createdTransactionsLink, {
    headers: { 'X-API-KEY': process.env.PLUGGY_API_KEY },
  });
  const { results } = await response.json();
  await db.transactions.createMany(results);
}

// Refetch and update specific transactions
async function updateTransactions(transactionIds: string[]) {
  for (const id of transactionIds) {
    const transaction = await client.fetchTransaction(id);
    await db.transactions.upsert({
      where: { id },
      update: transaction,
      create: transaction,
    });
  }
}

// Delete specific transactions
async function deleteTransactions(transactionIds: string[]) {
  await db.transactions.deleteMany({
    where: { id: { in: transactionIds } },
  });
}
```

### Data Events

| Event | Triggered When |
| ----- | -------------- |
| `item/created` | Item successfully connected |
| `item/updated` | Item synced successfully |
| `item/deleted` | Item removed |
| `item/error` | Execution errors encountered |
| `item/waiting_user_input` | Awaiting user action (MFA) |
| `item/login_succeeded` | Provider login completed |
| `connector/status_updated` | Connector status changed (ONLINE/UNSTABLE/OFFLINE) |
| `transactions/deleted` | Transactions removed after merge |
| `transactions/created` | New transactions available |
| `transactions/updated` | Transactions modified after merge |

### Payment Events

| Event | Triggered When |
| ----- | -------------- |
| `payment_intent/created` | Payment intent initiated |
| `payment_intent/completed` | Payment completed successfully |
| `payment_intent/error` | Payment flow error |
| `scheduled_payment/created` | Scheduled payment authorized |
| `scheduled_payment/completed` | Single payment executed |
| `scheduled_payment/error` | Payment failed |
| `smart_transfer_preauthorization/completed` | Preauthorization approved |
| `smart_transfer_payment/completed` | Transfer completed |

### Webhook Payload Structure

```typescript
// Item events payload
interface ItemWebhookPayload {
  event: string;
  eventId: string;
  itemId: string;
  triggeredBy: 'USER' | 'CLIENT' | 'SYNC' | 'INTERNAL';
  clientUserId?: string;
  error?: {
    code: string;
    message: string;
    parameter?: string;
  };
}

// Transaction events payload
interface TransactionWebhookPayload {
  event: string;
  eventId: string;
  itemId: string;
  accountId: string;
  transactionIds?: string[];
  transactionsCreatedAtFrom?: string;
  createdTransactionsLink?: string;
}
```

### Retry Policy

Pluggy retries failed webhook deliveries:
- **Initial**: 3 consecutive attempts
- **After 1 hour**: 3 more attempts
- **After 2 hours**: 3 final attempts
- **Total**: Up to 9 delivery attempts

A delivery is considered failed if:
- Response status is not 2XX
- Response takes longer than 5 seconds

### Best Practices

1. **Respond quickly**: Return 200 within 5 seconds
2. **Process async**: Queue heavy work for background processing
3. **Idempotency**: Use `eventId` to handle duplicate deliveries
4. **Fetch fresh data**: After receiving webhook, call `GET /items/{id}` for latest state

### Important: Do NOT Poll or Batch Update

Pluggy auto-syncs Items every 24/12/8 hours. You should:

- ✅ Wait for `item/updated` webhook to sync data
- ✅ Show `nextAutoSyncAt` to users for transparency
- ❌ Do NOT poll Items for status changes
- ❌ Do NOT implement batch updates for Items
- ❌ Do NOT trigger `updateItem` on a schedule

Reference: [Webhooks](https://docs.pluggy.ai/docs/webhooks)


---

### Implement Token Refresh Before Expiration

**Impact:** CRITICAL

Expired tokens cause API failures and poor user experience

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


---

### Integrate Connect Widget Properly

**Impact:** CRITICAL

Incorrect widget setup blocks user account connections

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


---

### Use API Keys Only on Backend

**Impact:** CRITICAL

Exposing API keys in frontend code compromises all user data

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

## HIGH Rules

### Delete Items When Users Revoke Consent

**Impact:** HIGH

Failing to delete Items violates user consent and data regulations

When users disconnect their accounts or revoke consent, delete the corresponding Item to comply with data protection regulations (LGPD, GDPR).

**Incorrect (keeping Item after user requests deletion):**

```typescript
// Wrong: Just marking as "disconnected" in your database
await db.items.update({
  where: { itemId },
  data: { status: 'disconnected' },
});
// Item still exists in Pluggy, data still accessible
```

**Correct (delete Item from Pluggy):**

```typescript
app.delete('/api/connections/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify ownership
    const connection = await db.connections.findFirst({
      where: { itemId, userId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // 2. Delete from Pluggy (removes all associated data)
    await client.deleteItem(itemId);

    // 3. Remove from your database
    await db.connections.delete({
      where: { id: connection.id },
    });

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Failed to delete connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});
```

**Handling deletion in bulk (user account deletion):**

```typescript
async function deleteUserData(userId: string) {
  // Get all user connections
  const connections = await db.connections.findMany({
    where: { userId },
  });

  // Delete each Item from Pluggy
  const deletionPromises = connections.map(async (conn) => {
    try {
      await client.deleteItem(conn.itemId);
    } catch (error) {
      // Log but continue - Item may already be deleted
      console.error(`Failed to delete Item ${conn.itemId}:`, error);
    }
  });

  await Promise.all(deletionPromises);

  // Clean up local database
  await db.connections.deleteMany({
    where: { userId },
  });
}
```

### What Gets Deleted

When you delete an Item, Pluggy removes:

- All account data
- All transaction history
- All investment data
- All identity information
- All loan data
- The connection itself

Reference: [Deleting Items](https://docs.pluggy.ai/docs/item)


---

### Manage Item Lifecycle Correctly

**Impact:** HIGH

Proper lifecycle management ensures data accuracy and consent compliance

Items represent connections to financial institutions. Understanding and managing their lifecycle is essential for reliable data access.

**Item Status Flow:**

```
CREATING → UPDATING → UPDATED
                   ↘ LOGIN_ERROR
                   ↘ WAITING_USER_INPUT
                   ↘ OUTDATED
```

**Incorrect (ignoring status):**

```typescript
// Wrong: Assuming item is always ready
const item = await client.fetchItem(itemId);
const accounts = await client.fetchAccounts(itemId);
// May fail or return stale data
```

**Correct (check status before fetching data):**

```typescript
async function getItemData(itemId: string) {
  const item = await client.fetchItem(itemId);

  switch (item.status) {
    case 'UPDATED':
      // Item is ready, fetch data
      return await fetchAllData(itemId);

    case 'UPDATING':
      // Sync in progress, wait or poll
      console.log('Sync in progress, please wait...');
      return null;

    case 'LOGIN_ERROR':
    case 'INVALID_CREDENTIALS':
      // Credentials issue, prompt user to reconnect
      throw new Error('Please update your credentials');

    case 'WAITING_USER_INPUT':
      // MFA required
      throw new Error('MFA verification required');

    case 'OUTDATED':
      // Trigger new sync
      await client.updateItem(itemId);
      return null;

    default:
      throw new Error(`Unknown status: ${item.status}`);
  }
}

async function fetchAllData(itemId: string) {
  const [accounts, transactions, investments] = await Promise.all([
    client.fetchAccounts(itemId),
    client.fetchTransactions(itemId),
    client.fetchInvestments(itemId),
  ]);

  return { accounts, transactions, investments };
}
```

**Polling for status changes:**

```typescript
async function waitForItemReady(itemId: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const item = await client.fetchItem(itemId);

    if (item.status === 'UPDATED') {
      return true;
    }

    if (['LOGIN_ERROR', 'INVALID_CREDENTIALS'].includes(item.status)) {
      return false;
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false;
}
```

### Item Properties

| Property          | Description                              |
| ----------------- | ---------------------------------------- |
| `id`              | Unique item identifier                   |
| `status`          | Current sync status                      |
| `executionStatus` | Detailed execution state                 |
| `connector`       | Financial institution info               |
| `createdAt`       | When connection was created              |
| `updatedAt`       | Last successful sync                     |
| `lastUpdatedAt`   | Last sync attempt (successful or not)    |

Reference: [Item Lifecycle](https://docs.pluggy.ai/docs/item)


---

### Use Connect Token with Item ID for Updates

**Impact:** HIGH

Correct token setup enables credential updates without re-authentication

When a connection needs credential updates (expired password, MFA required), generate a connect token with the existing Item ID to allow seamless re-authentication.

**Incorrect (creating new connection instead of updating):**

```typescript
// Wrong: Creates a new Item instead of updating existing one
const connectToken = await client.createConnectToken();

// User has to reconnect from scratch
<PluggyConnect connectToken={connectToken} />
```

**Correct (update existing Item):**

```typescript
// Backend: Generate connect token for specific Item
app.post('/api/pluggy/connect-token/:itemId', async (req, res) => {
  const { itemId } = req.params;

  // Pass itemId to update existing connection
  const connectToken = await client.createConnectToken(itemId);

  res.json({ accessToken: connectToken.accessToken });
});
```

```typescript
// Frontend: Use token to update credentials
function UpdateConnection({ itemId }: { itemId: string }) {
  const [connectToken, setConnectToken] = useState<string | null>(null);

  useEffect(() => {
    async function getUpdateToken() {
      const response = await fetch(`/api/pluggy/connect-token/${itemId}`);
      const { accessToken } = await response.json();
      setConnectToken(accessToken);
    }
    getUpdateToken();
  }, [itemId]);

  if (!connectToken) return <div>Loading...</div>;

  return (
    <PluggyConnect
      connectToken={connectToken}
      onSuccess={() => {
        console.log('Credentials updated successfully');
      }}
    />
  );
}
```

### When to Update an Item

| Status Code             | Meaning                    | Action Required      |
| ----------------------- | -------------------------- | -------------------- |
| `LOGIN_ERROR`           | Invalid credentials        | Update credentials   |
| `WAITING_USER_INPUT`    | MFA required               | Send MFA response    |
| `OUTDATED`              | Data is stale              | Trigger sync         |
| `INVALID_CREDENTIALS`   | Password changed           | Update credentials   |

Reference: [Updating an Item](https://docs.pluggy.ai/docs/updating-an-item)

## MEDIUM Rules

### Handle API Errors Gracefully

**Impact:** MEDIUM

Proper error handling improves user experience and debugging

Pluggy API returns specific error codes. Handle them appropriately to provide good user experience and enable debugging.

**Incorrect (generic error handling):**

```typescript
// Wrong: Loses valuable error information
try {
  await client.fetchAccounts(itemId);
} catch (error) {
  console.log('Something went wrong');
}
```

**Correct (specific error handling):**

```typescript
import { PluggyClient, PluggyError } from 'pluggy-sdk';

async function fetchAccountsWithErrorHandling(itemId: string) {
  try {
    return await client.fetchAccounts(itemId);
  } catch (error) {
    if (error instanceof PluggyError) {
      switch (error.code) {
        case 'ITEM_NOT_FOUND':
          throw new Error('Connection not found. Please reconnect your account.');

        case 'INVALID_API_KEY':
          // Log for debugging, don't expose to user
          console.error('API key invalid or expired');
          throw new Error('Authentication error. Please try again.');

        case 'RATE_LIMIT_EXCEEDED':
          // Implement exponential backoff
          await sleep(1000);
          return fetchAccountsWithErrorHandling(itemId);

        case 'ITEM_LOGIN_ERROR':
          throw new Error('Bank credentials have changed. Please update your connection.');

        case 'CONNECTOR_UNAVAILABLE':
          throw new Error('Bank is temporarily unavailable. Please try again later.');

        default:
          console.error('Pluggy error:', error.code, error.message);
          throw new Error('Unable to fetch accounts. Please try again.');
      }
    }

    // Unknown error
    console.error('Unexpected error:', error);
    throw new Error('An unexpected error occurred.');
  }
}
```

**HTTP status code handling:**

```typescript
async function handlePluggyResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  const error = await response.json();

  switch (response.status) {
    case 400:
      // Bad request - invalid parameters
      throw new ValidationError(error.message);

    case 401:
      // Unauthorized - invalid or expired API key
      await refreshApiKey();
      throw new AuthError('Please retry the request');

    case 403:
      // Forbidden - insufficient permissions
      throw new PermissionError('Access denied');

    case 404:
      // Not found - Item or resource doesn't exist
      throw new NotFoundError(error.message);

    case 429:
      // Rate limited
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(`Rate limited. Retry after ${retryAfter}s`);

    case 500:
    case 502:
    case 503:
      // Server error - retry with backoff
      throw new ServerError('Pluggy service temporarily unavailable');

    default:
      throw new Error(`API error: ${response.status}`);
  }
}
```

### Common Error Codes

| Code                    | Meaning                         | User Action              |
| ----------------------- | ------------------------------- | ------------------------ |
| `INVALID_CREDENTIALS`   | Wrong username/password         | Update credentials       |
| `WAITING_USER_INPUT`    | MFA required                    | Complete MFA             |
| `CONNECTOR_UNAVAILABLE` | Bank API down                   | Wait and retry           |
| `ITEM_NOT_FOUND`        | Item was deleted                | Reconnect account        |
| `RATE_LIMIT_EXCEEDED`   | Too many requests               | Implement backoff        |
| `INVALID_API_KEY`       | API key expired/invalid         | Refresh token            |

Reference: [Error Codes](https://docs.pluggy.ai/docs/errors-codes)


---

### Handle MFA Flows Correctly

**Impact:** MEDIUM

Proper MFA handling enables users to complete authentication

Some banks require Multi-Factor Authentication (MFA). When an Item enters `WAITING_USER_INPUT` status, you need to collect and submit the MFA response.

**Incorrect (ignoring MFA requirement):**

```typescript
// Wrong: Not handling MFA status
const item = await client.fetchItem(itemId);
if (item.status !== 'UPDATED') {
  throw new Error('Item not ready');
  // User can never complete MFA!
}
```

**Correct (handle MFA flow):**

```typescript
async function checkItemAndHandleMFA(itemId: string) {
  const item = await client.fetchItem(itemId);

  if (item.status === 'WAITING_USER_INPUT' && item.parameter) {
    // Return MFA requirements to frontend
    return {
      needsMFA: true,
      mfaParameter: {
        name: item.parameter.name,
        label: item.parameter.label,
        type: item.parameter.type, // 'text', 'password', 'select', etc.
        options: item.parameter.options, // For select type
      },
    };
  }

  if (item.status === 'UPDATED') {
    return { needsMFA: false, ready: true };
  }

  return { needsMFA: false, ready: false, status: item.status };
}
```

```typescript
// API endpoint to submit MFA response
app.post('/api/items/:itemId/mfa', async (req, res) => {
  const { itemId } = req.params;
  const { mfaValue } = req.body;

  try {
    // Submit MFA response to Pluggy
    await client.updateItemMFA(itemId, {
      parameter: mfaValue,
    });

    res.json({ success: true, message: 'MFA submitted' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid MFA response' });
  }
});
```

```typescript
// Frontend: MFA input component
function MFAInput({ itemId, parameter, onComplete }) {
  const [value, setValue] = useState('');

  const handleSubmit = async () => {
    const response = await fetch(`/api/items/${itemId}/mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaValue: value }),
    });

    if (response.ok) {
      onComplete();
    }
  };

  return (
    <div>
      <label>{parameter.label}</label>
      {parameter.type === 'select' ? (
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          {parameter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={parameter.type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### MFA Parameter Types

| Type       | Description                    | UI Component          |
| ---------- | ------------------------------ | --------------------- |
| `text`     | Free text input                | Text input            |
| `password` | Hidden input                   | Password input        |
| `number`   | Numeric code                   | Number input          |
| `select`   | Choose from options            | Select dropdown       |

Reference: [MFA Handling](https://docs.pluggy.ai/docs/item)

---

## Quick Reference

| Rule | Impact | Tags |
| ---- | ------ | ---- |
| Configure Webhooks for Real-Time Updates | CRITICAL | webhook, events, real-time, sync |
| Implement Token Refresh Before Expiration | CRITICAL | authentication, token-refresh, api-keys |
| Integrate Connect Widget Properly | CRITICAL | connect-widget, frontend, react, integration |
| Use API Keys Only on Backend | CRITICAL | authentication, security, api-keys, backend |
| Delete Items When Users Revoke Consent | HIGH | item, delete, consent, gdpr, lgpd |
| Manage Item Lifecycle Correctly | HIGH | item, lifecycle, status, sync |
| Use Connect Token with Item ID for Updates | HIGH | connect-widget, item-update, reconnection |
| Handle API Errors Gracefully | MEDIUM | errors, error-handling, api, troubleshooting |
| Handle MFA Flows Correctly | MEDIUM | mfa, authentication, user-input, security |
