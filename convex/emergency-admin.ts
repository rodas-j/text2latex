import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * EMERGENCY: Internal function to block a user without authentication
 * Use only in production emergencies when normal admin flow isn't available
 */
export const emergencyBlockUser = internalMutation({
  args: {
    targetClerkId: v.string(),
    reason: v.string(),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) {
      throw new Error(`User with Clerk ID ${args.targetClerkId} not found`);
    }

    if (targetUser.isBlocked) {
      throw new Error(`User ${args.targetClerkId} is already blocked`);
    }

    // Block the user
    await ctx.db.patch(targetUser._id, {
      isBlocked: true,
      blockedAt: Date.now(),
      blockedBy: "EMERGENCY_SYSTEM", // Special identifier for emergency blocks
      blockedReason: args.reason,
    });

    // Log the emergency action
    const actionId = await ctx.db.insert("adminActions", {
      adminId: "EMERGENCY_SYSTEM",
      action: "blockUser",
      targetUserId: targetUser._id,
      reason: args.reason,
      createdAt: Date.now(),
      metadata: {
        emergency: true,
        adminNote: args.adminNote || "Emergency block via internal function",
        targetClerkId: args.targetClerkId,
        targetUserName: targetUser.firstName || "Unknown",
      },
    });

    return {
      success: true,
      userId: targetUser._id,
      actionId,
      message: `User ${args.targetClerkId} blocked via emergency system`,
    };
  },
});

/**
 * EMERGENCY: Internal function to unblock a user without authentication
 */
export const emergencyUnblockUser = internalMutation({
  args: {
    targetClerkId: v.string(),
    reason: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) {
      throw new Error(`User with Clerk ID ${args.targetClerkId} not found`);
    }

    if (!targetUser.isBlocked) {
      throw new Error(`User ${args.targetClerkId} is not blocked`);
    }

    // Unblock the user
    await ctx.db.patch(targetUser._id, {
      isBlocked: false,
      blockedAt: undefined,
      blockedBy: undefined,
      blockedReason: undefined,
    });

    // Log the emergency action
    const actionId = await ctx.db.insert("adminActions", {
      adminId: "EMERGENCY_SYSTEM",
      action: "unblockUser",
      targetUserId: targetUser._id,
      reason: args.reason || "Emergency unblock",
      createdAt: Date.now(),
      metadata: {
        emergency: true,
        adminNote: args.adminNote || "Emergency unblock via internal function",
        targetClerkId: args.targetClerkId,
        targetUserName: targetUser.firstName || "Unknown",
      },
    });

    return {
      success: true,
      userId: targetUser._id,
      actionId,
      message: `User ${args.targetClerkId} unblocked via emergency system`,
    };
  },
});
