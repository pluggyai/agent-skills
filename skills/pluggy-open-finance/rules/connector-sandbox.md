---
title: Use Sandbox Connectors for Development
impact: CRITICAL
impactDescription: Testing with real credentials risks exposing sensitive data
tags: sandbox, testing, development, connectors
---

## Use Sandbox Connectors for Development

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
