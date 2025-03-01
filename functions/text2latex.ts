import { PagesFunction } from "@cloudflare/workers-types";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Env {
  GEMINI_API_KEY: string;
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

    // Initialize Gemini with error handling
    if (!env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return createErrorResponse("Server configuration error", 500);
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite-preview-02-05",
      generationConfig: {
        temperature: 0.1, // Keep low temperature for consistent formatting
      },
    });

    // Construct prompt with clear instructions
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
      prompt,
      "\n\nOUTPUT:",
    ].join("\n");

    // Make Gemini API call with error handling
    const result = await model.generateContent(fullPrompt).catch((error) => {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate LaTeX");
    });

    const response = await result.response;
    const latex = response.text();
    if (!latex) {
      throw new Error("Empty response from Gemini");
    }

    // Return successful response
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
