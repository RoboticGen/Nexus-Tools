/**
 * Code Generation Agent Node
 *
 * Intelligently handles both code generation and code completion:
 * - If user has existing code and asks to improve/fix/modify it → uses completion mode
 * - If user asks for new code → uses generation mode
 *
 * Generates complete MicroPython programs that can be represented as
 * Blockly blocks on this platform. After generating the response it
 * extracts the first ```python … ``` block so the client can call
 * onConvertPython() → onImportJson() to draw the blocks automatically.
 */

import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import { KNOWLEDGE_BASE } from "./knowledge";
import type { GraphState } from "./state";

const GENERATION_SYSTEM_INSTRUCTION = `You are OBO Blocks Code Generator — an AI embedded in a visual block-based MicroPython coding editor.

Your role: **Generate a working MicroPython program that fulfils the user's request.**

RULES:
1. Write standard MicroPython code. Use the \`machine\` module for hardware (Pin, ADC, PWM, I2C) and \`time\` module for sleep.
2. Only import \`machine\` and \`time\` — no other third-party libraries.
3. Always output EXACTLY one \`\`\`python … \`\`\` code block.
4. Before the code block: write a brief 1–3 sentence explanation of what the program does.
5. After the code block: optionally add a short note about parameters the user can adjust.
6. Keep code simple and well-commented using # comments.
7. Read the conversation history to understand the context before generating code. If the user has already provided information in the history, use that to generate your response.

${KNOWLEDGE_BASE}

RESPONSE FORMAT:
<short explanation of what the program does>

\`\`\`python
# Your generated MicroPython code here
\`\`\`

<optional note about adjustable parameters>`;

const COMPLETION_SYSTEM_INSTRUCTION = `You are OBO Blocks Code Completion Agent — an AI embedded in a visual block-based MicroPython coding editor.

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

/**
 * Determine if user is asking to improve existing code or create new code
 * Returns true if should use completion mode, false for generation mode
 */
function shouldUseCompletionMode(userMessage: string, hasCurrentCode: boolean): boolean {
  if (!hasCurrentCode) return false;

  // Keywords that suggest code improvement/modification
  const improvementKeywords = [
    "fix", "complete", "finish", "add", "extend", "improve", 
    "modify", "change", "update", "help me", "wrong", "error",
    "bug", "debug", "enhance", "continue", "more", "better",
    "refactor", "simplify", "optimize", "adjust"
  ];

  const lowerMessage = userMessage.toLowerCase();
  return improvementKeywords.some(keyword => lowerMessage.includes(keyword));
}

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
 * Code Generation Agent node (handles both generation and completion).
 * Fills state.reply (full markdown) and state.pythonCode (extracted snippet).
 */
export async function runCodeGenAgentNode(
  state: GraphState
): Promise<GraphState> {
  state.currentNode = "code_gen_agent";
  state.nodeStatuses["code_gen_agent"] = "running";

  try {
    const genAI = getGenAI();
    
    // Determine whether to use completion or generation mode
    const isCompletionMode = shouldUseCompletionMode(state.userMessage, !!state.currentCode);
    
    // Select appropriate system instruction
    const systemInstruction = isCompletionMode 
      ? COMPLETION_SYSTEM_INSTRUCTION 
      : GENERATION_SYSTEM_INSTRUCTION;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction + `\n\n**Conversation history:** ${state.agentOutputs["history_agent"] ?? ""}`,
      generationConfig: {
        temperature: 0.2, // low temp = consistent, predictable code
        maxOutputTokens: isCompletionMode ? 4096 : 2048,
      },
    });

    const chatSession: ChatSession = model.startChat({
      history: state.history.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
    });

    let finalMessage: string;
    
    if (isCompletionMode) {
      // Code completion mode: inject current code
      const currentCode = state.currentCode?.trim() || "# (no existing code)";
      finalMessage = `<current_code>\n${currentCode}\n</current_code>\n\nUser request: ${state.userMessage}`;
    } else {
      // Code generation mode: just send user message
      finalMessage = state.userMessage;
    }

    const result = await chatSession.sendMessage(finalMessage);
    const fullReply = result.response.text();

    state.reply = fullReply;
    state.agentOutputs["code_generation"] = fullReply;
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
