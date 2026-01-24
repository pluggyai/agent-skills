# Pluggy Documentation Improvement Suggestions

This document contains specific suggestions for improving the Pluggy documentation at [docs.pluggy.ai](https://docs.pluggy.ai).

---

## 1. Webhook Documentation

**Location:** [docs.pluggy.ai/docs/webhook](https://docs.pluggy.ai/docs/webhook)

### Missing Information

The current webhook documentation lacks:

1. **Complete list of webhook events** - Only mentions "item changes" without listing all available events
2. **Webhook payload structure** - No JSON schema or example payloads
3. **Webhook signature verification** - How to verify webhook authenticity
4. **Retry policy** - What happens when webhooks fail to deliver

### Suggested Additions

```markdown
## Webhook Events

| Event | Description | Payload |
| ----- | ----------- | ------- |
| `item/created` | New Item created successfully | `{ item: { id, status, connector } }` |
| `item/updated` | Item sync completed | `{ item: { id, status, lastUpdatedAt } }` |
| `item/error` | Item sync failed | `{ item: { id, status, error: { code, message } } }` |
| `item/deleted` | Item was deleted | `{ item: { id } }` |

## Webhook Payload Example

\`\`\`json
{
  "event": "item/updated",
  "data": {
    "item": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "UPDATED",
      "lastUpdatedAt": "2024-01-15T10:30:00Z",
      "connector": {
        "id": 201,
        "name": "Banco do Brasil"
      }
    }
  },
  "timestamp": "2024-01-15T10:30:05Z"
}
\`\`\`

## Webhook Security

To verify webhook authenticity, validate the `X-Pluggy-Signature` header:

\`\`\`typescript
import { createHmac } from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}
\`\`\`

## Retry Policy

If your webhook endpoint returns a non-2xx status code, Pluggy will retry delivery:
- 3 retries with exponential backoff
- Retries at: 1 minute, 5 minutes, 30 minutes
- After all retries fail, the webhook is dropped
```

---

## 2. Sync Strategy Best Practices

**Location:** [docs.pluggy.ai/docs/item](https://docs.pluggy.ai/docs/item)

### Missing Information

The documentation explains auto-sync but doesn't clearly guide developers on:

1. **When NOT to trigger manual updates** - Developers often implement batch updates
2. **Separation of connection sync vs data sync**
3. **Recommended architecture for data synchronization**

### Suggested Additions

```markdown
## Sync Architecture Best Practices

### Connection Sync vs Data Sync

| Concept | Responsibility | Implementation |
| ------- | -------------- | -------------- |
| Connection Sync | Pluggy (automatic) | Auto-sync every 24/12/8h based on plan |
| Data Sync | Your application | Fetch data when `item/updated` webhook fires |

### Anti-Patterns to Avoid

❌ **Do NOT implement batch updates:**
\`\`\`typescript
// WRONG: This wastes API calls and may hit rate limits
async function syncAllItems() {
  const items = await db.items.findMany();
  for (const item of items) {
    await client.updateItem(item.id);
  }
}
\`\`\`

❌ **Do NOT poll for status changes:**
\`\`\`typescript
// WRONG: Polling wastes resources
setInterval(() => client.fetchItem(itemId), 60000);
\`\`\`

### Recommended Architecture

1. **On item creation:** Store `itemId` and register webhook
2. **On `item/updated` webhook:** Fetch new data from Pluggy API
3. **On user request:** Only show current data or `nextAutoSyncAt`
4. **On `item/error` webhook:** Notify user to reconnect
```

---

## 3. SDK Type Documentation

**Location:** [docs.pluggy.ai/reference](https://docs.pluggy.ai/reference) (API Reference)

### Missing Information

The API reference doesn't clearly document:

1. **Connector types enum values** - `PERSONAL_BANK`, `BUSINESS_BANK`, etc.
2. **Account type/subtype relationship** - `BANK`/`CREDIT` with subtypes
3. **Investment types** - `MUTUAL_FUND`, `EQUITY`, `FIXED_INCOME`, etc.
4. **How to get institution name** - It's on `item.connector.name`, not on account

### Suggested Additions

```markdown
## Type Reference

### Connector Types

| Type | Description |
| ---- | ----------- |
| `PERSONAL_BANK` | Personal banking accounts |
| `BUSINESS_BANK` | Business/corporate banking |
| `INVESTMENT` | Investment platforms and brokerages |
| `DIGITAL_ECONOMY` | Digital wallets, gig economy platforms |
| `PAYMENT_ACCOUNT` | Payment-focused connectors |
| `INVOICE` | Invoice management |
| `TELECOMMUNICATION` | Telecom providers |
| `OTHER` | Other financial services |

### Account Structure

Accounts have a `type` and `subtype`:

| type | subtype | Description |
| ---- | ------- | ----------- |
| `BANK` | `CHECKINGS_ACCOUNT` | Checking account |
| `BANK` | `SAVINGS_ACCOUNT` | Savings account |
| `CREDIT` | `CREDIT_CARD` | Credit card |

**Note:** Institution name is NOT on the account. To get institution name:
\`\`\`typescript
const item = await client.fetchItem(itemId);
const institutionName = item.connector.name;
\`\`\`

### Investment Types

| Type | Description |
| ---- | ----------- |
| `MUTUAL_FUND` | Investment funds |
| `EQUITY` | Stocks |
| `SECURITY` | Securities |
| `FIXED_INCOME` | CDB, LCI, LCA, bonds |
| `ETF` | Exchange-traded funds |
| `COE` | Certificates of structured operations |
| `OTHER` | Other investments |
```

---

## 4. Connect Widget Integration

**Location:** [docs.pluggy.ai/docs/connect-widget](https://docs.pluggy.ai/docs/connect-widget)

### Missing Information

1. **Complete React integration example** with hooks
2. **Error handling patterns** for widget callbacks
3. **Token refresh handling** when connect token expires

### Suggested Additions

```markdown
## React Integration Example

\`\`\`typescript
import { useState, useEffect, useCallback } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';

function useConnectToken(itemId?: string) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = itemId
        ? \`/api/pluggy/connect-token/\${itemId}\`
        : '/api/pluggy/connect-token';
      const response = await fetch(endpoint);
      const { accessToken } = await response.json();
      setToken(accessToken);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return { token, error, loading, refetch: fetchToken };
}

function ConnectBankAccount({ onSuccess }: { onSuccess: (itemId: string) => void }) {
  const { token, loading, refetch } = useConnectToken();

  if (loading) return <div>Loading...</div>;
  if (!token) return <div>Error loading widget</div>;

  return (
    <PluggyConnect
      connectToken={token}
      onSuccess={(data) => {
        onSuccess(data.item.id);
      }}
      onError={(error) => {
        if (error.code === 'TOKEN_EXPIRED') {
          refetch(); // Get new token
        }
        console.error('Connection error:', error);
      }}
    />
  );
}
\`\`\`
```

---

## 5. Error Codes Reference

**Location:** [docs.pluggy.ai/docs/errors-codes](https://docs.pluggy.ai/docs/errors-codes)

### Missing Information

1. **User-friendly error messages** - What to show users for each error
2. **Recovery actions** - What the user/developer should do

### Suggested Additions

```markdown
## Error Handling Guide

| Error Code | User Message | Recovery Action |
| ---------- | ------------ | --------------- |
| `INVALID_CREDENTIALS` | "Your bank credentials have changed. Please reconnect." | Show Connect Widget with itemId |
| `ACCOUNT_LOCKED` | "Your bank account is locked. Please contact your bank." | No action - user must resolve with bank |
| `SITE_NOT_AVAILABLE` | "Your bank is temporarily unavailable. We'll retry automatically." | Wait for auto-retry (5 attempts) |
| `WAITING_USER_INPUT` | "Additional verification required." | Show MFA input form |
| `USER_AUTHORIZATION_REVOKED` | "You revoked access. Please reconnect to continue." | Show Connect Widget to reconnect |
| `CONNECTION_ERROR` | "Connection failed. Please try again." | Retry the operation |

## Handling Errors in Code

\`\`\`typescript
async function handleItemError(itemId: string, error: { code: string }) {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
    case 'USER_AUTHORIZATION_REVOKED':
      // Needs user action - prompt to reconnect
      return { action: 'reconnect', itemId };

    case 'SITE_NOT_AVAILABLE':
    case 'CONNECTION_ERROR':
      // Transient - will auto-retry
      return { action: 'wait', message: 'Will retry automatically' };

    case 'ACCOUNT_LOCKED':
      // User must contact bank
      return { action: 'contact_bank' };

    default:
      return { action: 'unknown', code: error.code };
  }
}
\`\`\`
```

---

## 6. Sandbox Documentation

**Location:** [docs.pluggy.ai/docs/sandbox](https://docs.pluggy.ai/docs/sandbox)

### Missing Information

1. **Complete list of test scenarios** with credentials
2. **Expected responses** for each scenario
3. **MFA test flow** step by step

### Suggested Additions

```markdown
## Sandbox Test Scenarios

| Scenario | User | Password | Expected Result |
| -------- | ---- | -------- | --------------- |
| Success | `user-ok` | `password-ok` | Status: `UPDATED` |
| MFA Required | `user-mfa` | `password-ok` | Status: `WAITING_USER_INPUT` |
| Invalid Credentials | `user-wrong` | `password-wrong` | Status: `LOGIN_ERROR` |
| Account Locked | `user-locked` | `password-ok` | Status: `LOGIN_ERROR` with code `ACCOUNT_LOCKED` |

## MFA Test Flow

1. Create item with `user: 'user-mfa'`, `password: 'password-ok'`
2. Item status will be `WAITING_USER_INPUT`
3. Fetch item to get MFA parameter
4. Submit MFA with value: `123456`
5. Item status changes to `UPDATED`

\`\`\`typescript
// Step 1: Create item
const item = await client.createItem({
  connectorId: 0,
  parameters: { user: 'user-mfa', password: 'password-ok' }
});
// item.status === 'WAITING_USER_INPUT'

// Step 2: Submit MFA
await client.updateItemMFA(item.id, { parameter: '123456' });
// item.status === 'UPDATED'
\`\`\`
```

---

## Summary of Changes

| Document | Section | Change Type |
| -------- | ------- | ----------- |
| Webhook | Events list | Add |
| Webhook | Payload examples | Add |
| Webhook | Signature verification | Add |
| Item | Sync best practices | Add |
| Item | Anti-patterns | Add |
| API Reference | Type enums | Enhance |
| API Reference | Institution name note | Add |
| Connect Widget | React example | Enhance |
| Error Codes | User messages | Add |
| Error Codes | Recovery actions | Add |
| Sandbox | Test scenarios table | Enhance |
| Sandbox | MFA test flow | Add |
