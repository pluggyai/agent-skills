# Pluggy Payments - Complete Guide

This document contains all rules for payment initiation with pix, boleto, and smart transfers.

> **Generated:** 2026-01-24
> **Total Rules:** 6

## Table of Contents

### CRITICAL

- [Implement PIX Payment Flow Correctly](#implement-pix-payment-flow-correctly)
- [Test PIX Payments in Sandbox](#test-pix-payments-in-sandbox)

### HIGH

- [Handle Payment Lifecycle States](#handle-payment-lifecycle-states)
- [Implement Smart Transfers with Preauthorization](#implement-smart-transfers-with-preauthorization)

### MEDIUM

- [Implement Scheduled Payments (PIX Agendado)](#implement-scheduled-payments-pix-agendado)
- [Manage Boletos Correctly](#manage-boletos-correctly)

---

## CRITICAL Rules

### Implement PIX Payment Flow Correctly

**Impact:** CRITICAL

Incorrect PIX flow causes payment failures and poor UX

PIX payments require a specific flow: create payment request, then payment intent, then user authorization.

**Incorrect (skipping steps):**

```typescript
// Wrong: Trying to send PIX directly
await client.sendPix({
  amount: 100,
  recipientKey: 'email@example.com',
});
// This won't work - PIX requires user authorization
```

**Correct (full PIX flow):**

```typescript
// Step 1: Create a payment recipient
const recipient = await client.createPaymentRecipient({
  taxNumber: '12345678900', // CPF or CNPJ
  name: 'João Silva',
  paymentInstitution: {
    id: 'bank-id',
    name: 'Banco Example',
  },
  account: {
    branch: '0001',
    number: '12345-6',
    type: 'CHECKING',
  },
});

// Step 2: Create payment request
const paymentRequest = await client.createPaymentRequest({
  recipientId: recipient.id,
  amount: 150.00,
  description: 'Payment for services',
  callbackUrls: {
    success: 'https://your-app.com/payment/success',
    error: 'https://your-app.com/payment/error',
  },
});

// Step 3: Create payment intent for user's account
const paymentIntent = await client.createPaymentIntent({
  paymentRequestId: paymentRequest.id,
  itemId: userItemId, // User's connected bank account
});

// Step 4: Generate connect token for payment authorization
const connectToken = await client.createConnectToken(userItemId, {
  paymentIntentId: paymentIntent.id,
});

// Step 5: Show Connect Widget for authorization
// Frontend receives connectToken and shows widget
```

```typescript
// Frontend: Payment authorization widget
function PaymentAuthorization({ connectToken, onComplete }) {
  return (
    <PluggyConnect
      connectToken={connectToken}
      onSuccess={(data) => {
        // Payment was authorized
        onComplete({ success: true, paymentId: data.payment?.id });
      }}
      onError={(error) => {
        onComplete({ success: false, error });
      }}
    />
  );
}
```

**Using PIX key instead of account details:**

```typescript
// Create recipient using PIX key
const recipient = await client.createPaymentRecipient({
  pixKey: {
    type: 'EMAIL', // EMAIL, CPF, CNPJ, PHONE, EVP
    value: 'recipient@email.com',
  },
});
```

### PIX Key Types

| Type    | Format                          | Example                  |
| ------- | ------------------------------- | ------------------------ |
| `CPF`   | 11 digits                       | `12345678900`            |
| `CNPJ`  | 14 digits                       | `12345678000199`         |
| `EMAIL` | Email address                   | `user@email.com`         |
| `PHONE` | +55 + DDD + number              | `+5511999999999`         |
| `EVP`   | Random key (UUID format)        | `abc123-def456-...`      |

Reference: [Payments](https://docs.pluggy.ai/docs/payments-overview)


---

### Test PIX Payments in Sandbox

**Impact:** CRITICAL

Testing with real payments risks financial loss

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

## HIGH Rules

### Handle Payment Lifecycle States

**Impact:** HIGH

Proper state handling prevents duplicate payments and ensures reliability

Payments go through multiple states. Handle each appropriately to ensure reliability.

**Payment Status Flow:**

```
CREATED → PENDING → PROCESSING → COMPLETED
                              ↘ FAILED
                              ↘ CANCELLED
```

**Incorrect (ignoring status):**

```typescript
// Wrong: Assuming payment succeeded immediately
const payment = await client.createPaymentIntent(request);
await db.orders.update({
  where: { id: orderId },
  data: { status: 'PAID' }, // Payment might still be pending!
});
```

**Correct (track payment status):**

```typescript
// Store payment with initial status
async function createPayment(orderId: string, amount: number) {
  const paymentRequest = await client.createPaymentRequest({
    recipientId: recipientId,
    amount,
  });

  await db.payments.create({
    data: {
      orderId,
      paymentRequestId: paymentRequest.id,
      amount,
      status: 'CREATED',
    },
  });

  return paymentRequest;
}

// Handle status updates via webhook
app.post('/webhooks/pluggy/payments', async (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'payment/completed':
      await handlePaymentCompleted(data.payment);
      break;
    case 'payment/failed':
      await handlePaymentFailed(data.payment);
      break;
    case 'payment/cancelled':
      await handlePaymentCancelled(data.payment);
      break;
  }

  res.status(200).json({ received: true });
});

async function handlePaymentCompleted(payment: Payment) {
  await db.payments.update({
    where: { paymentRequestId: payment.requestId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // Fulfill the order
  await db.orders.update({
    where: { id: payment.orderId },
    data: { status: 'PAID' },
  });

  // Notify customer
  await sendPaymentConfirmation(payment);
}

async function handlePaymentFailed(payment: Payment) {
  await db.payments.update({
    where: { paymentRequestId: payment.requestId },
    data: {
      status: 'FAILED',
      failureReason: payment.error?.message,
    },
  });

  // Notify customer to retry
  await sendPaymentFailedNotification(payment);
}
```

**Idempotency for retries:**

```typescript
// Use idempotency keys to prevent duplicate payments
async function createPaymentIdempotent(orderId: string, amount: number) {
  const idempotencyKey = `payment-${orderId}`;

  // Check if payment already exists
  const existing = await db.payments.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    // Return existing payment instead of creating duplicate
    return existing;
  }

  const paymentRequest = await client.createPaymentRequest({
    recipientId,
    amount,
    idempotencyKey, // Pass to Pluggy API
  });

  return db.payments.create({
    data: {
      orderId,
      paymentRequestId: paymentRequest.id,
      idempotencyKey,
      amount,
      status: 'CREATED',
    },
  });
}
```

### Payment Statuses

| Status       | Meaning                          | Action                  |
| ------------ | -------------------------------- | ----------------------- |
| `CREATED`    | Payment request created          | Wait for authorization  |
| `PENDING`    | User authorized, processing      | Wait for completion     |
| `PROCESSING` | Being processed by bank          | Wait                    |
| `COMPLETED`  | Payment successful               | Fulfill order           |
| `FAILED`     | Payment failed                   | Notify user, allow retry|
| `CANCELLED`  | User cancelled                   | Handle cancellation     |

Reference: [Payment Intent Lifecycle](https://docs.pluggy.ai/docs/payment-intent-lifecycle-and-errors)


---

### Implement Smart Transfers with Preauthorization

**Impact:** HIGH

Smart Transfers enable recurring payments without repeated authorization

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

## MEDIUM Rules

### Implement Scheduled Payments (PIX Agendado)

**Impact:** MEDIUM

Scheduled payments enable future-dated transactions

PIX Agendado allows scheduling payments for future dates. Implement proper scheduling and monitoring.

**Incorrect (immediate payment when scheduled needed):**

```typescript
// Wrong: Processing immediately instead of scheduling
const payment = await client.createPaymentIntent({
  paymentRequestId,
  itemId,
});
// Payment executes immediately, not on scheduled date
```

**Correct (schedule for future date):**

```typescript
// Create scheduled payment
async function schedulePayment(
  itemId: string,
  recipientId: string,
  amount: number,
  scheduledDate: Date
) {
  // Validate scheduled date
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // At least tomorrow

  if (scheduledDate < minDate) {
    throw new Error('Scheduled date must be at least 1 day in the future');
  }

  const paymentRequest = await client.createPaymentRequest({
    recipientId,
    amount,
    scheduledDate: scheduledDate.toISOString().split('T')[0],
    description: `Scheduled payment for ${scheduledDate.toLocaleDateString()}`,
  });

  const paymentIntent = await client.createPaymentIntent({
    paymentRequestId: paymentRequest.id,
    itemId,
  });

  // Store scheduled payment
  await db.scheduledPayments.create({
    data: {
      paymentIntentId: paymentIntent.id,
      scheduledDate,
      amount,
      status: 'SCHEDULED',
    },
  });

  return paymentIntent;
}
```

**Monitor scheduled payments:**

```typescript
// Check scheduled payments status
async function checkScheduledPayments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueToday = await db.scheduledPayments.findMany({
    where: {
      scheduledDate: today,
      status: 'SCHEDULED',
    },
  });

  for (const scheduled of dueToday) {
    const payment = await client.fetchPaymentIntent(scheduled.paymentIntentId);

    if (payment.status === 'COMPLETED') {
      await db.scheduledPayments.update({
        where: { id: scheduled.id },
        data: { status: 'COMPLETED' },
      });
    } else if (payment.status === 'FAILED') {
      await handleFailedScheduledPayment(scheduled);
    }
  }
}

async function handleFailedScheduledPayment(scheduled: ScheduledPayment) {
  await db.scheduledPayments.update({
    where: { id: scheduled.id },
    data: { status: 'FAILED' },
  });

  // Notify user
  await notifyPaymentFailed(scheduled);

  // Optionally reschedule
  if (scheduled.retryCount < 3) {
    const newDate = new Date(scheduled.scheduledDate);
    newDate.setDate(newDate.getDate() + 1);

    await schedulePayment(
      scheduled.itemId,
      scheduled.recipientId,
      scheduled.amount,
      newDate
    );
  }
}
```

**Cancel scheduled payment:**

```typescript
// Allow users to cancel scheduled payments
async function cancelScheduledPayment(paymentIntentId: string, userId: string) {
  // Verify ownership
  const scheduled = await db.scheduledPayments.findFirst({
    where: {
      paymentIntentId,
      userId,
      status: 'SCHEDULED',
    },
  });

  if (!scheduled) {
    throw new Error('Scheduled payment not found');
  }

  // Check if still cancellable (before scheduled date)
  if (new Date(scheduled.scheduledDate) <= new Date()) {
    throw new Error('Cannot cancel payment on or after scheduled date');
  }

  // Cancel with Pluggy
  await client.cancelPaymentIntent(paymentIntentId);

  await db.scheduledPayments.update({
    where: { id: scheduled.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  return { success: true };
}
```

**Display upcoming scheduled payments:**

```typescript
async function getUpcomingPayments(userId: string) {
  const upcoming = await db.scheduledPayments.findMany({
    where: {
      userId,
      status: 'SCHEDULED',
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: 'asc' },
    include: { recipient: true },
  });

  return upcoming.map(p => ({
    id: p.id,
    amount: p.amount,
    scheduledDate: p.scheduledDate,
    recipient: p.recipient.name,
    canCancel: new Date(p.scheduledDate) > new Date(),
  }));
}
```

### Scheduling Rules

| Rule              | Description                          |
| ----------------- | ------------------------------------ |
| Minimum date      | At least 1 business day in future    |
| Maximum date      | Up to 365 days in future             |
| Cut-off time      | Varies by bank (usually 17:00 BRT)   |
| Cancellation      | Until scheduled date                 |

Reference: [Scheduled Payments](https://docs.pluggy.ai/docs/scheduled-payments-pix-agendado)


---

### Manage Boletos Correctly

**Impact:** MEDIUM

Proper Boleto handling improves payment success rates

Boletos are Brazilian payment slips. Handle generation, tracking, and expiration properly.

**Incorrect (basic generation without tracking):**

```typescript
// Wrong: Generate boleto without proper tracking
const boleto = await generateBoleto({
  amount: 100,
  customer: 'João',
});
// No expiration handling, no status tracking
```

**Correct (full Boleto management):**

```typescript
interface BoletoRequest {
  amount: number;
  customerId: string;
  dueDate: Date;
  description: string;
}

async function createBoleto(request: BoletoRequest) {
  // Validate due date (must be future)
  if (request.dueDate < new Date()) {
    throw new Error('Due date must be in the future');
  }

  const boleto = await client.createBoleto({
    amount: request.amount,
    dueDate: request.dueDate.toISOString().split('T')[0],
    description: request.description,
    payer: {
      taxNumber: request.customerId,
    },
  });

  // Store boleto for tracking
  await db.boletos.create({
    data: {
      boletoId: boleto.id,
      barcode: boleto.barcode,
      digitableLine: boleto.digitableLine,
      amount: request.amount,
      dueDate: request.dueDate,
      customerId: request.customerId,
      status: 'PENDING',
      pdfUrl: boleto.pdfUrl,
    },
  });

  return boleto;
}

// Send boleto to customer
async function sendBoletoToCustomer(boletoId: string) {
  const boleto = await db.boletos.findUnique({
    where: { boletoId },
    include: { customer: true },
  });

  await sendEmail({
    to: boleto.customer.email,
    subject: `Boleto - ${boleto.description}`,
    html: `
      <p>Seu boleto está disponível:</p>
      <p>Valor: R$ ${boleto.amount.toFixed(2)}</p>
      <p>Vencimento: ${formatDate(boleto.dueDate)}</p>
      <p>Linha digitável: ${boleto.digitableLine}</p>
      <a href="${boleto.pdfUrl}">Baixar PDF</a>
    `,
  });
}
```

**Handle Boleto expiration:**

```typescript
// Check for expiring boletos and send reminders
async function checkExpiringBoletos() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expiringSoon = await db.boletos.findMany({
    where: {
      dueDate: { lte: tomorrow },
      status: 'PENDING',
    },
    include: { customer: true },
  });

  for (const boleto of expiringSoon) {
    await sendExpirationReminder(boleto);
  }
}

// Handle expired boletos
async function handleExpiredBoletos() {
  const today = new Date();

  const expired = await db.boletos.findMany({
    where: {
      dueDate: { lt: today },
      status: 'PENDING',
    },
  });

  for (const boleto of expired) {
    await db.boletos.update({
      where: { id: boleto.id },
      data: { status: 'EXPIRED' },
    });

    // Optionally generate new boleto with updated due date
    if (boleto.autoRenew) {
      await createBoleto({
        ...boleto,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }
  }
}
```

**Track Boleto payment:**

```typescript
// Webhook handler for Boleto payment
app.post('/webhooks/pluggy/boleto', async (req, res) => {
  const { event, data } = req.body;

  if (event === 'boleto/paid') {
    await db.boletos.update({
      where: { boletoId: data.boleto.id },
      data: {
        status: 'PAID',
        paidAt: new Date(data.boleto.paidAt),
        paidAmount: data.boleto.paidAmount,
      },
    });

    // Fulfill order
    await fulfillOrder(data.boleto.orderId);
  }

  res.status(200).json({ received: true });
});
```

### Boleto Fields

| Field           | Description                      |
| --------------- | -------------------------------- |
| `barcode`       | 44-digit barcode                 |
| `digitableLine` | Human-readable payment line      |
| `pdfUrl`        | URL to download PDF              |
| `dueDate`       | Payment due date                 |
| `status`        | PENDING, PAID, EXPIRED, CANCELLED|

Reference: [Boleto Management](https://docs.pluggy.ai/docs/boleto-management-api)

---

## Quick Reference

| Rule | Impact | Tags |
| ---- | ------ | ---- |
| Implement PIX Payment Flow Correctly | CRITICAL | pix, payments, initiation, brazil |
| Test PIX Payments in Sandbox | CRITICAL | pix, sandbox, testing, development |
| Handle Payment Lifecycle States | HIGH | payments, lifecycle, status, webhooks |
| Implement Smart Transfers with Preauthorization | HIGH | smart-transfers, preauthorization, recurring, automation |
| Implement Scheduled Payments (PIX Agendado) | MEDIUM | pix, scheduled, agendado, automation |
| Manage Boletos Correctly | MEDIUM | boleto, payments, brazil, billing |
