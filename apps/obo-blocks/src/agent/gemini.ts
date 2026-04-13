import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import type { ConversationMessage } from "./types";

/**
 * Fallback system instruction used only when calling chat() directly
 * (outside the graph). The graph agents each carry their own richer
 * system instructions that include the knowledge base.
 */
const SYSTEM_INSTRUCTION = `You are OBO Blocks Assistant — an AI helper embedded in a visual block-based MicroPython coding editor (Blockly). Help users understand the editor and write MicroPython code for embedded systems. Keep answers concise and helpful.`;

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to your .env.local file."
      );
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Send a message to Gemini and get a text response.
 * Optionally pass conversation history for multi-turn context.
 */
export async function chat(
  message: string,
  history: ConversationMessage[] = []
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const chatSession: ChatSession = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: m.parts,
    })),
  });

  const result = await chatSession.sendMessage(message);
  const response = result.response;
  return response.text();
}
