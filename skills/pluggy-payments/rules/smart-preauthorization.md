---
title: Implement Smart Transfers with Preauthorization
impact: HIGH
impactDescription: Smart Transfers enable recurring payments without repeated authorization
tags: smart-transfers, preauthorization, recurring, automation
---

## Implement Smart Transfers with Preauthorization

Smart Transfers allow preauthorized recurring payments. User authorizes once, you can initiate payments within limits.

**Incorrect (requiring authorization for each payment):**

```typescript
// Wrong: User must authorize every payment
async function monthlySubscription(userId: string) {
  // User has to open widget every month
  const connectToken = await client.createConnectToken(itemId);
  // Send to frontend for authorization...
  // Poor UX for recurring payments
}
```

**Correct (use preauthorization):**

```typescript
// Step 1: Create preauthorization (one-time user consent)
const preauth = await client.createSmartTransferPreauthorization({
  itemId: userItemId,
  recipientId: yourCompanyRecipientId,
  maxAmount: 500.00,           // Maximum per payment
  monthlyLimit: 2000.00,       // Maximum per month
  expiresAt: '2025-12-31',     // Preauthorization expiry
  description: 'Monthly subscription',
});

// Step 2: User authorizes preauthorization in Connect Widget
const connectToken = await client.createConnectToken(userItemId, {
  preauthId: preauth.id,
});

// Frontend shows widget, user authorizes once
```

```typescript
// Step 3: After authorization, initiate payments without user interaction
async function chargeSubscription(userId: string, amount: number) {
  const user = await db.users.findUnique({
    where: { id: userId },
    include: { smartTransferPreauth: true },
  });

  if (!user.smartTransferPreauth?.isActive) {
    throw new Error('No active preauthorization');
  }

  // Create payment using preauthorization
  const payment = await client.createSmartTransferPayment({
    preauthId: user.smartTransferPreauth.id,
    amount: amount,
    description: `Subscription - ${new Date().toLocaleDateString()}`,
  });

  return payment;
}

// Run monthly billing
async function runMonthlyBilling() {
  const activeSubscriptions = await db.subscriptions.findMany({
    where: { status: 'ACTIVE' },
    include: { user: { include: { smartTransferPreauth: true } } },
  });

  for (const subscription of activeSubscriptions) {
    try {
      const payment = await chargeSubscription(
        subscription.userId,
        subscription.amount
      );
      console.log(`Charged ${subscription.userId}: ${payment.id}`);
    } catch (error) {
      console.error(`Failed to charge ${subscription.userId}:`, error);
      // Handle failed payment (retry, notify user, etc.)
    }
  }
}
```

**Monitor preauthorization status:**

```typescript
// Check if preauthorization is still valid
async function checkPreauthStatus(preauthId: string) {
  const preauth = await client.fetchSmartTransferPreauthorization(preauthId);

  return {
    isActive: preauth.status === 'ACTIVE',
    remainingMonthly: preauth.monthlyLimit - preauth.usedThisMonth,
    expiresAt: preauth.expiresAt,
    needsRenewal: new Date(preauth.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

// Handle expiring preauthorizations
async function handleExpiringPreauths() {
  const expiringSoon = await db.smartTransferPreauth.findMany({
    where: {
      expiresAt: {
        lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      status: 'ACTIVE',
    },
    include: { user: true },
  });

  for (const preauth of expiringSoon) {
    await notifyUserToRenew(preauth.user, preauth);
  }
}
```

### Preauthorization Limits

| Field           | Description                        | Required |
| --------------- | ---------------------------------- | -------- |
| `maxAmount`     | Maximum per transaction            | Yes      |
| `monthlyLimit`  | Maximum total per month            | No       |
| `expiresAt`     | When preauthorization expires      | Yes      |

Reference: [Smart Transfers](https://docs.pluggy.ai/docs/smart-transfers)
