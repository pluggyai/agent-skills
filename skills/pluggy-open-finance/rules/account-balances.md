---
title: Handle Multiple Account Types
impact: MEDIUM
impactDescription: Different account types have different data structures
tags: accounts, balances, checking, savings
---

## Handle Multiple Account Types

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
