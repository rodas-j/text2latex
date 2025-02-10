import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "./_generated/api";

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
    return await ctx.db.insert("conversions", {
      userId,
      input: args.input,
      output: args.output,
      createdAt: Date.now(),
    });
  },
});

// Get user's conversion history
export const getHistory = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    return await ctx.db
      .query("conversions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
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

// Get user's favorite conversions
export const getFavorites = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
      createdAt: Date.now(),
    });
  },
});

// Convert text to LaTeX using Gemini API
export const convertToLatex = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Input validation
    if (!args.text.trim()) {
      throw new Error("Input text must not be empty");
    }

    if (args.text.length > 5000) {
      throw new Error("Input text must be less than 5000 characters");
    }

    // Get environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
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

      if (!latex) {
        throw new Error("Empty response from Gemini");
      }

      const trimmedLatex = latex.trim();

      // Save the conversion using the internal mutation
      await ctx.runMutation(internal.conversions.saveConversionResult, {
        input: args.text,
        output: trimmedLatex,
      });

      return { data: trimmedLatex };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to generate LaTeX"
      );
    }
  },
});
