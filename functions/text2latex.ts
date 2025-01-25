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
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting request processing`);

  try {
    const { request, env } = context;

    // Validate request body
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body parsed successfully`);
    } catch {
      console.error(`[${requestId}] Failed to parse request body as JSON`);
      return createErrorResponse("Invalid JSON body", 400);
    }

    // Type check and validate prompt
    const prompt = body?.prompt;
    console.log(
      `[${requestId}] Received prompt of length: ${prompt?.length ?? 0}`
    );

    if (!prompt || typeof prompt !== "string") {
      console.error(`[${requestId}] Invalid prompt type or empty prompt`);
      return createErrorResponse("Prompt must be a non-empty string", 400);
    }

    if (prompt.length > 5000) {
      console.error(
        `[${requestId}] Prompt exceeds maximum length: ${prompt.length}`
      );
      return createErrorResponse(
        "Prompt must be less than 5000 characters",
        400
      );
    }

    // Initialize OpenAI with error handling
    if (!env.GEMINI_API_KEY) {
      console.error(
        `[${requestId}] Missing GEMINI_API_KEY environment variable`
      );
      return createErrorResponse("Server configuration error", 500);
    }

    // Create base OpenAI client
    const baseClient = new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    console.log(`[${requestId}] OpenAI client initialized`);

    // Determine if this request should be observed
    const isObserved = shouldObserve();
    console.log(
      `[${requestId}] Request observation status: ${
        isObserved ? "observed" : "not observed"
      }`
    );

    // Conditionally wrap with Langfuse observability
    const openai = isObserved
      ? observeOpenAI(baseClient, {
          clientInitParams: {
            publicKey: env.LANGFUSE_PUBLIC_KEY,
            secretKey: env.LANGFUSE_SECRET_KEY,
            baseUrl: env.LANGFUSE_BASEURL,
          },
          promptName: "og-prompt",
          promptVersion: 1,
          traceId: `text2latex-trace-${requestId}`,
          sessionId: "text2latex-session",
          release: "1.0.0",
          version: "production",
          tags: ["text2latex", "gemini", "conversion", "openai-sdk"],
        })
      : baseClient;

    console.log(
      `[${requestId}] OpenAI client ${
        isObserved ? "wrapped with Langfuse" : "initialized without observation"
      }`
    );

    // Log Langfuse observation status
    if (isObserved) {
      console.log(
        `[${requestId}] Langfuse trace ID: text2latex-trace-${requestId}`
      );
      console.log(
        `[${requestId}] Langfuse observation enabled with prompt name: og-prompt`
      );
    }

    console.log(`[${requestId}] Making API request to Gemini`);
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
        console.error(`[${requestId}] Gemini API Error:`, error);
        throw new Error("Failed to generate LaTeX");
      });

    console.log(`[${requestId}] Received response from Gemini`);
    if (isObserved) {
      console.log(`[${requestId}] Langfuse observed completion event`);
    }

    const latex = result.choices[0]?.message?.content;
    if (!latex) {
      console.error(`[${requestId}] Empty response from Gemini`);
      throw new Error("Empty response from Gemini");
    }
    console.log(`[${requestId}] Generated LaTeX of length: ${latex.length}`);

    // Only flush if we're using the observed client
    if (isObserved) {
      console.log(`[${requestId}] Attempting to flush Langfuse events`);
      // Fire and forget the flush operation
      openai.flushAsync?.().catch((error: Error) => {
        console.error(`[${requestId}] Error flushing Langfuse events:`, error);
        // Don't throw, just log the error
      });
    }

    console.log(`[${requestId}] Request completed successfully`);
    // Return response immediately without waiting for flush
    return new Response(JSON.stringify({ data: latex.trim() }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Error in text2latex:`, error);

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
