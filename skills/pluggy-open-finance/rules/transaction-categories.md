---
title: Use Transaction Categories for Analysis
impact: HIGH
impactDescription: Categories enable spending insights and financial analysis
tags: transactions, categories, enrichment, analysis
---

## Use Transaction Categories for Analysis

Pluggy automatically categorizes transactions. Use these categories for spending analysis and insights.

**Incorrect (ignoring categories):**

```typescript
// Wrong: Only using description for analysis
const transactions = await client.fetchTransactions(itemId);
const spending = transactions.reduce((acc, t) => acc + t.amount, 0);
// No insight into where money is going
```

**Correct (use categories for insights):**

```typescript
interface SpendingByCategory {
  [category: string]: {
    total: number;
    count: number;
    transactions: Transaction[];
  };
}

async function analyzeSpending(itemId: string): Promise<SpendingByCategory> {
  const transactions = await fetchAllTransactions(itemId);

  const spending: SpendingByCategory = {};

  for (const transaction of transactions) {
    // Only analyze expenses (negative amounts)
    if (transaction.amount >= 0) continue;

    const category = transaction.category || 'Uncategorized';

    if (!spending[category]) {
      spending[category] = { total: 0, count: 0, transactions: [] };
    }

    spending[category].total += Math.abs(transaction.amount);
    spending[category].count++;
    spending[category].transactions.push(transaction);
  }

  return spending;
}

// Usage
const spending = await analyzeSpending(itemId);

// Top spending categories
const topCategories = Object.entries(spending)
  .sort(([, a], [, b]) => b.total - a.total)
  .slice(0, 5);

console.log('Top 5 spending categories:');
topCategories.forEach(([category, data]) => {
  console.log(`${category}: R$ ${data.total.toFixed(2)} (${data.count} transactions)`);
});
```

**Category-based budgeting:**

```typescript
interface Budget {
  category: string;
  limit: number;
}

async function checkBudgets(itemId: string, budgets: Budget[]) {
  const spending = await analyzeSpending(itemId);

  return budgets.map(budget => {
    const categorySpending = spending[budget.category]?.total || 0;
    const remaining = budget.limit - categorySpending;
    const percentUsed = (categorySpending / budget.limit) * 100;

    return {
      category: budget.category,
      limit: budget.limit,
      spent: categorySpending,
      remaining,
      percentUsed,
      isOverBudget: remaining < 0,
    };
  });
}
```

### Common Categories

| Category           | Description                    |
| ------------------ | ------------------------------ |
| `Food`             | Restaurants, groceries         |
| `Transportation`   | Fuel, public transit, rides    |
| `Housing`          | Rent, utilities, maintenance   |
| `Entertainment`    | Streaming, events, hobbies     |
| `Health`           | Medical, pharmacy, gym         |
| `Shopping`         | Retail, online purchases       |
| `Transfer`         | Bank transfers, PIX            |
| `Bills`            | Recurring bills, subscriptions |
| `Income`           | Salary, deposits               |

Reference: [Transaction Categorization](https://docs.pluggy.ai/docs/transaction)
