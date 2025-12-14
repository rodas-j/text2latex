import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Stripe price IDs - these will be set up in Stripe Dashboard
// You'll need to create these products/prices in Stripe
const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!, // $5/month
  yearly: process.env.STRIPE_PRICE_YEARLY!, // $30/year
};

// Initialize Stripe
function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

// Create a Stripe checkout session for subscription
export const createCheckoutSession = action({
  args: {
    priceType: v.union(v.literal("monthly"), v.literal("yearly")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();
    const userId = identity.subject;

    // Get existing customer ID from database
    const dbResult = await ctx.runMutation(internal.stripe.getStripeCustomerFromDb, {
      clerkId: userId,
    });

    let customerId = dbResult.customerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: identity.email!,
        metadata: {
          clerkId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await ctx.runMutation(internal.stripe.saveStripeCustomerId, {
        clerkId: userId,
        stripeCustomerId: customerId,
      });
    }

    const priceId = args.priceType === "monthly"
      ? STRIPE_PRICES.monthly
      : STRIPE_PRICES.yearly;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      subscription_data: {
        metadata: {
          clerkId: userId,
        },
      },
      metadata: {
        clerkId: userId,
      },
    });

    return { sessionId: session.id, url: session.url };
  },
});

// Create Stripe customer portal session for managing subscription
export const createPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stripe = getStripe();
    const userId = identity.subject;

    // Get user's Stripe customer ID from database
    const dbResult = await ctx.runMutation(internal.stripe.getStripeCustomerFromDb, {
      clerkId: userId,
    });

    if (!dbResult.customerId) {
      throw new Error("No subscription found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dbResult.customerId,
      return_url: args.returnUrl,
    });

    return { url: session.url };
  },
});

// Internal mutation to get existing Stripe customer ID
export const getStripeCustomerFromDb = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      customerId: user.stripeCustomerId || null,
      oderId: user._id,
    };
  },
});

// Internal mutation to save Stripe customer ID
export const saveStripeCustomerId = internalMutation({
  args: {
    clerkId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// Internal mutation to get Stripe customer ID
export const getStripeCustomerId = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user?.stripeCustomerId || null;
  },
});

// Internal mutation to update subscription status from Stripe webhook
export const updateSubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (!user) {
      console.error("User not found for Stripe customer:", args.stripeCustomerId);
      return;
    }

    // Map Stripe status to our status
    const subscriptionStatus = args.status === "active" || args.status === "trialing"
      ? "active"
      : args.status === "past_due"
        ? "past_due"
        : "cancelled";

    // Determine tier based on status
    const subscriptionTier = subscriptionStatus === "active" ? "pro" : "free";

    await ctx.db.patch(user._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      subscriptionTier,
      subscriptionStatus,
      subscriptionPeriodEnd: args.currentPeriodEnd * 1000, // Convert to milliseconds
    });
  },
});

// Internal mutation to cancel subscription
export const cancelSubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();

    if (!user) {
      console.error("User not found for Stripe customer:", args.stripeCustomerId);
      return;
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: "free",
      subscriptionStatus: "cancelled",
    });
  },
});

// Query to get subscription status for the current user
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return {
      tier: user.subscriptionTier || "free",
      status: user.subscriptionStatus || "active",
      periodEnd: user.subscriptionPeriodEnd,
      hasActiveSubscription: user.subscriptionTier === "pro" && user.subscriptionStatus === "active",
    };
  },
});
