/**
 * Code Generation Agent Node
 *
 * Generates complete MicroPython programs that can be represented as
 * Blockly blocks on this platform. After generating the response it
 * extracts the first ```python … ``` block so the client can call
 * onConvertPython() → onImportJson() to draw the blocks automatically.
 */

import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import { KNOWLEDGE_BASE } from "./knowledge";
import type { GraphState } from "./state";

const SYSTEM_INSTRUCTION = `You are OBO Blocks Code Generator — an AI that writes complete MicroPython programs ONLY using constructs available as Blockly blocks on this platform.

Your role: **Generate a working MicroPython program that fulfils the user's request.**

STRICT RULES — READ CAREFULLY:
1. ONLY use Python constructs listed in the knowledge base. No classes, no try/except, no f-strings, no lambdas, no arbitrary imports.
2. Auto-injected imports (write them): "import machine" (if using Pin/ADC/PWM/I2C) and "import time" (if using sleep). These are the ONLY allowed imports.
3. Always output EXACTLY one \`\`\`python … \`\`\` code block. No nested fences.
4. Before the code block: write a brief 1–3 sentence explanation of what the program does.
5. After the code block: optionally add a short note about parameters the user can adjust.
6. Keep programs simple and well-commented using # comments inside the code.
7. If the request is impossible within the block constraints, say so clearly and describe what IS possible instead — do not generate invalid code.

RESPONSE FORMAT:
<short explanation of what the program does>

\`\`\`python
# Your generated MicroPython code here
\`\`\`

<optional note about adjustable parameters>

---

KNOWLEDGE BASE (the only Python patterns allowed):
${KNOWLEDGE_BASE}`;

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
 * Code Generation Agent node.
 * Fills state.reply (full markdown) and state.pythonCode (extracted snippet).
 */
export async function runCodeGenAgentNode(
  state: GraphState
): Promise<GraphState> {
  state.currentNode = "code_gen_agent";
  state.nodeStatuses["code_gen_agent"] = "running";

  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.2,   // low temp = consistent, predictable code
        maxOutputTokens: 2048,
      },
    });

    const chatSession: ChatSession = model.startChat({
      history: state.history.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
    });

    const result = await chatSession.sendMessage(state.userMessage);
    const fullReply = result.response.text();

    state.reply = fullReply;
    state.pythonCode = extractPythonCode(fullReply) ?? undefined;

    state.nodeStatuses["code_gen_agent"] = "done";
    state.currentNode = "end";
  } catch (err) {
    state.nodeStatuses["code_gen_agent"] = "error";
    state.error = `Code gen agent error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    state.currentNode = "end";
  }

  return state;
}
