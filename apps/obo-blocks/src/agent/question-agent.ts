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

Your role: **Answer the user's question, explain a MicroPython concept, or describe how to achieve something on this platform.**

RULES:
- Explain MicroPython concepts clearly. The platform targets MicroPython on microcontrollers (e.g. Raspberry Pi Pico).
- Supported hardware modules: \`machine\` (Pin, ADC, PWM, I2C) and \`time\` (sleep). No other third-party libraries.
- Keep answers clear and concise. Use short bullet points or numbered steps where helpful.
- Do NOT generate complete ready-to-run programs — that is the job of the Code Generation agent. Focus on explaining, educating, and guiding.
- If the user asks you to "build" or "create" code, tell them to type that same request again — the platform will route it to the code generation agent instead.
- Always read the conversation history to understand the context before responding. If the user has already provided information in the history, use that to generate your response.

${KNOWLEDGE_BASE}
`;

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
      systemInstruction: SYSTEM_INSTRUCTION+ `\n\n**Conversation history:** ${state.agentOutputs["history_agent"] ?? ""}`,
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
    state.agentOutputs["question"] = state.reply;
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
