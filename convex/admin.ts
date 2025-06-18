import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Check if current user is an admin
export const isAdmin = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?.isAdmin === true;
  },
});

// Get user by Clerk ID for admin operations
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Check if requesting user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    targetClerkId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    // Get target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) throw new Error("User not found");
    if (targetUser.isBlocked) throw new Error("User is already blocked");

    // Block the user
    await ctx.db.patch(targetUser._id, {
      isBlocked: true,
      blockedAt: Date.now(),
      blockedBy: identity.subject,
      blockedReason: args.reason,
    });

    // Log the admin action
    await ctx.db.insert("adminActions", {
      adminId: identity.subject,
      action: "block_user",
      targetUserId: args.targetClerkId,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    targetClerkId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    // Get target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) throw new Error("User not found");
    if (!targetUser.isBlocked) throw new Error("User is not blocked");

    // Unblock the user
    await ctx.db.patch(targetUser._id, {
      isBlocked: false,
      blockedAt: undefined,
      blockedBy: undefined,
      blockedReason: undefined,
    });

    // Log the admin action
    await ctx.db.insert("adminActions", {
      adminId: identity.subject,
      action: "unblock_user",
      targetUserId: args.targetClerkId,
      reason: args.reason || "Unblocked by admin",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Get blocked users with limit
export const getBlockedUsers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    const limit = Math.min(args.limit || 50, 100); // Default 50, max 100

    return await ctx.db
      .query("users")
      .withIndex("by_blocked", (q) => q.eq("isBlocked", true))
      .take(limit);
  },
});

// Get admin action logs with limit
export const getAdminLogs = query({
  args: {
    limit: v.optional(v.number()),
    targetUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    const limit = Math.min(args.limit || 50, 100); // Default 50, max 100

    if (args.targetUserId) {
      return await ctx.db
        .query("adminActions")
        .withIndex("by_target_user", (q) =>
          q.eq("targetUserId", args.targetUserId)
        )
        .order("desc")
        .take(limit);
    } else {
      return await ctx.db
        .query("adminActions")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit);
    }
  },
});

// Make a user an admin (only for existing admins)
export const makeUserAdmin = mutation({
  args: {
    targetClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    // Get target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) throw new Error("User not found");
    if (targetUser.isAdmin) throw new Error("User is already an admin");

    // Make user admin
    await ctx.db.patch(targetUser._id, {
      isAdmin: true,
    });

    // Log the admin action
    await ctx.db.insert("adminActions", {
      adminId: identity.subject,
      action: "make_admin",
      targetUserId: args.targetClerkId,
      reason: "Granted admin privileges",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove admin privileges (only for existing admins)
export const removeAdminPrivileges = mutation({
  args: {
    targetClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if requesting user is admin
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    // Prevent self-removal of admin privileges
    if (identity.subject === args.targetClerkId) {
      throw new Error("Cannot remove your own admin privileges");
    }

    // Get target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) throw new Error("User not found");
    if (!targetUser.isAdmin) throw new Error("User is not an admin");

    // Remove admin privileges
    await ctx.db.patch(targetUser._id, {
      isAdmin: false,
    });

    // Log the admin action
    await ctx.db.insert("adminActions", {
      adminId: identity.subject,
      action: "remove_admin",
      targetUserId: args.targetClerkId,
      reason: "Removed admin privileges",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
