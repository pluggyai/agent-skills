---
title: Handle MFA Flows Correctly
impact: MEDIUM
impactDescription: Proper MFA handling enables users to complete authentication
tags: mfa, authentication, user-input, security
---

## Handle MFA Flows Correctly

Some banks require Multi-Factor Authentication (MFA). When an Item enters `WAITING_USER_INPUT` status, you need to collect and submit the MFA response.

**Incorrect (ignoring MFA requirement):**

```typescript
// Wrong: Not handling MFA status
const item = await client.fetchItem(itemId);
if (item.status !== 'UPDATED') {
  throw new Error('Item not ready');
  // User can never complete MFA!
}
```

**Correct (handle MFA flow):**

```typescript
async function checkItemAndHandleMFA(itemId: string) {
  const item = await client.fetchItem(itemId);

  if (item.status === 'WAITING_USER_INPUT' && item.parameter) {
    // Return MFA requirements to frontend
    return {
      needsMFA: true,
      mfaParameter: {
        name: item.parameter.name,
        label: item.parameter.label,
        type: item.parameter.type, // 'text', 'password', 'select', etc.
        options: item.parameter.options, // For select type
      },
    };
  }

  if (item.status === 'UPDATED') {
    return { needsMFA: false, ready: true };
  }

  return { needsMFA: false, ready: false, status: item.status };
}
```

```typescript
// API endpoint to submit MFA response
app.post('/api/items/:itemId/mfa', async (req, res) => {
  const { itemId } = req.params;
  const { mfaValue } = req.body;

  try {
    // Submit MFA response to Pluggy
    await client.updateItemMFA(itemId, {
      parameter: mfaValue,
    });

    res.json({ success: true, message: 'MFA submitted' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid MFA response' });
  }
});
```

```typescript
// Frontend: MFA input component
function MFAInput({ itemId, parameter, onComplete }) {
  const [value, setValue] = useState('');

  const handleSubmit = async () => {
    const response = await fetch(`/api/items/${itemId}/mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaValue: value }),
    });

    if (response.ok) {
      onComplete();
    }
  };

  return (
    <div>
      <label>{parameter.label}</label>
      {parameter.type === 'select' ? (
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          {parameter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={parameter.type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### MFA Parameter Types

| Type       | Description                    | UI Component          |
| ---------- | ------------------------------ | --------------------- |
| `text`     | Free text input                | Text input            |
| `password` | Hidden input                   | Password input        |
| `number`   | Numeric code                   | Number input          |
| `select`   | Choose from options            | Select dropdown       |

Reference: [MFA Handling](https://docs.pluggy.ai/docs/item)
