import { NextApiRequest, NextApiResponse } from "next";
import applyRateLimit from "./rateLimiting";

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

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
  } else if (typeof prompt !== "string") {
    res.status(400).json({ error: "Prompt must be a string" });
  } else if (prompt.length > 1000) {
    res.status(400).json({ error: "Prompt must be less than 1000 characters" });
  }

  const PREFACE = `Turn the following into latex:`;
  const SUFFIX = "OUTPUT:\n";
  const fullPrompt = PREFACE + "\n" + prompt + "\n" + SUFFIX;

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: fullPrompt,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  const data = response.data.choices[0].text;

  res.status(200).json({ data: data });
}

export default handler;
