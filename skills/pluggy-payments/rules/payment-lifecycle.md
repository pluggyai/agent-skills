---
title: Handle Payment Lifecycle States
impact: HIGH
impactDescription: Proper state handling prevents duplicate payments and ensures reliability
tags: payments, lifecycle, status, webhooks
---

## Handle Payment Lifecycle States

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
