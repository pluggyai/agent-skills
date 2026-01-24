---
title: Use Transaction Enrichment API
impact: HIGH
impactDescription: Enrichment adds merchant details and improves categorization accuracy
tags: transactions, enrichment, merchants, intelligence
---

## Use Transaction Enrichment API

Pluggy's enrichment API adds merchant information, logos, and improved categorization to transactions.

**Incorrect (using raw transaction data):**

```typescript
// Raw transaction data is often cryptic
const transaction = {
  description: 'PAG*JoseDaSilva',
  amount: -45.90,
  // No merchant info, unclear what this is
};
```

**Correct (use enrichment API):**

```typescript
// Enrich transactions for better UX
async function enrichTransactions(transactions: Transaction[]) {
  const enrichedBatch = await client.enrichTransactions({
    transactions: transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date,
    })),
  });

  return enrichedBatch.map(enriched => ({
    ...enriched,
    merchant: {
      name: enriched.merchantName,     // "iFood"
      logo: enriched.merchantLogo,     // URL to logo
      category: enriched.category,     // "Food"
      website: enriched.merchantUrl,
    },
  }));
}

// Display enriched transaction
function TransactionItem({ transaction }) {
  return (
    <div className="transaction">
      {transaction.merchant?.logo && (
        <img src={transaction.merchant.logo} alt={transaction.merchant.name} />
      )}
      <div>
        <strong>{transaction.merchant?.name || transaction.description}</strong>
        <span className="category">{transaction.category}</span>
      </div>
      <span className="amount">
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}
```

**Batch enrichment for efficiency:**

```typescript
// Enrich in batches to optimize API calls
async function enrichAllTransactions(itemId: string) {
  const transactions = await fetchAllTransactions(itemId);

  // Process in batches of 100
  const batchSize = 100;
  const enriched: EnrichedTransaction[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const enrichedBatch = await client.enrichTransactions({
      transactions: batch,
    });
    enriched.push(...enrichedBatch);
  }

  return enriched;
}
```

**Recurring payments detection:**

```typescript
// Use recurring payments API for subscription detection
async function findSubscriptions(itemId: string) {
  const recurringPayments = await client.fetchRecurringPayments(itemId);

  return recurringPayments.map(payment => ({
    merchant: payment.merchantName,
    amount: payment.averageAmount,
    frequency: payment.frequency, // 'monthly', 'weekly', etc.
    nextExpected: payment.nextExpectedDate,
    category: payment.category,
  }));
}
```

### Enrichment Fields

| Field            | Description                      |
| ---------------- | -------------------------------- |
| `merchantName`   | Clean merchant name              |
| `merchantLogo`   | URL to merchant logo             |
| `merchantUrl`    | Merchant website                 |
| `category`       | Improved category                |
| `subcategory`    | Detailed subcategory             |
| `isRecurring`    | Subscription indicator           |

Reference: [Transaction Enrichment](https://docs.pluggy.ai/docs/transaction-enrichment)
