# Rate Limiting Setup for Text2LaTeX

This guide explains how to enable rate limiting for your Convex actions and mutations using the official Convex rate limiter component.

## Prerequisites

1. **Resolve Convex Plan Limits**: Your team has exceeded the Starter plan limits. You'll need to either:

   - Upgrade to a paid plan at https://dashboard.convex.dev/t/habesha-labs
   - Or reduce usage to stay within Starter limits

2. **Install Dependencies**: The rate limiter component is already installed:
   ```bash
   npm install @convex-dev/rate-limiter
   ```

## Setup Steps

### 1. Deploy Configuration

Once plan limits are resolved, deploy the configuration:

```bash
npx convex dev
```

This will generate the necessary `components` export in your `_generated/server.ts` file.

### 2. Enable Rate Limiting

#### In `convex/conversions.ts`:

1. **Uncomment the rate limiter configuration** (lines ~8-18):

```typescript
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Per-user rate limits
  saveConversion: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  toggleFavorite: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  convertToLatex: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 10,
  },

  // Global rate limits for expensive operations
  globalConversion: {
    kind: "fixed window",
    rate: 100,
    period: MINUTE,
    shards: 5,
  },
});
```

2. **Uncomment the import** (line ~7):

```typescript
import { components } from "./_generated/server";
```

3. **Uncomment rate limiting calls** in each function:
   - In `saveConversion` mutation (lines ~40-44)
   - In `toggleFavorite` mutation (lines ~70-74)
   - In `convertToLatex` action (lines ~200-210)

#### In `convex/http.ts`:

1. **Uncomment the rate limiter configuration** (lines ~8-13):

```typescript
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Global rate limit for webhook endpoints
  webhookRequests: {
    kind: "fixed window",
    rate: 200,
    period: MINUTE,
    shards: 3,
  },
});
```

2. **Uncomment the import** (line ~6):

```typescript
import { components } from "./_generated/server";
```

3. **Uncomment rate limiting call** in the webhook handler (lines ~20-24)

## Rate Limiting Configuration

### Per-User Limits

- **saveConversion**: 20 requests/minute, burst capacity of 30
- **toggleFavorite**: 10 requests/minute, burst capacity of 15
- **convertToLatex**: 5 requests/minute, burst capacity of 10

### Global Limits

- **globalConversion**: 100 requests/minute across all users (sharded for performance)
- **webhookRequests**: 200 requests/minute for HTTP webhooks (sharded for performance)

### Rate Limiting Strategies

1. **Token Bucket** (used for user actions):

   - Allows burst traffic when user has been inactive
   - Tokens accumulate up to capacity when not used
   - Provides smooth rate limiting over time

2. **Fixed Window** (used for global limits):
   - Strict limits per time window
   - Good for protecting against overall system abuse
   - Uses sharding for high-throughput scenarios

## Error Handling

When rate limits are exceeded, the functions will throw a `ConvexError` with:

- `kind: "RateLimited"`
- `name`: The rate limit name that was exceeded
- `retryAfter`: Milliseconds until the request could succeed

Example client-side error handling:

```typescript
try {
  await convertToLatex({ text: "E=mc^2" });
} catch (error) {
  if (error.data?.kind === "RateLimited") {
    const retryAfterSeconds = Math.ceil(error.data.retryAfter / 1000);
    console.log(`Rate limited. Try again in ${retryAfterSeconds} seconds.`);
  }
}
```

## Customization

You can adjust the rate limits based on your needs:

- **Increase limits** for premium users
- **Add new rate limits** for other operations
- **Adjust time periods** (SECOND, MINUTE, HOUR are available)
- **Configure sharding** for high-traffic global limits

## Monitoring

Monitor rate limiting effectiveness through:

1. Convex dashboard logs
2. Client-side error tracking
3. User feedback about rate limiting

## Security Benefits

Rate limiting provides protection against:

- **API abuse**: Prevents excessive calls to expensive Gemini API
- **DoS attacks**: Limits impact of malicious users
- **Cost control**: Prevents unexpected API bills
- **Resource protection**: Ensures fair usage across all users
- **Webhook protection**: Prevents abuse of HTTP endpoints

## Next Steps

1. Resolve the plan limit issue
2. Deploy the configuration
3. Uncomment the rate limiting code
4. Test the rate limits with your application
5. Monitor and adjust limits as needed

For more information, see the [Convex Rate Limiter documentation](https://www.convex.dev/components/rate-limiter).
