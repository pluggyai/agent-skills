---
title: Select the Right Connector Type
impact: CRITICAL
impactDescription: Wrong connector type limits available data or fails connections
tags: connectors, open-finance, banks, institutions
---

## Select the Right Connector Type

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
