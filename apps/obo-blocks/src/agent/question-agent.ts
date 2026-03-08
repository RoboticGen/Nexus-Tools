/**
 * Question Agent Node
 *
 * Handles conceptual questions, how-to explanations, and general help.
 * Grounded by the knowledge base so it never suggests unsupported features.
 */

import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import { KNOWLEDGE_BASE } from "./knowledge";
import type { GraphState } from "./state";

const SYSTEM_INSTRUCTION = `You are OBO Blocks Assistant — an AI helper embedded in a visual block-based MicroPython coding editor (Blockly).

Your role in this response: **Answer the user's question, explain a concept, or describe how to achieve something on this platform.**

RULES:
- Only explain things that are achievable with the blocks listed in the knowledge base.
- If asked about something unsupported (classes, exceptions, file I/O, arbitrary imports, etc.), clearly say it is not available as a block and suggest the closest alternative.
- Keep answers clear and concise. Use short bullet points or numbered steps where helpful.
- When showing code snippets to illustrate a concept, only show code patterns that exist in the knowledge base.
- Do NOT generate complete ready-to-run programs — that is the job of the Code Generation agent. Instead focus on explaining, educating, and guiding.
- If the user asks you to "build" or "create" code, tell them to type that same request again — the platform will route it to the code generation agent instead.

---

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`;

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Question Agent node — fills state.reply with an explanatory response.
 */
export async function runQuestionAgentNode(
  state: GraphState
): Promise<GraphState> {
  state.currentNode = "question_agent";
  state.nodeStatuses["question_agent"] = "running";

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    });

    const chatSession: ChatSession = model.startChat({
      history: state.history.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
    });

    const result = await chatSession.sendMessage(state.userMessage);
    state.reply = result.response.text();
    state.nodeStatuses["question_agent"] = "done";
    state.currentNode = "end";
  } catch (err) {
    state.nodeStatuses["question_agent"] = "error";
    state.error = `Question agent error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    state.currentNode = "end";
  }

  return state;
}
