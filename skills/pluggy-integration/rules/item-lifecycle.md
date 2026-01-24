---
title: Manage Item Lifecycle Correctly
impact: HIGH
impactDescription: Proper lifecycle management ensures data accuracy and consent compliance
tags: item, lifecycle, status, sync
---

## Manage Item Lifecycle Correctly

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
