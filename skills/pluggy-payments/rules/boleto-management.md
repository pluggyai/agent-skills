---
title: Manage Boletos Correctly
impact: MEDIUM
impactDescription: Proper Boleto handling improves payment success rates
tags: boleto, payments, brazil, billing
---

## Manage Boletos Correctly

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
