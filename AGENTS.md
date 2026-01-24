# Pluggy Agent Skills

This repository contains Agent Skills for integrating Pluggy Open Finance solutions.

## Available Skills

### pluggy-integration

Core integration patterns for Pluggy API.

**Rules:**
- `auth-api-keys` - Use API Keys Only on Backend (CRITICAL)
- `auth-token-refresh` - Implement Token Refresh Before Expiration (CRITICAL)
- `widget-integration` - Integrate Connect Widget Properly (CRITICAL)
- `widget-update-item` - Use Connect Token with Item ID for Updates (HIGH)
- `item-lifecycle` - Manage Item Lifecycle Correctly (HIGH)
- `item-delete` - Delete Items When Users Revoke Consent (HIGH)
- `webhook-setup` - Configure Webhooks for Real-Time Updates (HIGH)
- `error-handling` - Handle API Errors Gracefully (MEDIUM)
- `error-mfa` - Handle MFA Flows Correctly (MEDIUM)

### pluggy-open-finance

Best practices for Open Finance data retrieval.

**Rules:**
- `connector-selection` - Select the Right Connector Type (CRITICAL)
- `connector-sandbox` - Use Sandbox Connectors for Development (CRITICAL)
- `data-pagination` - Use Pagination for Large Data Sets (HIGH)
- `transaction-categories` - Use Transaction Categories for Analysis (HIGH)
- `transaction-enrichment` - Use Transaction Enrichment API (HIGH)
- `account-balances` - Handle Multiple Account Types (MEDIUM)
- `sync-strategies` - Implement Efficient Data Sync Strategies (MEDIUM)
- `investments-handling` - Handle Investment Data Properly (MEDIUM)

### pluggy-payments

Payment initiation with PIX, Boleto, and Smart Transfers.

**Rules:**
- `pix-initiation` - Implement PIX Payment Flow Correctly (CRITICAL)
- `pix-sandbox` - Test PIX Payments in Sandbox (CRITICAL)
- `smart-preauthorization` - Implement Smart Transfers with Preauthorization (HIGH)
- `payment-lifecycle` - Handle Payment Lifecycle States (HIGH)
- `boleto-management` - Manage Boletos Correctly (MEDIUM)
- `schedule-payments` - Implement Scheduled Payments (PIX Agendado) (MEDIUM)

## Quick Start

```typescript
import { PluggyClient } from 'pluggy-sdk';

// Initialize client (backend only)
const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

// Generate connect token for frontend
const connectToken = await client.createConnectToken();

// Fetch data after user connects
const accounts = await client.fetchAccounts(itemId);
const transactions = await client.fetchTransactions(itemId);
```

## Resources

- [Pluggy Documentation](https://docs.pluggy.ai)
- [API Reference](https://docs.pluggy.ai/reference)
- [pluggy-js SDK](https://github.com/pluggyai/pluggy-js)
