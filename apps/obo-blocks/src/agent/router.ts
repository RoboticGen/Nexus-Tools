/**
 * Router Node
 *
 * The first node in the graph. It reads the user's message and decides
 * which downstream agent should handle it:
 *
 *   "question"        — user wants an explanation, a how-to, or general help
 *   "code_generation" — user wants code or blocks generated/built for them
 *
 * Uses a Gemini call with JSON response mode so the output is always parseable.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GraphState, RoutedAgent } from "./state";

const ROUTER_PROMPT = `You are a routing assistant for OBO Blocks, a visual block-based Python/MicroPython coding editor.

Classify the user's message into EXACTLY ONE of these two categories:

1. "code_generation" — The user is asking you to:
   - Generate, write, create, or build Python/MicroPython code
   - Create a program, script, or routine
   - Show a working example (with actual code)
   - Build something with blocks (e.g. "make an LED blink", "create a loop that reads a sensor")

2. "question" — The user is asking you to:
   - Explain a concept ("what is PWM?", "how does ADC work?")
   - Describe how to do something at a high level
   - Ask about the platform capabilities or limitations
   - Debug or understand existing code shown by the user
   - Any general information request

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{"route": "question"} or {"route": "code_generation"}`;

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Router node — mutates state.routedTo and advances currentNode.
 */
export async function runRouterNode(state: GraphState): Promise<GraphState> {
  state.nodeStatuses["router"] = "running";

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,        // deterministic routing
        maxOutputTokens: 64,
      },
    });

    const result = await model.generateContent(
      `${ROUTER_PROMPT}\n\nUser message: "${state.userMessage}"`
    );

    const raw = result.response.text().trim();
    let route: RoutedAgent = "question"; // safe default

    try {
      const parsed = JSON.parse(raw) as { route: RoutedAgent };
      if (
        parsed.route === "code_generation" ||
        parsed.route === "question"
      ) {
        route = parsed.route;
      }
    } catch {
      // JSON parse failed — default to "question" (safer)
    }

    state.routedTo = route;
    state.nodeStatuses["router"] = "done";
    state.currentNode =
      route === "code_generation" ? "code_gen_agent" : "question_agent";
  } catch (err) {
    state.nodeStatuses["router"] = "error";
    state.error = `Router error: ${err instanceof Error ? err.message : String(err)}`;
    state.currentNode = "end";
  }

  return state;
}
