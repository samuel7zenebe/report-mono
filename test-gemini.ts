import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const googleAi = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function test() {
  try {
    console.log("Testing gemini-2.5-flash...");
    const result = await generateText({
      model: googleAi("gemini-2.5-flash"),
      prompt: "Hello",
    });
    console.log("Success:", result.text);
  } catch (e) {
    console.error("Error with gemini-2.5-flash:", e);

    try {
      console.log("Testing gemini-1.5-flash...");
      const result2 = await generateText({
        model: googleAi("gemini-1.5-flash"),
        prompt: "Hello",
      });
      console.log("Success with 1.5:", result2.text);
    } catch (e2) {
      console.error("Error with gemini-1.5-flash:", e2);
    }
  }
}

test();
