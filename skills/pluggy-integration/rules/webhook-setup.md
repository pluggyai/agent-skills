---
title: Configure Webhooks for Real-Time Updates
impact: CRITICAL
impactDescription: Webhooks are the primary mechanism for data synchronization
tags: webhook, events, real-time, sync
---

## Configure Webhooks for Real-Time Updates

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
