---
title: Test PIX Payments in Sandbox
impact: CRITICAL
impactDescription: Testing with real payments risks financial loss
tags: pix, sandbox, testing, development
---

## Test PIX Payments in Sandbox

Always use sandbox environment for testing PIX payments. Never test with real money.

**Incorrect (testing in production):**

```typescript
// DANGEROUS: Testing with real credentials
const client = new PluggyClient({
  clientId: process.env.PLUGGY_PROD_CLIENT_ID,
  clientSecret: process.env.PLUGGY_PROD_SECRET,
});

// This could send real money!
await initiatePayment(100.00, 'real-recipient@email.com');
```

**Correct (use sandbox):**

```typescript
// Use sandbox credentials for testing
const client = new PluggyClient({
  clientId: process.env.PLUGGY_SANDBOX_CLIENT_ID,
  clientSecret: process.env.PLUGGY_SANDBOX_SECRET,
});

// Test with sandbox connector (ID: 0)
const testItem = await client.createItem({
  connectorId: 0,
  parameters: {
    user: 'user-ok',
    password: 'password-ok',
  },
});

// Create test payment
const paymentRequest = await client.createPaymentRequest({
  recipientId: sandboxRecipientId,
  amount: 100.00,
  description: 'Test payment',
});

console.log('Test payment created:', paymentRequest.id);
```

**Environment-based configuration:**

```typescript
interface PaymentConfig {
  clientId: string;
  clientSecret: string;
  connectorId: number;
  isProduction: boolean;
}

function getPaymentConfig(): PaymentConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    clientId: isProduction
      ? process.env.PLUGGY_PROD_CLIENT_ID!
      : process.env.PLUGGY_SANDBOX_CLIENT_ID!,
    clientSecret: isProduction
      ? process.env.PLUGGY_PROD_SECRET!
      : process.env.PLUGGY_SANDBOX_SECRET!,
    connectorId: isProduction ? undefined : 0, // Use real connector in prod
    isProduction,
  };
}

// Safeguard for production payments
async function initiatePayment(amount: number, recipientId: string) {
  const config = getPaymentConfig();

  if (!config.isProduction && amount > 1000) {
    throw new Error('Sandbox has payment limits. Use smaller amounts.');
  }

  // Proceed with payment
  return client.createPaymentRequest({
    recipientId,
    amount,
  });
}
```

**Sandbox payment test scenarios:**

```typescript
// Different amounts trigger different behaviors in sandbox
const SANDBOX_SCENARIOS = {
  success: 100.00,          // Payment succeeds
  pending: 200.00,          // Payment stays pending
  failed: 300.00,           // Payment fails
  timeout: 400.00,          // Payment times out
};

async function testPaymentScenarios() {
  for (const [scenario, amount] of Object.entries(SANDBOX_SCENARIOS)) {
    const payment = await initiatePayment(amount, testRecipientId);
    console.log(`${scenario}: Payment ${payment.id} created`);
  }
}
```

### Environment Variables

```env
# Sandbox (development/testing)
PLUGGY_SANDBOX_CLIENT_ID=sandbox-client-id
PLUGGY_SANDBOX_SECRET=sandbox-secret

# Production
PLUGGY_PROD_CLIENT_ID=prod-client-id
PLUGGY_PROD_SECRET=prod-secret
```

Reference: [Sandbox](https://docs.pluggy.ai/docs/sandbox)
