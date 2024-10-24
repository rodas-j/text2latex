import OpenAI from "openai";
import { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  OPENAI_API_KEY: string;
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

    if (prompt.length > 2000) {
      return createErrorResponse(
        "Prompt must be less than 2000 characters",
        400
      );
    }

    // Initialize OpenAI with error handling
    if (!env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return createErrorResponse("Server configuration error", 500);
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Construct prompt with clear instructions
    const fullPrompt = [
      "Convert the following text to LaTeX format.",
      "Ensure the output:",
      "1. Can render in react-katex or react-latex components",
      "2. Is compatible with Overleaf",
      "3. Includes necessary math mode delimiters ($ or $$) where appropriate",
      "4. Properly escapes special characters",
      "\nINPUT:",
      prompt,
      "\nOUTPUT:",
    ].join("\n");

    // Make OpenAI API call with error handling
    const completion = await openai.chat.completions
      .create({
        messages: [{ role: "user", content: fullPrompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.3, // Lower temperature for more consistent formatting
        max_tokens: 2000,
      })
      .catch((error) => {
        console.error("OpenAI API Error:", error);
        throw new Error("Failed to generate LaTeX");
      });

    const latex = completion.choices[0].message.content;
    if (!latex) {
      throw new Error("Empty response from OpenAI");
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
