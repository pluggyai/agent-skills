---
title: Implement Proper Sync Strategy
impact: HIGH
impactDescription: Proper sync strategy ensures data freshness without unnecessary API calls
tags: sync, webhooks, auto-sync, data-retrieval
---

## Implement Proper Sync Strategy

Pluggy handles connection synchronization automatically. Your responsibility is to sync data to your database when Pluggy notifies you via webhooks.

**Key Principle:** Separate **connection sync** (handled by Pluggy) from **data sync** (your responsibility via webhooks).

---

## Connection Sync (Pluggy's Responsibility)

Pluggy automatically syncs Items every 24/12/8 hours based on your subscription tier. **Do not implement batch updates or polling for Items.**

**Incorrect (implementing batch updates):**

```typescript
// WRONG: Never implement batch updates for Items
async function syncAllItems() {
  const items = await db.items.findMany();
  for (const item of items) {
    await client.updateItem(item.pluggyItemId); // DON'T DO THIS
  }
}

// WRONG: Polling for updates
setInterval(async () => {
  const items = await db.items.findMany();
  for (const item of items) {
    await client.fetchItem(item.pluggyItemId);
  }
}, 60000);
```

**Correct (rely on Pluggy's auto-sync):**

```typescript
// Items are automatically synced by Pluggy
// You only need to:
// 1. Store the itemId when user connects
// 2. Listen for webhooks when sync completes
// 3. Optionally check nextAutoSyncAt for display purposes

async function getItemSyncInfo(itemId: string) {
  const item = await client.fetchItem(itemId);

  return {
    status: item.status,
    lastUpdatedAt: item.lastUpdatedAt,
    nextAutoSyncAt: item.nextAutoSyncAt, // When Pluggy will auto-sync next
  };
}
```

### When to Trigger Manual Item Updates

Only trigger manual updates in these specific scenarios:

```typescript
// User explicitly requests a refresh (e.g., clicks "Refresh" button)
async function userRequestedRefresh(itemId: string, userId: string) {
  // Verify user owns this item
  const connection = await db.connections.findFirst({
    where: { itemId, userId },
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  // Check item status - only update if needed
  const item = await client.fetchItem(itemId);

  if (item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED') {
    // Needs reconnection via Connect Widget
    const connectToken = await client.createConnectToken(itemId);
    return { needsReconnection: true, connectToken: connectToken.accessToken };
  }

  if (item.status === 'UPDATING') {
    // Already syncing, no action needed
    return { alreadySyncing: true };
  }

  // For UPDATED status, user can wait for next auto-sync
  // or you can show when next sync will happen
  return {
    status: item.status,
    lastUpdatedAt: item.lastUpdatedAt,
    nextAutoSyncAt: item.nextAutoSyncAt,
  };
}
```

---

## Data Sync (Your Responsibility)

When Pluggy completes a sync, it sends webhooks. **Use item webhooks for entity data and transaction webhooks for transactions.**

### Webhook Registration

```typescript
// Register webhook when creating items
const connectToken = await client.createConnectToken({
  webhookUrl: 'https://your-app.com/api/webhooks/pluggy',
});
```

### Webhook Handler

```typescript
app.post('/api/webhooks/pluggy', async (req, res) => {
  // Respond quickly (within 5 seconds)
  res.status(200).json({ received: true });

  const {
    event,
    itemId,
    accountId,
    transactionIds,
    createdTransactionsLink,
    transactionsCreatedAtFrom,
  } = req.body;

  // Queue for background processing
  await dataQueue.add('process-webhook', {
    event,
    itemId,
    accountId,
    transactionIds,
    createdTransactionsLink,
    transactionsCreatedAtFrom,
  });
});
```

### Processing Item Events

For **accounts, investments, identity, and loans** - fetch everything on `item/updated`:

```typescript
async function processItemEvent(event: string, itemId: string) {
  switch (event) {
    case 'item/created':
    case 'item/updated':
      // Fetch all entity data (except transactions)
      await syncAllEntityData(itemId);
      break;

    case 'item/error':
      await handleItemError(itemId);
      break;

    case 'item/deleted':
      await cleanupLocalData(itemId);
      break;
  }
}

async function syncAllEntityData(itemId: string) {
  // Fetch all accounts (balances updated)
  const accounts = await client.fetchAccounts(itemId);
  await db.accounts.upsertMany(
    accounts.map(a => ({ ...a, itemId }))
  );

  // Fetch all investments
  const investments = await client.fetchInvestments(itemId);
  await db.investments.upsertMany(
    investments.map(i => ({ ...i, itemId }))
  );

  // Fetch identity data
  const identity = await client.fetchIdentity(itemId);
  if (identity) {
    await db.identities.upsert({
      where: { itemId },
      update: identity,
      create: { ...identity, itemId },
    });
  }

  // Fetch loans
  const loans = await client.fetchLoans(itemId);
  await db.loans.upsertMany(
    loans.map(l => ({ ...l, itemId }))
  );
}
```

### Processing Transaction Events

For **transactions** - use the specific transaction webhook events:

```typescript
async function processTransactionEvent(
  event: string,
  itemId: string,
  accountId: string,
  transactionIds?: string[],
  createdTransactionsLink?: string,
  transactionsCreatedAtFrom?: string
) {
  switch (event) {
    case 'transactions/created':
      // Use the provided link or date parameter to fetch only new transactions
      await syncNewTransactions(
        itemId,
        accountId,
        createdTransactionsLink,
        transactionsCreatedAtFrom
      );
      break;

    case 'transactions/updated':
      // Refetch specific transactions that were modified
      await updateTransactions(itemId, accountId, transactionIds);
      break;

    case 'transactions/deleted':
      // Remove specific transactions from your database
      await deleteTransactions(transactionIds);
      break;
  }
}

// Fetch new transactions using createdTransactionsLink or transactionsCreatedAtFrom
async function syncNewTransactions(
  itemId: string,
  accountId: string,
  createdTransactionsLink?: string,
  transactionsCreatedAtFrom?: string
) {
  if (createdTransactionsLink) {
    // Option 1: Use the provided link (recommended - most efficient)
    const response = await fetch(createdTransactionsLink, {
      headers: { 'X-API-KEY': apiKey },
    });
    const { results } = await response.json();

    await db.transactions.createMany(
      results.map((t: Transaction) => ({ ...t, itemId, accountId }))
    );
  } else if (transactionsCreatedAtFrom) {
    // Option 2: Use the date parameter to fetch transactions from that timestamp
    const transactions = await client.fetchTransactions(itemId, {
      accountId,
      from: transactionsCreatedAtFrom,
      page: 1,
      pageSize: 500,
    });

    // Handle pagination if needed
    let allTransactions = [...transactions.results];
    let page = 2;

    while (transactions.results.length === 500) {
      const nextPage = await client.fetchTransactions(itemId, {
        accountId,
        from: transactionsCreatedAtFrom,
        page,
        pageSize: 500,
      });
      allTransactions.push(...nextPage.results);
      if (nextPage.results.length < 500) break;
      page++;
    }

    await db.transactions.createMany(
      allTransactions.map((t: Transaction) => ({ ...t, itemId, accountId }))
    );
  }
}

// Update specific transactions that were modified
async function updateTransactions(
  itemId: string,
  accountId: string,
  transactionIds?: string[]
) {
  if (!transactionIds?.length) return;

  // Fetch each transaction by ID
  for (const transactionId of transactionIds) {
    const transaction = await client.fetchTransaction(transactionId);
    await db.transactions.upsert({
      where: { id: transactionId },
      update: transaction,
      create: { ...transaction, itemId, accountId },
    });
  }
}

// Delete specific transactions
async function deleteTransactions(transactionIds?: string[]) {
  if (!transactionIds?.length) return;

  await db.transactions.deleteMany({
    where: { id: { in: transactionIds } },
  });
}
```

### Transaction Webhook Payloads

The transaction webhooks include specific data for efficient syncing:

```typescript
// transactions/created payload
interface TransactionsCreatedPayload {
  event: 'transactions/created';
  itemId: string;
  accountId: string;
  transactionsCreatedAtFrom: string;  // Timestamp of earliest new transaction (can be used as 'from' parameter)
  createdTransactionsLink: string;    // URL to fetch new transactions (preferred method)
}

// transactions/updated and transactions/deleted payload
interface TransactionsModifiedPayload {
  event: 'transactions/updated' | 'transactions/deleted';
  itemId: string;
  accountId: string;
  transactionIds: string[];  // Specific transaction IDs affected
}
```

---

## Summary

| Responsibility | Who Handles | How |
| -------------- | ----------- | --- |
| Connection sync | **Pluggy** | Auto-sync every 24/12/8h |
| Triggering updates | **User** | Only when user explicitly requests |
| Entity data sync | **You** | Fetch all on `item/updated` webhook |
| Transaction sync | **You** | Use `transactions/*` webhook events |
| Error handling | **You** | Monitor `item/error` webhook |

### Webhook Event Mapping

| Webhook Event | Action |
| ------------- | ------ |
| `item/created` | Fetch all entity data (accounts, investments, etc.) |
| `item/updated` | Fetch all entity data (accounts, investments, etc.) |
| `transactions/created` | Fetch new transactions via `createdTransactionsLink` |
| `transactions/updated` | Refetch specific `transactionIds` |
| `transactions/deleted` | Delete specific `transactionIds` from database |

### What NOT to Do

- Do NOT implement batch updates for Items
- Do NOT poll Items for status changes
- Do NOT trigger updates on a schedule
- Do NOT call `updateItem` unless user explicitly requests
- Do NOT fetch all transactions on `item/updated` - use transaction events

### What TO Do

- Register webhooks for all Items
- Sync entity data (accounts, investments, etc.) on `item/updated`
- Handle `transactions/created`, `transactions/updated`, `transactions/deleted` separately
- Use `createdTransactionsLink` from webhook payload to fetch new transactions
- Show `nextAutoSyncAt` to users so they know when data will refresh

Reference: [Item Lifecycle](https://docs.pluggy.ai/docs/item), [Webhooks](https://docs.pluggy.ai/docs/webhooks)
