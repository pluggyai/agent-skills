---
title: Delete Items When Users Revoke Consent
impact: HIGH
impactDescription: Failing to delete Items violates user consent and data regulations
tags: item, delete, consent, gdpr, lgpd
---

## Delete Items When Users Revoke Consent

When users disconnect their accounts or revoke consent, delete the corresponding Item to comply with data protection regulations (LGPD, GDPR).

**Incorrect (keeping Item after user requests deletion):**

```typescript
// Wrong: Just marking as "disconnected" in your database
await db.items.update({
  where: { itemId },
  data: { status: 'disconnected' },
});
// Item still exists in Pluggy, data still accessible
```

**Correct (delete Item from Pluggy):**

```typescript
app.delete('/api/connections/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify ownership
    const connection = await db.connections.findFirst({
      where: { itemId, userId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // 2. Delete from Pluggy (removes all associated data)
    await client.deleteItem(itemId);

    // 3. Remove from your database
    await db.connections.delete({
      where: { id: connection.id },
    });

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Failed to delete connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});
```

**Handling deletion in bulk (user account deletion):**

```typescript
async function deleteUserData(userId: string) {
  // Get all user connections
  const connections = await db.connections.findMany({
    where: { userId },
  });

  // Delete each Item from Pluggy
  const deletionPromises = connections.map(async (conn) => {
    try {
      await client.deleteItem(conn.itemId);
    } catch (error) {
      // Log but continue - Item may already be deleted
      console.error(`Failed to delete Item ${conn.itemId}:`, error);
    }
  });

  await Promise.all(deletionPromises);

  // Clean up local database
  await db.connections.deleteMany({
    where: { userId },
  });
}
```

### What Gets Deleted

When you delete an Item, Pluggy removes:

- All account data
- All transaction history
- All investment data
- All identity information
- All loan data
- The connection itself

Reference: [Deleting Items](https://docs.pluggy.ai/docs/item)
