# Pluggy Open Finance - Complete Guide

This document contains all rules for best practices for open finance data retrieval and management.

> **Generated:** 2026-01-24
> **Total Rules:** 8

## Table of Contents

### CRITICAL

- [Select the Right Connector Type](#select-the-right-connector-type)
- [Use Sandbox Connectors for Development](#use-sandbox-connectors-for-development)

### HIGH

- [Implement Proper Sync Strategy](#implement-proper-sync-strategy)
- [Use Pagination for Large Data Sets](#use-pagination-for-large-data-sets)
- [Use Transaction Categories for Analysis](#use-transaction-categories-for-analysis)
- [Use Transaction Enrichment API](#use-transaction-enrichment-api)

### MEDIUM

- [Handle Investment Data Properly](#handle-investment-data-properly)
- [Handle Multiple Account Types](#handle-multiple-account-types)

---

## CRITICAL Rules

### Select the Right Connector Type

**Impact:** CRITICAL

Wrong connector type limits available data or fails connections

Pluggy offers different connector types. Choose based on your data needs and the user's financial institution.

**Connector Types:**

| Type                | Description                           | Example Use Case            |
| ------------------- | ------------------------------------- | --------------------------- |
| `PERSONAL_BANK`     | Personal banking accounts             | Checking, savings accounts  |
| `BUSINESS_BANK`     | Business/corporate banking            | Company accounts            |
| `INVESTMENT`        | Investment platforms                  | Brokerages, wealth mgmt     |
| `DIGITAL_ECONOMY`   | Digital payments/gig economy          | Wise, digital wallets       |
| `PAYMENT_ACCOUNT`   | Payment-focused connectors            | Payment initiation          |
| `OTHER`             | Other financial services              | Miscellaneous               |

**Incorrect (hardcoding connector):**

```typescript
// Wrong: Using specific connector without checking availability
const item = await client.createItem({
  connectorId: 201, // Hardcoded connector ID
  parameters: credentials,
});
```

**Correct (list and filter connectors):**

```typescript
// List available connectors
const connectors = await client.fetchConnectors({
  types: ['PERSONAL_BANK', 'BUSINESS_BANK'],
  countries: ['BR'],
  isOpenFinance: true, // Filter for Open Finance connectors
});

// Filter by user's bank
function findConnector(connectors: Connector[], bankName: string) {
  // Prefer Open Finance connector
  const openFinance = connectors.find(
    c => c.name.toLowerCase().includes(bankName.toLowerCase()) &&
         c.isOpenFinance === true
  );

  if (openFinance) return openFinance;

  // Fall back to non-Open Finance if needed
  return connectors.find(
    c => c.name.toLowerCase().includes(bankName.toLowerCase())
  );
}

// Display connectors to user
function renderConnectorList(connectors: Connector[]) {
  return connectors.map(c => ({
    id: c.id,
    name: c.name,                    // Institution name
    type: c.type,                    // PERSONAL_BANK, INVESTMENT, etc.
    products: c.products,            // ['ACCOUNTS', 'TRANSACTIONS', etc.]
    logo: c.imageUrl,                // Institution logo URL
    isOpenFinance: c.isOpenFinance,  // Is Open Finance certified
    health: c.health.status,         // ONLINE, OFFLINE, UNSTABLE
  }));
}
```

**Check connector capabilities:**

```typescript
// Verify connector supports required products
function validateConnector(connector: Connector, requiredProducts: ProductType[]) {
  const supported = connector.products || [];
  const missing = requiredProducts.filter(p => !supported.includes(p));

  if (missing.length > 0) {
    throw new Error(`Connector doesn't support: ${missing.join(', ')}`);
  }

  return true;
}

// Usage
const connector = await client.fetchConnector(connectorId);
validateConnector(connector, ['ACCOUNTS', 'TRANSACTIONS', 'INVESTMENTS']);

// Check connector health before connecting
if (connector.health.status === 'OFFLINE') {
  throw new Error('This bank is temporarily unavailable');
}
```

### Product Types

| Product                    | Description                    |
| -------------------------- | ------------------------------ |
| `ACCOUNTS`                 | Bank accounts and balances     |
| `TRANSACTIONS`             | Account transactions           |
| `CREDIT_CARDS`             | Credit card data               |
| `INVESTMENTS`              | Investment portfolios          |
| `INVESTMENTS_TRANSACTIONS` | Investment transaction history |
| `IDENTITY`                 | User identity information      |
| `PAYMENT_DATA`             | Payment-related data           |
| `LOANS`                    | Loan information               |

### Connector Properties

| Property                    | Description                           |
| --------------------------- | ------------------------------------- |
| `isOpenFinance`             | Whether connector uses Open Finance   |
| `isSandbox`                 | Whether it's a test connector         |
| `supportsPaymentInitiation` | Can initiate payments                 |
| `supportsScheduledPayments` | Supports PIX Agendado                 |
| `supportsSmartTransfers`    | Supports preauthorized transfers      |

Reference: [Connectors](https://docs.pluggy.ai/docs/connectors-coverage)


---

### Use Sandbox Connectors for Development

**Impact:** CRITICAL

Testing with real credentials risks exposing sensitive data

Pluggy provides sandbox connectors for testing. Never use real user credentials during development.

**Incorrect (using production in development):**

```typescript
// Wrong: Testing with real bank credentials
const item = await client.createItem({
  connectorId: 201, // Real bank connector
  parameters: {
    user: 'real-user@bank.com',
    password: 'realPassword123',
  },
});
```

**Correct (use sandbox connectors):**

```typescript
// Sandbox connector IDs
const SANDBOX_CONNECTORS = {
  BANK: 0,           // Simulates bank with accounts/transactions
  INVESTMENT: 0,     // Same connector supports investments
  CREDIT_CARD: 0,    // Same connector supports credit cards
};

// Sandbox credentials (always use these for testing)
const SANDBOX_CREDENTIALS = {
  user: 'user-ok',
  password: 'password-ok',
};

// Development environment check
function getConnectorConfig(isProduction: boolean, userConnectorId?: number) {
  if (!isProduction) {
    return {
      connectorId: SANDBOX_CONNECTORS.BANK,
      parameters: SANDBOX_CREDENTIALS,
    };
  }

  return {
    connectorId: userConnectorId,
    parameters: null, // Collected via Connect Widget
  };
}
```

**Sandbox test scenarios:**

```typescript
// Different sandbox users simulate different scenarios
const SANDBOX_SCENARIOS = {
  success: {
    user: 'user-ok',
    password: 'password-ok',
  },
  mfaRequired: {
    user: 'user-mfa',
    password: 'password-ok',
    // Will return status WAITING_USER_INPUT
    // MFA answer: 123456
  },
  invalidCredentials: {
    user: 'user-wrong',
    password: 'password-wrong',
    // Will return status LOGIN_ERROR
  },
  accountLocked: {
    user: 'user-locked',
    password: 'password-ok',
    // Will return status LOGIN_ERROR with account locked message
  },
};

// Test specific scenarios
async function testScenario(scenario: keyof typeof SANDBOX_SCENARIOS) {
  const credentials = SANDBOX_SCENARIOS[scenario];

  const item = await client.createItem({
    connectorId: 0,
    parameters: credentials,
  });

  console.log(`Scenario ${scenario}: Status = ${item.status}`);
  return item;
}
```

### Sandbox Features

| Feature                | Supported |
| ---------------------- | --------- |
| Account data           | Yes       |
| Transaction history    | Yes       |
| Investment portfolios  | Yes       |
| Credit card bills      | Yes       |
| MFA simulation         | Yes       |
| Error simulation       | Yes       |
| Payment initiation     | Yes       |

Reference: [Sandbox](https://docs.pluggy.ai/docs/sandbox)

## HIGH Rules

### Implement Proper Sync Strategy

**Impact:** HIGH

Proper sync strategy ensures data freshness without unnecessary API calls

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


---

### Use Pagination for Large Data Sets

**Impact:** HIGH

Missing pagination loses data and causes timeouts

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


---

### Use Transaction Categories for Analysis

**Impact:** HIGH

Categories enable spending insights and financial analysis

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


---

### Use Transaction Enrichment API

**Impact:** HIGH

Enrichment adds merchant details and improves categorization accuracy

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

## MEDIUM Rules

### Handle Investment Data Properly

**Impact:** MEDIUM

Investment data has unique structure requiring special handling

Investment data includes portfolios, holdings, and transaction history. Handle the structure correctly and get institution info from the Item's connector.

**Incorrect (flat data assumption):**

```typescript
// Wrong: Not handling types correctly
const investments = await client.fetchInvestments(itemId);
const total = investments.reduce((sum, i) => sum + i.balance, 0);
// Missing type grouping, no institution info
```

**Correct (handle portfolio structure):**

```typescript
import { Investment, Item } from 'pluggy-sdk';

interface PortfolioSummary {
  totalValue: number;
  byType: Record<string, { value: number; items: Investment[] }>;
  institutionName: string;
  institutionLogo: string;
}

async function getInvestmentSummary(itemId: string): Promise<PortfolioSummary> {
  // Get item for institution info (investments don't have institution name)
  const item = await client.fetchItem(itemId);
  const investments = await client.fetchInvestments(itemId);

  const summary: PortfolioSummary = {
    totalValue: 0,
    byType: {},
    institutionName: item.connector.name,
    institutionLogo: item.connector.imageUrl,
  };

  for (const investment of investments) {
    const value = investment.balance || 0;
    const type = investment.type || 'OTHER';

    summary.totalValue += value;

    // Group by type
    if (!summary.byType[type]) {
      summary.byType[type] = { value: 0, items: [] };
    }
    summary.byType[type].value += value;
    summary.byType[type].items.push(investment);
  }

  return summary;
}

// Display portfolio allocation
function PortfolioChart({ summary }: { summary: PortfolioSummary }) {
  const allocation = Object.entries(summary.byType).map(([type, data]) => ({
    name: type,
    value: data.value,
    percentage: (data.value / summary.totalValue) * 100,
  }));

  return (
    <div>
      <header>
        <img src={summary.institutionLogo} alt={summary.institutionName} />
        <h2>{summary.institutionName}</h2>
      </header>
      <h3>Portfolio: {formatCurrency(summary.totalValue)}</h3>
      <PieChart data={allocation} />
      <AllocationTable data={allocation} />
    </div>
  );
}
```

**Fetch investment transactions:**

```typescript
// Get transaction history for an investment
async function getInvestmentHistory(investmentId: string) {
  const investment = await client.fetchInvestment(investmentId);

  // Transactions are included in the investment object
  const transactions = investment.transactions || [];

  return transactions.map(t => ({
    date: t.date,
    type: t.type,
    quantity: t.quantity,
    price: t.value,
    total: t.amount,
    tradeDate: t.tradeDate,
  }));
}

// Calculate investment performance
async function calculatePerformance(itemId: string) {
  const investments = await client.fetchInvestments(itemId);

  return investments.map(inv => {
    const currentValue = inv.balance || 0;
    const invested = inv.amountOriginal || inv.amount || 0;
    const profit = inv.amountProfit || (currentValue - invested);
    const returnPct = invested > 0 ? (profit / invested) * 100 : 0;

    return {
      name: inv.name,
      type: inv.type,
      currentValue,
      invested,
      profit,
      returnPct,
      annualRate: inv.annualRate,
      lastMonthRate: inv.lastMonthRate,
      lastTwelveMonthsRate: inv.lastTwelveMonthsRate,
    };
  });
}
```

### Investment Types

| Type           | Description                       |
| -------------- | --------------------------------- |
| `MUTUAL_FUND`  | Investment funds                  |
| `EQUITY`       | Stocks                            |
| `SECURITY`     | Securities                        |
| `FIXED_INCOME` | CDB, LCI, LCA, bonds              |
| `ETF`          | Exchange-traded funds             |
| `COE`          | Certificates of structured ops   |
| `OTHER`        | Other investments                 |

### Investment Fields

| Field                   | Type    | Description                      |
| ----------------------- | ------- | -------------------------------- |
| `balance`               | number  | Current value                    |
| `amount`                | number  | Invested amount                  |
| `amountProfit`          | number  | Profit amount                    |
| `annualRate`            | number  | Annual return rate               |
| `lastMonthRate`         | number  | Last month return                |
| `lastTwelveMonthsRate`  | number  | Last 12 months return            |
| `dueDate`               | Date    | Maturity date (fixed income)     |
| `issuer`                | string  | Investment issuer                |
| `transactions`          | array   | Transaction history              |

Reference: [Investments](https://docs.pluggy.ai/docs/investment)


---

### Handle Multiple Account Types

**Impact:** MEDIUM

Different account types have different data structures

Users may have multiple account types. Handle each type and subtype appropriately.

**Account Structure:**

- `type`: `BANK` or `CREDIT`
- `subtype`: `CHECKINGS_ACCOUNT`, `SAVINGS_ACCOUNT`, or `CREDIT_CARD`
- Institution name is on the **Item's connector**, not on the account

**Incorrect (assuming single account type):**

```typescript
// Wrong: Assumes all accounts are the same
const accounts = await client.fetchAccounts(itemId);
const balance = accounts[0].balance;
// Missing other accounts, not handling types correctly
```

**Correct (handle all account types):**

```typescript
import { Account, Item } from 'pluggy-sdk';

interface AccountSummary {
  checking: { balance: number; accounts: Account[] };
  savings: { balance: number; accounts: Account[] };
  credit: { available: number; limit: number; accounts: Account[] };
  institutionName: string;
}

async function getAccountSummary(itemId: string): Promise<AccountSummary> {
  // Fetch item to get institution name from connector
  const item = await client.fetchItem(itemId);
  const accounts = await client.fetchAccounts(itemId);

  const summary: AccountSummary = {
    checking: { balance: 0, accounts: [] },
    savings: { balance: 0, accounts: [] },
    credit: { available: 0, limit: 0, accounts: [] },
    institutionName: item.connector.name, // Institution name is on the connector
  };

  for (const account of accounts) {
    // Use subtype for more specific categorization
    switch (account.subtype) {
      case 'CHECKINGS_ACCOUNT':
        summary.checking.balance += account.balance;
        summary.checking.accounts.push(account);
        break;

      case 'SAVINGS_ACCOUNT':
        summary.savings.balance += account.balance;
        summary.savings.accounts.push(account);
        break;

      case 'CREDIT_CARD':
        summary.credit.available += account.creditData?.availableCreditLimit || 0;
        summary.credit.limit += account.creditData?.creditLimit || 0;
        summary.credit.accounts.push(account);
        break;
    }
  }

  return summary;
}

// Calculate net worth
async function calculateNetWorth(itemId: string): Promise<number> {
  const summary = await getAccountSummary(itemId);

  const assets = summary.checking.balance + summary.savings.balance;
  // Credit used = limit - available
  const creditUsed = summary.credit.limit - summary.credit.available;

  return assets - creditUsed;
}
```

**Display accounts with institution info:**

```typescript
interface AccountWithInstitution {
  account: Account;
  institutionName: string;
  institutionLogo: string;
}

async function getAccountsWithInstitution(itemId: string): Promise<AccountWithInstitution[]> {
  const item = await client.fetchItem(itemId);
  const accounts = await client.fetchAccounts(itemId);

  return accounts.map(account => ({
    account,
    institutionName: item.connector.name,
    institutionLogo: item.connector.imageUrl,
  }));
}

// React component
function AccountsList({ itemId }: { itemId: string }) {
  const [data, setData] = useState<AccountWithInstitution[] | null>(null);

  useEffect(() => {
    getAccountsWithInstitution(itemId).then(setData);
  }, [itemId]);

  if (!data) return <Loading />;

  return (
    <div>
      {data.map(({ account, institutionName, institutionLogo }) => (
        <AccountCard
          key={account.id}
          name={account.name}
          balance={account.balance}
          type={account.subtype}
          institutionName={institutionName}
          institutionLogo={institutionLogo}
          // Credit card specific fields
          creditLimit={account.creditData?.creditLimit}
          availableCredit={account.creditData?.availableCreditLimit}
        />
      ))}
    </div>
  );
}
```

### Account Types and Subtypes

| Type     | Subtype             | Balance Field | Additional Data    |
| -------- | ------------------- | ------------- | ------------------ |
| `BANK`   | `CHECKINGS_ACCOUNT` | `balance`     | `bankData`         |
| `BANK`   | `SAVINGS_ACCOUNT`   | `balance`     | `bankData`         |
| `CREDIT` | `CREDIT_CARD`       | `balance`     | `creditData`       |

### BankData Fields

| Field            | Type     | Description                    |
| ---------------- | -------- | ------------------------------ |
| `transferNumber` | string   | Account number for transfers   |
| `closingBalance` | number   | Available balance              |

### CreditData Fields

| Field                  | Type   | Description                    |
| ---------------------- | ------ | ------------------------------ |
| `creditLimit`          | number | Total credit limit             |
| `availableCreditLimit` | number | Available credit to use        |
| `balanceCloseDate`     | Date   | Current statement close date   |
| `balanceDueDate`       | Date   | Current statement due date     |
| `minimumPayment`       | number | Minimum payment due            |
| `brand`                | string | Card brand (Visa, Mastercard)  |

### Getting Institution Name

```typescript
// Institution name is on item.connector, NOT on account
const item = await client.fetchItem(itemId);
const institutionName = item.connector.name;      // e.g., "Banco do Brasil"
const institutionLogo = item.connector.imageUrl;  // Logo URL
```

Reference: [Accounts](https://docs.pluggy.ai/docs/account)

---

## Quick Reference

| Rule | Impact | Tags |
| ---- | ------ | ---- |
| Select the Right Connector Type | CRITICAL | connectors, open-finance, banks, institutions |
| Use Sandbox Connectors for Development | CRITICAL | sandbox, testing, development, connectors |
| Implement Proper Sync Strategy | HIGH | sync, webhooks, auto-sync, data-retrieval |
| Use Pagination for Large Data Sets | HIGH | pagination, data-retrieval, transactions, performance |
| Use Transaction Categories for Analysis | HIGH | transactions, categories, enrichment, analysis |
| Use Transaction Enrichment API | HIGH | transactions, enrichment, merchants, intelligence |
| Handle Investment Data Properly | MEDIUM | investments, portfolios, holdings, assets |
| Handle Multiple Account Types | MEDIUM | accounts, balances, checking, savings |
