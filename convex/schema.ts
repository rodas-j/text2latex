import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk user ID
    clerkId: v.string(),
    // Basic user info
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    // Subscription related fields
    subscriptionTier: v.optional(v.string()), // 'free' or 'pro'
    subscriptionStatus: v.optional(v.string()), // 'active', 'cancelled', 'past_due'
    subscriptionPeriodEnd: v.optional(v.number()), // Unix timestamp
    // Stripe integration
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    stripeSubscriptionId: v.optional(v.string()), // Stripe subscription ID
    stripePriceId: v.optional(v.string()), // Stripe price ID (monthly/yearly)
    // Daily usage tracking for free tier
    conversionsToday: v.optional(v.number()), // Number of conversions today
    dailyResetDate: v.optional(v.string()), // Date string (YYYY-MM-DD) for daily reset
    // User status and permissions
    isBlocked: v.optional(v.boolean()), // Whether user is blocked
    isAdmin: v.optional(v.boolean()), // Whether user has admin privileges
    blockedAt: v.optional(v.number()), // When user was blocked
    blockedBy: v.optional(v.string()), // Admin who blocked the user
    blockedReason: v.optional(v.string()), // Reason for blocking
    // Metadata
    lastSyncedAt: v.number(), // Unix timestamp of last sync with Clerk
    createdAt: v.number(), // Unix timestamp of user creation
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_blocked", ["isBlocked"])
    .index("by_admin", ["isAdmin"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // Track anonymous user sessions and their daily usage
  anonymousSessions: defineTable({
    sessionId: v.string(), // Client-generated session ID
    ipAddress: v.optional(v.string()), // For additional tracking
    conversionsToday: v.number(), // Number of conversions today
    lastConversionAt: v.number(), // Unix timestamp of last conversion
    createdAt: v.number(), // Unix timestamp when session started
    // Reset daily - we'll use this to track daily limits
    dailyResetDate: v.string(), // Date string (YYYY-MM-DD) for daily reset
  })
    .index("by_session_id", ["sessionId"])
    .index("by_daily_reset", ["dailyResetDate"])
    .index("by_ip", ["ipAddress"]),

  // Admin action logs for auditing
  adminActions: defineTable({
    adminId: v.string(), // Clerk ID of admin performing action
    action: v.string(), // 'block_user', 'unblock_user', 'delete_content', etc.
    targetUserId: v.optional(v.string()), // User being acted upon
    targetSessionId: v.optional(v.string()), // Anonymous session being acted upon
    reason: v.optional(v.string()), // Reason for action
    metadata: v.optional(v.any()), // Additional action data
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_admin", ["adminId"])
    .index("by_target_user", ["targetUserId"])
    .index("by_action", ["action"])
    .index("by_created_at", ["createdAt"]),

  conversions: defineTable({
    userId: v.optional(v.string()), // Reference to users.clerkId (optional for anonymous)
    sessionId: v.optional(v.string()), // For anonymous users
    input: v.string(),
    output: v.string(),
    isAnonymous: v.optional(v.boolean()), // Whether this was an anonymous conversion (optional for existing data)
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_anonymous", ["isAnonymous"]),

  fileConversions: defineTable({
    userId: v.optional(v.string()), // Reference to users.clerkId (optional for anonymous)
    sessionId: v.optional(v.string()), // For anonymous users
    tool: v.union(
      v.literal("latex-to-word"),
      v.literal("image-to-latex"),
      v.literal("pdf-to-latex"),
      v.literal("latex-to-image")
    ),
    inputStorageId: v.optional(v.id("_storage")),
    inputText: v.optional(v.string()),
    outputStorageId: v.optional(v.id("_storage")),
    outputText: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    converterVersion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_tool", ["tool"])
    .index("by_status", ["status"])
    .index("by_user_tool_created", ["userId", "tool", "createdAt"])
    .index("by_session_tool_created", ["sessionId", "tool", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  favorites: defineTable({
    userId: v.string(), // Reference to users.clerkId
    conversionId: v.id("conversions"), // Reference to the conversion
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_and_conversion", ["userId", "conversionId"]),
});
