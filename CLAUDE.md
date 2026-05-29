# Pluggy Agent Skills

This repository contains Agent Skills for integrating Pluggy Open Finance solutions.

## Skills Available

- **pluggy-integration**: Core integration patterns (authentication, Connect Widget, webhooks)
- **pluggy-open-finance**: Open Finance data retrieval (accounts, transactions, investments)
- **pluggy-payments**: Payment initiation (PIX, Boleto, Smart Transfers)
- **pluggy-doctor**: Code-reviews an existing integration against the official docs (via Pluggy MCP) and returns a diagnostic report with fixes

## Quick Reference

### Authentication

```typescript
import { PluggyClient } from 'pluggy-sdk';

const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});
```

### Connect Widget

```typescript
// Generate connect token for frontend
const connectToken = await client.createConnectToken(itemId);

// Use in frontend with @pluggy/react-pluggy-connect
```

### Key Endpoints

- `POST /auth` - Create API key (2h expiration)
- `POST /connect_token` - Create connect token (30min expiration)
- `POST /items` - Create connection
- `GET /accounts` - List accounts
- `GET /transactions` - List transactions
- `POST /payments/requests` - Create payment

## Documentation

- [Pluggy Docs](https://docs.pluggy.ai)
- [API Reference](https://docs.pluggy.ai/reference)
