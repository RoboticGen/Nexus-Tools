/**
 * Question Agent Node
 *
 * Handles conceptual questions, how-to explanations, and general help.
 * Grounded by the knowledge base so it never suggests unsupported features.
 */

import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";

import type { GraphState } from "./state";


const SYSTEM_INSTRUCTION = `You are OBO Blocks Assistant — an AI helper embedded in a visual block-based MicroPython coding editor (Blockly).

Your role: **You are a helpful assistant that keeps track of the conversation history and provides helpful responses to the user.**

## RULES:
- Always read the conversation history to understand the context before responding.
- Check the history for any relevant information that can help you answer the user's question or address their request.
- If the user has already provided information in the history, use that to inform your response.
- **Extract** relevant parts of the history and **Summarize** in your response when it helps clarify your answer or shows that you understand the context.
- Use <conversation_history> tags to include a brief summary of the relevant conversation history in your response when it adds value.
- Be concise and clear in your responses, but don't hesitate to reference the history when it's relevant.
- Compose your response adding **user previously said this** and **I previously said that**. It helps show that you understand the conversation flow.

## HISTORY FORMAT:
    - user: <user message>
    - model: <model response>
`;

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * History Agent node — fills state.reply with an explanatory response.
 */
export async function runHistoryNode(
  state: GraphState
): Promise<GraphState> {
  state.currentNode = "history_agent";
  state.nodeStatuses["history_agent"] = "running";

  try {
    let historySummary ="\n\n**Conversation history:**\n" + state.history.map(m => `- ${m.role}: ${m.parts.map(p => p.text).join(" ")}`).join("\n");
    console.log("History Agent - system instruction:", historySummary);

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION + historySummary,
      generationConfig: {
        temperature: 1.0,
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
    state.agentOutputs["history_agent"] = state.reply;

    console.log("History Agent - full reply:", state.reply);
    state.nodeStatuses["history_agent"] = "done";
    state.currentNode = "router";
    
  } catch (err) {
    state.nodeStatuses["history_agent"] = "error";
    state.error = `History agent error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    state.currentNode = "end";
  }

  return state;
}
