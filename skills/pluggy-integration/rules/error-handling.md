---
title: Handle API Errors Gracefully
impact: MEDIUM
impactDescription: Proper error handling improves user experience and debugging
tags: errors, error-handling, api, troubleshooting
---

## Handle API Errors Gracefully

Pluggy API returns specific error codes. Handle them appropriately to provide good user experience and enable debugging.

**Incorrect (generic error handling):**

```typescript
// Wrong: Loses valuable error information
try {
  await client.fetchAccounts(itemId);
} catch (error) {
  console.log('Something went wrong');
}
```

**Correct (specific error handling):**

```typescript
import { PluggyClient, PluggyError } from 'pluggy-sdk';

async function fetchAccountsWithErrorHandling(itemId: string) {
  try {
    return await client.fetchAccounts(itemId);
  } catch (error) {
    if (error instanceof PluggyError) {
      switch (error.code) {
        case 'ITEM_NOT_FOUND':
          throw new Error('Connection not found. Please reconnect your account.');

        case 'INVALID_API_KEY':
          // Log for debugging, don't expose to user
          console.error('API key invalid or expired');
          throw new Error('Authentication error. Please try again.');

        case 'RATE_LIMIT_EXCEEDED':
          // Implement exponential backoff
          await sleep(1000);
          return fetchAccountsWithErrorHandling(itemId);

        case 'ITEM_LOGIN_ERROR':
          throw new Error('Bank credentials have changed. Please update your connection.');

        case 'CONNECTOR_UNAVAILABLE':
          throw new Error('Bank is temporarily unavailable. Please try again later.');

        default:
          console.error('Pluggy error:', error.code, error.message);
          throw new Error('Unable to fetch accounts. Please try again.');
      }
    }

    // Unknown error
    console.error('Unexpected error:', error);
    throw new Error('An unexpected error occurred.');
  }
}
```

**HTTP status code handling:**

```typescript
async function handlePluggyResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  const error = await response.json();

  switch (response.status) {
    case 400:
      // Bad request - invalid parameters
      throw new ValidationError(error.message);

    case 401:
      // Unauthorized - invalid or expired API key
      await refreshApiKey();
      throw new AuthError('Please retry the request');

    case 403:
      // Forbidden - insufficient permissions
      throw new PermissionError('Access denied');

    case 404:
      // Not found - Item or resource doesn't exist
      throw new NotFoundError(error.message);

    case 429:
      // Rate limited
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(`Rate limited. Retry after ${retryAfter}s`);

    case 500:
    case 502:
    case 503:
      // Server error - retry with backoff
      throw new ServerError('Pluggy service temporarily unavailable');

    default:
      throw new Error(`API error: ${response.status}`);
  }
}
```

### Common Error Codes

| Code                    | Meaning                         | User Action              |
| ----------------------- | ------------------------------- | ------------------------ |
| `INVALID_CREDENTIALS`   | Wrong username/password         | Update credentials       |
| `WAITING_USER_INPUT`    | MFA required                    | Complete MFA             |
| `CONNECTOR_UNAVAILABLE` | Bank API down                   | Wait and retry           |
| `ITEM_NOT_FOUND`        | Item was deleted                | Reconnect account        |
| `RATE_LIMIT_EXCEEDED`   | Too many requests               | Implement backoff        |
| `INVALID_API_KEY`       | API key expired/invalid         | Refresh token            |

Reference: [Error Codes](https://docs.pluggy.ai/docs/errors-codes)
