# User Blocking & Anonymous Rate Limiting Setup

## Overview

Your Text2LaTeX app now supports:

1. **Anonymous Users**: 5 free conversions per day, then must sign up
2. **Authenticated Users**: Higher limits but can be blocked by admins
3. **Admin System**: Block/unblock users, audit logs, admin management

## Schema Changes Made

### New Tables Added:

- `anonymousSessions`: Track anonymous users and daily limits
- `adminActions`: Audit log for admin actions

### Updated Tables:

- `users`: Added blocking fields (`isBlocked`, `blockedReason`, etc.)
- `conversions`: Added `isAnonymous` field (made optional for existing data)

## Key Features

### Anonymous User Flow

1. **First Visit**: Gets 5 free conversions per day
2. **Session Tracking**: Uses client-generated sessionId
3. **Daily Reset**: Limits reset at midnight UTC
4. **Conversion Limit**: After 5 conversions, must sign up

### Authenticated User Flow

1. **Higher Limits**: 10 conversions per minute (burst: 15)
2. **User Blocking**: Admins can block abusive users
3. **Automatic Check**: Blocked users get immediate error

### Admin Features

1. **Block Users**: `blockUser(targetClerkId, reason)`
2. **Unblock Users**: `unblockUser(targetClerkId, reason?)`
3. **View Blocked**: `getBlockedUsers()`
4. **Audit Logs**: `getAdminLogs(limit?, targetUserId?)`
5. **Manage Admins**: `makeUserAdmin()`, `removeAdminPrivileges()`

## Usage

### Client-Side Integration

For **anonymous users**, include sessionId:

```typescript
// Generate session ID on first visit
const sessionId = localStorage.getItem("sessionId") || crypto.randomUUID();
localStorage.setItem("sessionId", sessionId);

// Call with sessionId
const result = await convertToLatex({
  text: "E=mc^2",
  sessionId,
  ipAddress: "optional",
});

// Check remaining conversions
console.log(result.remainingFreeConversions); // 0-5 for anonymous users
```

For **authenticated users**:

```typescript
// No sessionId needed - uses Clerk auth
const result = await convertToLatex({ text: "E=mc^2" });
console.log(result.isAuthenticated); // true
```

### Admin Operations

```typescript
// Check if current user is admin
const isAdmin = await ctx.query(api.admin.isAdmin);

// Block a user
await ctx.mutation(api.admin.blockUser, {
  targetClerkId: "user_123",
  reason: "Spam/abuse",
});

// View blocked users
const blockedUsers = await ctx.query(api.admin.getBlockedUsers);

// View admin logs
const logs = await ctx.query(api.admin.getAdminLogs, { limit: 20 });
```

## Rate Limits

### Anonymous Users

- **Daily Limit**: 5 conversions per day
- **Global Protection**: 200 requests/minute across all users

### Authenticated Users

- **Per User**: 10 conversions/minute (burst: 15)
- **Favorites**: 10 actions/minute (burst: 15)
- **Save History**: 20 saves/minute (burst: 30)
- **Global Protection**: 200 requests/minute across all users

## Error Handling

### Rate Limit Errors

```typescript
try {
  await convertToLatex({ text: "math", sessionId });
} catch (error) {
  if (error.data?.kind === "RateLimited") {
    const retryAfter = error.data.retryAfter; // milliseconds
    console.log(`Try again in ${Math.ceil(retryAfter / 1000)} seconds`);
  }
}
```

### Anonymous Limit Errors

```typescript
try {
  await convertToLatex({ text: "math", sessionId });
} catch (error) {
  if (error.message.includes("Daily limit reached")) {
    // Redirect to sign-up flow
    window.location.href = "/sign-up";
  }
}
```

### Blocked User Errors

```typescript
try {
  await convertToLatex({ text: "math" });
} catch (error) {
  if (error.message.includes("User access blocked")) {
    // Show blocked user message
    alert("Your account has been suspended. Contact support.");
  }
}
```

## Making Your First Admin

Since admin status is required to create other admins, you'll need to manually set the first admin in your database:

1. **Find your user** in Convex dashboard → Data → users table
2. **Edit the record** and set `isAdmin: true`
3. **Now you can use admin functions** to manage other users

## Security Notes

1. **Admin Actions Logged**: All admin actions are recorded with timestamps
2. **Self-Protection**: Admins can't remove their own admin status
3. **IP Tracking**: Anonymous sessions can track IP for additional security
4. **Session Isolation**: Each anonymous session is tracked separately

## Next Steps

1. **Deploy Schema**: `npx convex dev` to apply schema changes
2. **Set First Admin**: Manually in Convex dashboard
3. **Update Client**: Add sessionId handling for anonymous users
4. **Test Limits**: Verify anonymous limits work as expected
5. **Monitor Usage**: Watch admin logs and user behavior

## Troubleshooting

### "Document does not match schema" Error

This happens with existing data. The schema has been updated to make `isAnonymous` optional to handle existing conversions.

### Rate Limiting Not Working

1. Check that components are properly imported
2. Verify Convex deployment succeeded
3. Ensure plan limits are resolved

### Admin Functions Not Working

1. Verify user has `isAdmin: true` in database
2. Check Clerk authentication is working
3. Verify function permissions in Convex dashboard
