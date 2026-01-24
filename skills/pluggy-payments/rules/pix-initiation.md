---
title: Implement PIX Payment Flow Correctly
impact: CRITICAL
impactDescription: Incorrect PIX flow causes payment failures and poor UX
tags: pix, payments, initiation, brazil
---

## Implement PIX Payment Flow Correctly

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
