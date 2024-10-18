import { NextApiRequest, NextApiResponse } from "next";
import applyRateLimit from "./rateLimiting";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await applyRateLimit(req, res);
  } catch {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const prompt = req.body.prompt;
  console.log("prompt", prompt);

  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  } else if (typeof prompt !== "string") {
    res.status(400).json({ error: "Prompt must be a string" });
    return;
  } else if (prompt.length > 2000) {
    res.status(400).json({ error: "Prompt must be less than 1000 characters" });
    return;
  }

  // We want to be able to render in our app + have users paste the LaTeX into overleaf
  const PREFACE = `Turn the following into latex and make sure it's compatible with react-next-js Latex component and Overleaf:`;
  const SUFFIX = "OUTPUT:\n";
  const fullPrompt = PREFACE + "\n" + prompt + "\n" + SUFFIX;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: fullPrompt }],
    model: "gpt-3.5-turbo",
  });
  const data = completion.choices[0].message.content;

  res.status(200).json({ data: data });
}

export default handler;
