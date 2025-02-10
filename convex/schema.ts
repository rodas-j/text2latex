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
    subscriptionTier: v.optional(v.string()), // e.g., 'free', 'pro', 'enterprise'
    subscriptionStatus: v.optional(v.string()), // e.g., 'active', 'cancelled', 'past_due'
    subscriptionPeriodEnd: v.optional(v.number()), // Unix timestamp
    // Metadata
    lastSyncedAt: v.number(), // Unix timestamp of last sync with Clerk
    createdAt: v.number(), // Unix timestamp of user creation
  }).index("by_clerk_id", ["clerkId"]),

  conversions: defineTable({
    userId: v.string(), // Reference to users.clerkId
    input: v.string(),
    output: v.string(),
    createdAt: v.number(), // Unix timestamp
  }).index("by_user", ["userId"]),

  favorites: defineTable({
    userId: v.string(), // Reference to users.clerkId
    conversionId: v.id("conversions"), // Reference to the conversion
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_and_conversion", ["userId", "conversionId"]),
});
