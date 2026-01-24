---
title: Use Pagination for Large Data Sets
impact: HIGH
impactDescription: Missing pagination loses data and causes timeouts
tags: pagination, data-retrieval, transactions, performance
---

## Use Pagination for Large Data Sets

Transactions and other data endpoints return paginated results. Always handle pagination to retrieve complete data.

**Incorrect (ignoring pagination):**

```typescript
// Wrong: Only gets first page
const transactions = await client.fetchTransactions(itemId);
// Missing older transactions!
```

**Correct (handle pagination):**

```typescript
async function fetchAllTransactions(
  itemId: string,
  options?: { from?: string; to?: string }
): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await client.fetchTransactions(itemId, {
      page,
      pageSize,
      from: options?.from,
      to: options?.to,
    });

    allTransactions.push(...response.results);

    // Check if more pages exist
    hasMore = response.results.length === pageSize;
    page++;
  }

  return allTransactions;
}

// Usage
const transactions = await fetchAllTransactions(itemId, {
  from: '2024-01-01',
  to: '2024-12-31',
});
```

**Paginated fetch with generator (memory efficient):**

```typescript
async function* fetchTransactionPages(
  itemId: string,
  options?: { from?: string; to?: string }
): AsyncGenerator<Transaction[]> {
  let page = 1;
  const pageSize = 100;

  while (true) {
    const response = await client.fetchTransactions(itemId, {
      page,
      pageSize,
      from: options?.from,
      to: options?.to,
    });

    if (response.results.length === 0) break;

    yield response.results;

    if (response.results.length < pageSize) break;
    page++;
  }
}

// Usage - process page by page (lower memory usage)
for await (const page of fetchTransactionPages(itemId)) {
  await processTransactionBatch(page);
}
```

**Date filtering:**

```typescript
// Get last 90 days of transactions
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const recentTransactions = await fetchAllTransactions(itemId, {
  from: ninetyDaysAgo.toISOString().split('T')[0],
});
```

### Pagination Parameters

| Parameter  | Type   | Description                     |
| ---------- | ------ | ------------------------------- |
| `page`     | number | Page number (starts at 1)       |
| `pageSize` | number | Results per page (max 500)      |
| `from`     | string | Start date (YYYY-MM-DD)         |
| `to`       | string | End date (YYYY-MM-DD)           |

Reference: [Transactions](https://docs.pluggy.ai/docs/transaction)
