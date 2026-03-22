/**
 * Code Completion Agent Node
 *
 * Receives the user's existing MicroPython code and a request to extend,
 * complete, or modify it. Returns the FULL updated program (not just the
 * additions) so the client can clear the workspace and import the
 * complete block set.
 */

import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import { KNOWLEDGE_BASE } from "./knowledge";
import type { GraphState } from "./state";

const SYSTEM_INSTRUCTION = `You are OBO Blocks Code Completion Agent — an AI embedded in a visual block-based MicroPython coding editor.

Your role: **Take the user's existing MicroPython code and extend / complete / modify it according to their request.**

RULES:
1. You will receive the user's CURRENT code inside a <current_code> tag.
2. You MUST output the COMPLETE updated program — not just the additions. The entire code will replace what the user currently has.
3. Write standard MicroPython code. Use the \`machine\` module for hardware (Pin, ADC, PWM, I2C) and \`time\` module for sleep.
4. Only import \`machine\` and \`time\` — no other third-party libraries.
5. Always output EXACTLY one \`\`\`python … \`\`\` code block containing the full updated program.
6. Before the code block: write a brief 1–3 sentence explanation of what you changed or added.
7. After the code block: optionally note what was modified.
8. Keep code simple and well-commented using # comments.
9. Preserve the user's existing code structure and comments as much as possible — only change what is necessary to fulfil their request.

${KNOWLEDGE_BASE}

RESPONSE FORMAT:
<short explanation of what was changed/added>

\`\`\`python
# The COMPLETE updated MicroPython code here
\`\`\`

<optional note about what was modified>`;

// Regex that captures the first ```python … ``` fence in a response
const PYTHON_FENCE_REGEX = /```python\s*\n([\s\S]*?)```/;

/**
 * Extract the first Python code block from a markdown string.
 * Returns null if none is found.
 */
export function extractPythonCode(text: string): string | null {
  const match = PYTHON_FENCE_REGEX.exec(text);
  return match ? match[1].trimEnd() : null;
}

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Code Completion Agent node.
 * Fills state.reply (full markdown) and state.pythonCode (extracted snippet).
 */
export async function runCodeCompletionAgentNode(
  state: GraphState
): Promise<GraphState> {
  state.currentNode = "code_completion_agent";
  state.nodeStatuses["code_completion_agent"] = "running";

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.2, // low temp = consistent, predictable code
        maxOutputTokens: 4096,
      },
    });

    const chatSession: ChatSession = model.startChat({
      history: state.history.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
    });

    // Build the prompt: inject current code + user's request
    const currentCode = state.currentCode?.trim() || "# (no existing code)";
    const prompt = `<current_code>\n${currentCode}\n</current_code>\n\nUser request: ${state.userMessage}`;

    const result = await chatSession.sendMessage(prompt);
    const fullReply = result.response.text();

    state.reply = fullReply;
    state.agentOutputs["code_completion"] = fullReply;
    state.pythonCode = extractPythonCode(fullReply) ?? undefined;

    state.nodeStatuses["code_completion_agent"] = "done";
    state.currentNode = "end";
  } catch (err) {
    state.nodeStatuses["code_completion_agent"] = "error";
    state.error = `Code completion agent error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    state.currentNode = "end";
  }

  return state;
}
