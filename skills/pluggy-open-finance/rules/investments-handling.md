---
title: Handle Investment Data Properly
impact: MEDIUM
impactDescription: Investment data has unique structure requiring special handling
tags: investments, portfolios, holdings, assets
---

## Handle Investment Data Properly

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
