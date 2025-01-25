import { ExecutionContext, PagesFunction } from "@cloudflare/workers-types";
import OpenAI from "openai";
import { observeOpenAI } from "langfuse";

interface Env {
  GEMINI_API_KEY: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  LANGFUSE_BASEURL: string;
}

// Handle CORS preflight requests
const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
};

// Helper function to determine if this request should be observed (1/3 probability)
function shouldObserve(): boolean {
  return Math.random() < 1 / 3;
}

// Handle POST requests
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    // Type check and validate prompt
    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== "string") {
      return createErrorResponse("Prompt must be a non-empty string", 400);
    }

    if (prompt.length > 5000) {
      return createErrorResponse(
        "Prompt must be less than 5000 characters",
        400
      );
    }

    // Initialize OpenAI with error handling
    if (!env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return createErrorResponse("Server configuration error", 500);
    }

    // Create base OpenAI client
    const baseClient = new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    // Conditionally wrap with Langfuse observability
    const openai = shouldObserve()
      ? observeOpenAI(baseClient, {
          clientInitParams: {
            publicKey: env.LANGFUSE_PUBLIC_KEY,
            secretKey: env.LANGFUSE_SECRET_KEY,
            baseUrl: env.LANGFUSE_BASEURL,
          },
          promptName: "og-prompt",
          promptVersion: 1,
          traceId: "text2latex-trace",
          sessionId: "text2latex-session",
          release: "1.0.0",
          version: "production",
          tags: ["text2latex", "gemini", "conversion", "openai-sdk"],
        })
      : baseClient;

    // Construct prompt with clear instructions
    const messages = [
      {
        role: "system",
        content: [
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
        ].join("\n"),
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Make Gemini API call through OpenAI compatibility layer
    const result = await openai.chat.completions
      .create({
        model: "gemini-1.5-flash",
        messages,
        temperature: 0.1,
        max_tokens: 1000,
      })
      .catch((error) => {
        console.error("Gemini API Error:", error);
        throw new Error("Failed to generate LaTeX");
      });

    const latex = result.choices[0]?.message?.content;
    if (!latex) {
      throw new Error("Empty response from Gemini");
    }

    // Only flush if we're using the observed client
    if (shouldObserve()) {
      // Fire and forget the flush operation
      openai.flushAsync?.().catch((error: Error) => {
        console.error("Error flushing Langfuse events:", error);
        // Don't throw, just log the error
      });
    }

    // Return response immediately without waiting for flush
    return new Response(JSON.stringify({ data: latex.trim() }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in text2latex:", error);

    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
};

// Helper function for consistent error responses
function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Export the handlers object
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Handle POST requests
    if (request.method === "POST") {
      return onRequestPost({ request, env, ctx });
    }

    // Handle unsupported methods
    return new Response("Method not allowed", { status: 405 });
  },
};
