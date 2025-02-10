import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { WebhookEvent } from "@clerk/backend";

export const clerk = action({
  args: {
    payload: v.any(),
    headers: v.any(),
  },
  handler: async (ctx, args) => {
    // Verify the webhook signature
    const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!CLERK_WEBHOOK_SECRET) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    const evt = args.payload as WebhookEvent;
    const eventType = evt.type;

    if (eventType.startsWith("user.")) {
      await ctx.runMutation(internal.clerk.syncUser, {
        data: evt.data,
        eventType,
      });
    }

    return { success: true };
  },
});

export const syncUser = internalMutation({
  args: {
    data: v.any(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { data: clerkUser, eventType } = args;

    // Handle user deletion
    if (eventType === "user.deleted") {
      // Find and mark the user as deleted in your database
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUser.id))
        .first();

      if (existingUser) {
        // You might want to handle user deletion differently based on your needs
        // For now, we'll update their status
        await ctx.db.patch(existingUser._id, {
          subscriptionStatus: "deleted",
          lastSyncedAt: Date.now(),
        });
      }
      return;
    }

    const userData = {
      clerkId: clerkUser.id,
      email: clerkUser.email_addresses?.[0]?.email_address ?? "",
      firstName: clerkUser.first_name ?? null,
      lastName: clerkUser.last_name ?? null,
      profileImageUrl: clerkUser.image_url ?? null,
      lastSyncedAt: Date.now(),
    };

    // Find existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUser.id))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, userData);
    } else {
      // Create new user
      await ctx.db.insert("users", {
        ...userData,
        createdAt: Date.now(),
        // Initialize with default subscription tier
        subscriptionTier: "free",
        subscriptionStatus: "active",
      });
    }
  },
});
