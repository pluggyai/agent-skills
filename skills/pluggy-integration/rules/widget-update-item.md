---
title: Use Connect Token with Item ID for Updates
impact: HIGH
impactDescription: Correct token setup enables credential updates without re-authentication
tags: connect-widget, item-update, reconnection
---

## Use Connect Token with Item ID for Updates

When a connection needs credential updates (expired password, MFA required), generate a connect token with the existing Item ID to allow seamless re-authentication.

**Incorrect (creating new connection instead of updating):**

```typescript
// Wrong: Creates a new Item instead of updating existing one
const connectToken = await client.createConnectToken();

// User has to reconnect from scratch
<PluggyConnect connectToken={connectToken} />
```

**Correct (update existing Item):**

```typescript
// Backend: Generate connect token for specific Item
app.post('/api/pluggy/connect-token/:itemId', async (req, res) => {
  const { itemId } = req.params;

  // Pass itemId to update existing connection
  const connectToken = await client.createConnectToken(itemId);

  res.json({ accessToken: connectToken.accessToken });
});
```

```typescript
// Frontend: Use token to update credentials
function UpdateConnection({ itemId }: { itemId: string }) {
  const [connectToken, setConnectToken] = useState<string | null>(null);

  useEffect(() => {
    async function getUpdateToken() {
      const response = await fetch(`/api/pluggy/connect-token/${itemId}`);
      const { accessToken } = await response.json();
      setConnectToken(accessToken);
    }
    getUpdateToken();
  }, [itemId]);

  if (!connectToken) return <div>Loading...</div>;

  return (
    <PluggyConnect
      connectToken={connectToken}
      onSuccess={() => {
        console.log('Credentials updated successfully');
      }}
    />
  );
}
```

### When to Update an Item

| Status Code             | Meaning                    | Action Required      |
| ----------------------- | -------------------------- | -------------------- |
| `LOGIN_ERROR`           | Invalid credentials        | Update credentials   |
| `WAITING_USER_INPUT`    | MFA required               | Send MFA response    |
| `OUTDATED`              | Data is stale              | Trigger sync         |
| `INVALID_CREDENTIALS`   | Password changed           | Update credentials   |

Reference: [Updating an Item](https://docs.pluggy.ai/docs/updating-an-item)
