import { NextApiRequest, NextApiResponse } from "next";

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const PREFACE = `Turn the following into latex:`;
  const prompt = req.query.prompt;
  const SUFFIX = "OUTPUT:\n";
  const fullPrompt = PREFACE + "\n" + prompt + "\n" + SUFFIX;
  console.log(prompt);
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
