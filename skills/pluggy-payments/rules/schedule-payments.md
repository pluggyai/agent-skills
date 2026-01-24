---
title: Implement Scheduled Payments (PIX Agendado)
impact: MEDIUM
impactDescription: Scheduled payments enable future-dated transactions
tags: pix, scheduled, agendado, automation
---

## Implement Scheduled Payments (PIX Agendado)

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
