import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal, components } from "./_generated/api";
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";

// Gemini pricing per 1M tokens (as of Dec 2024)
// https://ai.google.dev/pricing
const GEMINI_PRICING = {
  "gemini-flash-latest": {
    inputPer1M: 0.10,
    outputPer1M: 0.40,
  },
  "gemini-2.0-flash": {
    inputPer1M: 0.10,
    outputPer1M: 0.40,
  },
};

// Helper function to send LLM analytics to PostHog
async function trackLLMUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  userId?: string;
  sessionId?: string;
  isAuthenticated: boolean;
  userTier: string;
  success: boolean;
  inputLength: number;
  outputLength: number;
}) {
  const posthogApiKey = process.env.POSTHOG_API_KEY;
  if (!posthogApiKey) {
    console.warn("POSTHOG_API_KEY not configured, skipping LLM tracking");
    return;
  }

  const pricing = GEMINI_PRICING[params.model as keyof typeof GEMINI_PRICING] || { inputPer1M: 0, outputPer1M: 0 };
  const inputCost = (params.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (params.outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost = inputCost + outputCost;

  const distinctId = params.userId || params.sessionId || "anonymous";

  try {
    await fetch("https://us.i.posthog.com/capture/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: posthogApiKey,
        event: "$ai_generation",
        distinct_id: distinctId,
        properties: {
          $ai_model: params.model,
          $ai_provider: "google",
          $ai_input_tokens: params.inputTokens,
          $ai_output_tokens: params.outputTokens,
          $ai_latency: params.latencyMs / 1000, // PostHog expects seconds
          $ai_total_cost_usd: totalCost,
          // Custom properties for our analysis
          user_tier: params.userTier,
          is_authenticated: params.isAuthenticated,
          input_length: params.inputLength,
          output_length: params.outputLength,
          success: params.success,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Failed to track LLM usage:", error);
  }
}

// Define time constants
const DAY = 24 * HOUR;

// Subscription tier limits
const TIER_LIMITS = {
  anonymous: {
    dailyConversions: 10,
    maxInputLength: 10000,
  },
  free: {
    dailyConversions: 60,
    maxInputLength: 10000,
  },
  pro: {
    dailyConversions: Infinity, // High limit
    maxInputLength: 100000, // 10x the free limit
  },
};

const FILE_TOOL_LIMITS = {
  "image-to-latex": {
    anonymousDaily: 5,
    authenticatedDaily: 5,
  },
  "pdf-to-latex": {
    anonymousDaily: 3,
    authenticatedDaily: 3,
  },
  "latex-to-image": {
    anonymousDaily: 10,
    authenticatedDaily: 10,
  },
  "latex-to-word": {
    anonymousDaily: 0,
    authenticatedDaily: 0,
  },
} as const;

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const fileToolValidator = v.union(
  v.literal("latex-to-word"),
  v.literal("image-to-latex"),
  v.literal("pdf-to-latex"),
  v.literal("latex-to-image")
);

const fileConversionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("success"),
  v.literal("failed")
);

type FileTool =
  | "latex-to-word"
  | "image-to-latex"
  | "pdf-to-latex"
  | "latex-to-image";

// Helper function to check if user has pro subscription
function isProUser(user: {
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionPeriodEnd?: number;
}): boolean {
  if (user.subscriptionTier !== "pro") return false;
  if (user.subscriptionStatus !== "active") return false;
  // Check if subscription hasn't expired
  if (user.subscriptionPeriodEnd && user.subscriptionPeriodEnd < Date.now()) {
    return false;
  }
  return true;
}

// Rate limiter configuration
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Anonymous user limits (daily)
  anonymousConversions: {
    kind: "fixed window",
    rate: 10,
    period: DAY,
    capacity: 10,
  },

  // Authenticated user limits (per minute)
  saveConversion: {
    kind: "token bucket",
    rate: 40,
    period: MINUTE,
    capacity: 60,
  },
  toggleFavorite: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  authenticatedConversions: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  authenticatedFileConversions: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  anonymousFileConversions: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  uploadUrlGeneration: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 40,
  },

  // Global rate limits for expensive operations
  globalConversion: {
    kind: "fixed window",
    rate: 400,
    period: MINUTE,
    shards: 5,
  },
  globalFileConversion: {
    kind: "fixed window",
    rate: 150,
    period: MINUTE,
    shards: 5,
  },
});

// Helper function to get today's date string
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getUtcDayStartTimestamp(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function getToolDailyLimit(
  tool: FileTool,
  isPro: boolean,
  isAuthenticated: boolean
): number {
  if (isPro) return Infinity;
  return isAuthenticated
    ? FILE_TOOL_LIMITS[tool].authenticatedDaily
    : FILE_TOOL_LIMITS[tool].anonymousDaily;
}

function calculateGeminiCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING];
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Save a new conversion to history
export const saveConversion = mutation({
  args: {
    input: v.string(),
    output: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Rate limit per user
    await rateLimiter.limit(ctx, "saveConversion", {
      key: userId,
      throws: true,
    });

    return await ctx.db.insert("conversions", {
      userId,
      input: args.input,
      output: args.output,
      isAnonymous: false, // This is an authenticated user conversion
      createdAt: Date.now(),
    });
  },
});

// Generate upload URL for direct file uploads to Convex storage
export const generateUploadUrl = mutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const key = identity?.subject || args.sessionId || "anonymous-upload";

    await rateLimiter.limit(ctx, "uploadUrlGeneration", {
      key,
      throws: true,
    });

    return await ctx.storage.generateUploadUrl();
  },
});

// Resolve a temporary download URL for a storage file
export const getFileDownloadUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get user's conversion history with limit
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = Math.min(args.limit || 20, 50); // Default 20, max 50

    return await ctx.db
      .query("conversions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

// Toggle favorite status of a conversion
export const toggleFavorite = mutation({
  args: {
    conversionId: v.id("conversions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Rate limit per user
    await rateLimiter.limit(ctx, "toggleFavorite", {
      key: userId,
      throws: true,
    });

    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_conversion", (q) =>
        q.eq("userId", userId).eq("conversionId", args.conversionId)
      )
      .first();

    if (existing) {
      // Remove favorite
      await ctx.db.delete(existing._id);
      return false;
    } else {
      // Add favorite
      await ctx.db.insert("favorites", {
        userId,
        conversionId: args.conversionId,
        createdAt: Date.now(),
      });
      return true;
    }
  },
});

// Get user's favorite conversions with limit
export const getFavorites = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = Math.min(args.limit || 20, 50); // Default 20, max 50

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Get the actual conversion details for each favorite
    const conversions = await Promise.all(
      favorites.map(async (fav) => {
        return await ctx.db.get(fav.conversionId);
      })
    );

    return conversions.filter(Boolean); // Remove any null values
  },
});

// Check if a conversion is favorited
export const isFavorited = query({
  args: {
    conversionId: v.id("conversions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_conversion", (q) =>
        q.eq("userId", userId).eq("conversionId", args.conversionId)
      )
      .first();

    return !!favorite;
  },
});

// Internal mutation to save conversion result
export const saveConversionResult = internalMutation({
  args: {
    input: v.string(),
    output: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db.insert("conversions", {
      userId: identity.subject,
      input: args.input,
      output: args.output,
      isAnonymous: false, // This is an authenticated user conversion
      createdAt: Date.now(),
    });
  },
});

// Internal mutation to save anonymous conversion result
export const saveAnonymousConversion = internalMutation({
  args: {
    sessionId: v.string(),
    input: v.string(),
    output: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Save the conversion
    const conversionId = await ctx.db.insert("conversions", {
      sessionId: args.sessionId,
      input: args.input,
      output: args.output,
      isAnonymous: true,
      createdAt: Date.now(),
    });

    // Update session conversion count
    const session = await ctx.db
      .query("anonymousSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        conversionsToday: session.conversionsToday + 1,
        lastConversionAt: Date.now(),
        ipAddress: args.ipAddress || session.ipAddress,
      });
    }

    return conversionId;
  },
});

// Get user info with subscription and usage data
export const getUserSubscriptionInfo = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    const today = getTodayDateString();
    const isPro = isProUser(user);

    // Reset daily count if it's a new day
    if (user.dailyResetDate !== today) {
      await ctx.db.patch(user._id, {
        conversionsToday: 0,
        dailyResetDate: today,
      });
      return {
        isPro,
        conversionsToday: 0,
        dailyLimit: isPro ? TIER_LIMITS.pro.dailyConversions : TIER_LIMITS.free.dailyConversions,
        maxInputLength: isPro ? TIER_LIMITS.pro.maxInputLength : TIER_LIMITS.free.maxInputLength,
        subscriptionTier: user.subscriptionTier || "free",
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPeriodEnd: user.subscriptionPeriodEnd,
      };
    }

    return {
      isPro,
      conversionsToday: user.conversionsToday || 0,
      dailyLimit: isPro ? TIER_LIMITS.pro.dailyConversions : TIER_LIMITS.free.dailyConversions,
      maxInputLength: isPro ? TIER_LIMITS.pro.maxInputLength : TIER_LIMITS.free.maxInputLength,
      subscriptionTier: user.subscriptionTier || "free",
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    };
  },
});

// Increment user's daily conversion count
export const incrementUserConversionCount = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return;
    }

    const today = getTodayDateString();

    // Reset if new day, otherwise increment
    if (user.dailyResetDate !== today) {
      await ctx.db.patch(user._id, {
        conversionsToday: 1,
        dailyResetDate: today,
      });
    } else {
      await ctx.db.patch(user._id, {
        conversionsToday: (user.conversionsToday || 0) + 1,
      });
    }
  },
});

export const getToolUsageCount = internalQuery({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    tool: fileToolValidator,
    dayStart: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const items = await ctx.db
        .query("fileConversions")
        .withIndex("by_user_tool_created", (q) =>
          q
            .eq("userId", args.userId)
            .eq("tool", args.tool)
            .gte("createdAt", args.dayStart)
        )
        .collect();
      return items.length;
    }

    if (args.sessionId) {
      const items = await ctx.db
        .query("fileConversions")
        .withIndex("by_session_tool_created", (q) =>
          q
            .eq("sessionId", args.sessionId)
            .eq("tool", args.tool)
            .gte("createdAt", args.dayStart)
        )
        .collect();
      return items.length;
    }

    return 0;
  },
});

export const createFileConversion = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    tool: fileToolValidator,
    inputStorageId: v.optional(v.id("_storage")),
    inputText: v.optional(v.string()),
    status: fileConversionStatusValidator,
    idempotencyKey: v.optional(v.string()),
    converterVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("fileConversions", {
      userId: args.userId,
      sessionId: args.sessionId,
      tool: args.tool,
      inputStorageId: args.inputStorageId,
      inputText: args.inputText,
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      converterVersion: args.converterVersion,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFileConversion = internalMutation({
  args: {
    conversionId: v.id("fileConversions"),
    status: fileConversionStatusValidator,
    outputStorageId: v.optional(v.id("_storage")),
    outputText: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversionId, {
      status: args.status,
      outputStorageId: args.outputStorageId,
      outputText: args.outputText,
      errorMessage: args.errorMessage,
      latencyMs: args.latencyMs,
      costUsd: args.costUsd,
      updatedAt: Date.now(),
    });
  },
});

export const getFileConversionHistory = query({
  args: {
    limit: v.optional(v.number()),
    tool: v.optional(fileToolValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = Math.min(args.limit ?? 20, 50);
    const rows = await ctx.db
      .query("fileConversions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);

    const filtered = args.tool ? rows.filter((row) => row.tool === args.tool) : rows;
    return filtered.slice(0, limit);
  },
});

// Convert text to LaTeX using Gemini API (supports both anonymous and authenticated users)
export const convertToLatex = action({
  args: {
    text: v.string(),
    sessionId: v.optional(v.string()), // For anonymous users
    ipAddress: v.optional(v.string()), // For additional tracking
    paywallEnabled: v.optional(v.boolean()), // Whether paywall is enabled (from PostHog feature flag)
  },
  handler: async (ctx, args) => {
    // Check authentication status
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated = !!identity;

    let userId: string | undefined = undefined;
    let userSubscriptionInfo: {
      isPro: boolean;
      conversionsToday: number;
      dailyLimit: number;
      maxInputLength: number;
      subscriptionTier: string;
    } | null = null;

    // Default limits (for when paywall is disabled or user not found)
    let maxInputLength = TIER_LIMITS.free.maxInputLength;
    let remainingConversions: number | null = null;

    if (isAuthenticated) {
      userId = identity.subject;

      // Get user subscription info
      userSubscriptionInfo = await ctx.runMutation(
        internal.conversions.getUserSubscriptionInfo,
        { clerkId: userId }
      );

      // If paywall is enabled, enforce tier-based limits
      if (args.paywallEnabled && userSubscriptionInfo) {
        maxInputLength = userSubscriptionInfo.maxInputLength;

        // Check daily limit for free users
        if (!userSubscriptionInfo.isPro) {
          if (userSubscriptionInfo.conversionsToday >= userSubscriptionInfo.dailyLimit) {
            throw new Error(
              `Daily limit reached. You've used ${userSubscriptionInfo.conversionsToday}/${userSubscriptionInfo.dailyLimit} conversions today. Upgrade to Pro for more conversions.`
            );
          }
          remainingConversions = userSubscriptionInfo.dailyLimit - userSubscriptionInfo.conversionsToday - 1;
        }
      }

      // Rate limit authenticated users (per-minute burst protection)
      await rateLimiter.limit(ctx, "authenticatedConversions", {
        key: userId,
        throws: true,
      });
    } else {
      // Handle anonymous user - let rate limiter throw its own error
      if (args.sessionId) {
        // Rate limit anonymous users (daily limit)
        await rateLimiter.limit(ctx, "anonymousConversions", {
          key: args.sessionId,
          throws: true,
        });
      } else {
        // Fallback for anonymous users without sessionId (temporary)
        // Use IP-based rate limiting as a basic protection
        const ipKey = args.ipAddress || "unknown";
        await rateLimiter.limit(ctx, "anonymousConversions", {
          key: ipKey,
          throws: true,
        });
      }
      remainingConversions = TIER_LIMITS.anonymous.dailyConversions;
    }

    // Global rate limit for all users
    await rateLimiter.limit(ctx, "globalConversion", {
      throws: true,
    });

    // Input validation
    if (!args.text.trim()) {
      throw new Error("Input text must not be empty");
    }

    if (args.text.length > maxInputLength) {
      if (userSubscriptionInfo?.isPro === false) {
        throw new Error(
          `Input text must be less than ${maxInputLength.toLocaleString()} characters. Upgrade to Pro for ${TIER_LIMITS.pro.maxInputLength.toLocaleString()} character limit.`
        );
      }
      throw new Error(`Input text must be less than ${maxInputLength.toLocaleString()} characters`);
    }

    // Get environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Track LLM call timing
    const llmStartTime = Date.now();
    const modelName = "gemini-flash-latest";

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
        },
      });

      // Construct prompt
      const fullPrompt = [
        "Convert the following text to LaTeX format.",
        "Ensure the output:",
        "1. Can render in react-katex or react-latex components",
        "2. Is compatible with Overleaf",
        "3. Includes necessary math mode delimiters ($ for inline or $$ for block math) where appropriate",
        "4. Properly escapes special characters",
        "5. Do not enclose the output in latex block, i.e. ```latex```",
        "\n\nEXAMPLES:\n",

        "Example 1: Inline Math and Escaping Special Characters",
        "INPUT:",
        "The derivative of f(x) = 3x^2 - 2x + 1 is given by f'(x) = 6x - 2.",
        "OUTPUT:",
        "The derivative of \\( f(x) = 3x^2 - 2x + 1 \\) is given by \\( f'(x) = 6x - 2 \\).",

        "\nExample 2: Block Math with Complex Expressions",
        "INPUT:",
        "Calculate the probability density function: (1 / sqrt(2 * pi * sigma^2)) * exp(-(x - mu)^2 / (2 * sigma^2))",
        "OUTPUT:",
        "Calculate the probability density function:\n$$\nf(x) = \\frac{1}{\\sqrt{2 \\pi \\sigma^2}} \\exp\\left(-\\frac{(x - \\mu)^2}{2 \\sigma^2}\\right)\n$$",

        "\nExample 3: Mixed Inline and Block Math with Complex Expressions",
        "INPUT:",
        "Find the cumulative distribution function F(x) by integrating from negative infinity to x of the probability density function. Then calculate the conditional probability of A given B as P(A and B) / P(B).",
        "OUTPUT:",
        "Find the cumulative distribution function \\( F(x) \\) by integrating from \\( -\\infty \\) to \\( x \\) of the probability density function:\n$$\nF(x) = \\int_{-\\infty}^x f(t) \\, dt\n$$\nThen, calculate the conditional probability of \\( A \\) given \\( B \\) as \\( P(A \\cap B) / P(B) \\).",

        "EXAMPLE 4: Be verbose do not include your own statements. You are just a latex converter.",
        "INPUT:",
        "Einsteins's equation is E=m",
        "OUTPUT:",
        "Einsteins's equation is \\( E = m \\).",
        "\n\nINPUT:",
        args.text,
        "\n\nOUTPUT:",
      ].join("\n");

      // Generate LaTeX
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const latex = response.text();
      const llmLatencyMs = Date.now() - llmStartTime;

      // Extract token usage from Gemini response
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

      if (!latex) {
        throw new Error("Empty response from Gemini");
      }

      const trimmedLatex = latex.trim();

      // Track LLM usage to PostHog (non-blocking)
      trackLLMUsage({
        model: modelName,
        inputTokens,
        outputTokens,
        latencyMs: llmLatencyMs,
        userId,
        sessionId: args.sessionId,
        isAuthenticated,
        userTier: userSubscriptionInfo?.subscriptionTier ?? (isAuthenticated ? "free" : "anonymous"),
        success: true,
        inputLength: args.text.length,
        outputLength: trimmedLatex.length,
      }).catch(() => {}); // Ignore tracking errors

      // Save the conversion
      let conversionId: Id<"conversions"> | null = null;

      if (isAuthenticated) {
        // Save for authenticated users
        conversionId = await ctx.runMutation(
          internal.conversions.saveConversionResult,
          {
            input: args.text,
            output: trimmedLatex,
          }
        );
      } else {
        // Save for anonymous users
        if (args.sessionId) {
          // Save with session tracking
          conversionId = await ctx.runMutation(
            internal.conversions.saveAnonymousConversion,
            {
              sessionId: args.sessionId,
              input: args.text,
              output: trimmedLatex,
              ipAddress: args.ipAddress,
            }
          );
        } else {
          // Fallback: save without session tracking
          conversionId = await ctx.runMutation(
            internal.conversions.saveConversionResult,
            {
              input: args.text,
              output: trimmedLatex,
            }
          );
        }
      }

      // Increment usage count for authenticated free users when paywall is enabled
      if (isAuthenticated && args.paywallEnabled && userSubscriptionInfo && !userSubscriptionInfo.isPro) {
        await ctx.runMutation(internal.conversions.incrementUserConversionCount, {
          clerkId: userId!,
        });
      }

      // Return both the latex and the conversion ID
      return {
        data: trimmedLatex,
        conversionId,
        isAuthenticated,
        remainingFreeConversions: remainingConversions,
        isPro: userSubscriptionInfo?.isPro ?? false,
        subscriptionTier: userSubscriptionInfo?.subscriptionTier ?? (isAuthenticated ? "free" : "anonymous"),
        dailyLimit: userSubscriptionInfo?.dailyLimit ?? (isAuthenticated ? TIER_LIMITS.free.dailyConversions : TIER_LIMITS.anonymous.dailyConversions),
        maxInputLength,
      };
    } catch (error) {
      // Track failed LLM call
      const llmLatencyMs = Date.now() - llmStartTime;
      trackLLMUsage({
        model: modelName,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: llmLatencyMs,
        userId,
        sessionId: args.sessionId,
        isAuthenticated,
        userTier: userSubscriptionInfo?.subscriptionTier ?? (isAuthenticated ? "free" : "anonymous"),
        success: false,
        inputLength: args.text.length,
        outputLength: 0,
      }).catch(() => {});

      throw new Error(
        error instanceof Error ? error.message : "Failed to generate LaTeX"
      );
    }
  },
});

export const convertImageToLatex = action({
  args: {
    storageId: v.id("_storage"),
    sessionId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated = !!identity;
    const userId = identity?.subject;

    if (!isAuthenticated && !args.sessionId) {
      throw new Error("Session ID is required for anonymous uploads");
    }

    const limiterKey = userId || args.sessionId!;
    await rateLimiter.limit(ctx, isAuthenticated ? "authenticatedFileConversions" : "anonymousFileConversions", {
      key: limiterKey,
      throws: true,
    });
    await rateLimiter.limit(ctx, "globalFileConversion", { throws: true });

    let userSubscriptionInfo:
      | {
          isPro: boolean;
          conversionsToday: number;
          dailyLimit: number;
          maxInputLength: number;
          subscriptionTier: string;
        }
      | null = null;

    if (isAuthenticated && userId) {
      userSubscriptionInfo = await ctx.runMutation(
        internal.conversions.getUserSubscriptionInfo,
        { clerkId: userId }
      );
    }

    const isPro = userSubscriptionInfo?.isPro ?? false;
    const dailyLimit = getToolDailyLimit("image-to-latex", isPro, isAuthenticated);

    let usageCount = 0;
    if (!isPro) {
      usageCount = await ctx.runQuery(internal.conversions.getToolUsageCount, {
        userId,
        sessionId: args.sessionId,
        tool: "image-to-latex",
        dayStart: getUtcDayStartTimestamp(),
      });

      if (usageCount >= dailyLimit) {
        throw new Error(
          `Daily limit reached for Image to LaTeX (${dailyLimit}/day). Upgrade to Pro for unlimited usage.`
        );
      }
    }

    const imageBlob = await ctx.storage.get(args.storageId);
    if (!imageBlob) {
      throw new Error("Uploaded file not found. Please upload again.");
    }

    const mimeType = imageBlob.type || "application/octet-stream";
    if (!mimeType.startsWith("image/")) {
      throw new Error("Only image files are supported for Image to LaTeX.");
    }

    if (imageBlob.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error("Image file is too large. Maximum file size is 10MB.");
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const conversionId = await ctx.runMutation(internal.conversions.createFileConversion, {
      userId,
      sessionId: args.sessionId,
      tool: "image-to-latex",
      inputStorageId: args.storageId,
      status: "processing",
      idempotencyKey: args.idempotencyKey,
      converterVersion: "gemini-image-v1",
    });

    const modelName = "gemini-flash-latest";
    const llmStartTime = Date.now();

    try {
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = arrayBufferToBase64(imageBuffer);

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
        },
      });

      const result = await model.generateContent([
        {
          text: [
            "Transcribe the mathematical content from this image into LaTeX.",
            "Rules:",
            "1. Return only LaTeX output.",
            "2. Preserve equation structure and line breaks.",
            "3. Use standard LaTeX syntax compatible with KaTeX and Overleaf.",
            "4. Do not include markdown fences or explanations.",
          ].join("\n"),
        },
        {
          inlineData: {
            data: imageBase64,
            mimeType,
          },
        },
      ]);

      const response = await result.response;
      const outputText = response.text().trim();
      if (!outputText) {
        throw new Error("Empty response from Gemini");
      }

      const llmLatencyMs = Date.now() - llmStartTime;
      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const costUsd = calculateGeminiCost(modelName, inputTokens, outputTokens);

      await ctx.runMutation(internal.conversions.updateFileConversion, {
        conversionId,
        status: "success",
        outputText,
        latencyMs: llmLatencyMs,
        costUsd,
      });

      trackLLMUsage({
        model: modelName,
        inputTokens,
        outputTokens,
        latencyMs: llmLatencyMs,
        userId,
        sessionId: args.sessionId,
        isAuthenticated,
        userTier: userSubscriptionInfo?.subscriptionTier ?? (isAuthenticated ? "free" : "anonymous"),
        success: true,
        inputLength: imageBlob.size,
        outputLength: outputText.length,
      }).catch(() => {});

      return {
        data: outputText,
        conversionId,
        isAuthenticated,
        isPro,
        dailyLimit,
        remainingFreeConversions:
          dailyLimit === Infinity ? Infinity : Math.max(dailyLimit - usageCount - 1, 0),
      };
    } catch (error) {
      const llmLatencyMs = Date.now() - llmStartTime;
      await ctx.runMutation(internal.conversions.updateFileConversion, {
        conversionId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Failed to convert image to LaTeX",
        latencyMs: llmLatencyMs,
      });

      trackLLMUsage({
        model: modelName,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: llmLatencyMs,
        userId,
        sessionId: args.sessionId,
        isAuthenticated,
        userTier: userSubscriptionInfo?.subscriptionTier ?? (isAuthenticated ? "free" : "anonymous"),
        success: false,
        inputLength: imageBlob.size,
        outputLength: 0,
      }).catch(() => {});

      throw new Error(
        error instanceof Error ? error.message : "Failed to convert image to LaTeX"
      );
    }
  },
});

export const convertLatexToWord = action({
  args: {
    text: v.string(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("LaTeX to Word requires an authenticated Pro account.");
    }

    const userId = identity.subject;
    await rateLimiter.limit(ctx, "authenticatedFileConversions", {
      key: userId,
      throws: true,
    });
    await rateLimiter.limit(ctx, "globalFileConversion", { throws: true });

    const userSubscriptionInfo = await ctx.runMutation(
      internal.conversions.getUserSubscriptionInfo,
      { clerkId: userId }
    );

    if (!userSubscriptionInfo?.isPro) {
      throw new Error("LaTeX to Word is a Pro-only feature. Upgrade to continue.");
    }

    if (!args.text.trim()) {
      throw new Error("Input LaTeX must not be empty");
    }

    if (args.text.length > TIER_LIMITS.pro.maxInputLength) {
      throw new Error(
        `Input text must be less than ${TIER_LIMITS.pro.maxInputLength.toLocaleString()} characters`
      );
    }

    const workerUrl = process.env.LATEX_TO_WORD_WORKER_URL;
    if (!workerUrl) {
      throw new Error(
        "LATEX_TO_WORD_WORKER_URL is not configured. Deploy the worker and set this env var."
      );
    }

    const workerAuthToken = process.env.LATEX_TO_WORD_WORKER_TOKEN;
    const conversionId = await ctx.runMutation(internal.conversions.createFileConversion, {
      userId,
      tool: "latex-to-word",
      inputText: args.text,
      status: "processing",
      idempotencyKey: args.idempotencyKey,
      converterVersion: "worker-latex-to-word-v1",
    });

    const conversionStartTime = Date.now();

    try {
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workerAuthToken
            ? {
                Authorization: `Bearer ${workerAuthToken}`,
              }
            : {}),
        },
        body: JSON.stringify({
          latex: args.text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LaTeX to Word worker failed (${response.status}): ${errorText.slice(0, 200)}`
        );
      }

      const docxBuffer = await response.arrayBuffer();
      if (docxBuffer.byteLength === 0) {
        throw new Error("LaTeX to Word worker returned an empty file.");
      }

      const outputStorageId = await ctx.storage.store(
        new Blob([docxBuffer], { type: DOCX_MIME_TYPE })
      );
      const downloadUrl = await ctx.storage.getUrl(outputStorageId);
      const latencyMs = Date.now() - conversionStartTime;

      await ctx.runMutation(internal.conversions.updateFileConversion, {
        conversionId,
        status: "success",
        outputStorageId,
        latencyMs,
      });

      return {
        conversionId,
        outputStorageId,
        downloadUrl,
        filename: `text2latex-${Date.now()}.docx`,
      };
    } catch (error) {
      const latencyMs = Date.now() - conversionStartTime;
      await ctx.runMutation(internal.conversions.updateFileConversion, {
        conversionId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Failed to convert LaTeX to Word",
        latencyMs,
      });
      throw new Error(
        error instanceof Error ? error.message : "Failed to convert LaTeX to Word"
      );
    }
  },
});

// Query to get user's current usage and subscription info (for UI display)
export const getUserUsageInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        isAuthenticated: false,
        tier: "anonymous",
        dailyLimit: TIER_LIMITS.anonymous.dailyConversions,
        conversionsToday: null,
        maxInputLength: TIER_LIMITS.anonymous.maxInputLength,
        isPro: false,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return {
        isAuthenticated: true,
        tier: "free",
        dailyLimit: TIER_LIMITS.free.dailyConversions,
        conversionsToday: 0,
        maxInputLength: TIER_LIMITS.free.maxInputLength,
        isPro: false,
      };
    }

    const isPro = isProUser(user);
    const today = getTodayDateString();
    const conversionsToday = user.dailyResetDate === today ? (user.conversionsToday || 0) : 0;

    return {
      isAuthenticated: true,
      tier: isPro ? "pro" : "free",
      dailyLimit: isPro ? TIER_LIMITS.pro.dailyConversions : TIER_LIMITS.free.dailyConversions,
      conversionsToday,
      maxInputLength: isPro ? TIER_LIMITS.pro.maxInputLength : TIER_LIMITS.free.maxInputLength,
      isPro,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    };
  },
});
