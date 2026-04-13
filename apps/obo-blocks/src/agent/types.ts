/** Message role for Gemini conversation */
export type MessageRole = "user" | "model";

/** A single message in the conversation history */
export interface ConversationMessage {
  role: MessageRole;
  parts: { text: string }[];
}

/** Request body sent to the /api/chat endpoint */
export interface ChatRequest {
  message: string;
  history?: ConversationMessage[];
  /** Current Python code in the editor (for code completion agent) */
  currentCode?: string;
  /** User's selected mode: "agent" (code generation) or "ask" (question) */
  mode?: "agent" | "ask";
}

/**
 * Which agent handled the response.
 *  - "question"        → explanatory/informational answer
 *  - "code_generation" → Python code was generated or modified; pythonCode may be present
 */
export type AgentKind = "question" | "code_generation";

/** Response body returned from the /api/chat endpoint */
export interface ChatResponse {
  /** The full text reply (markdown) to display in the chat bubble */
  reply: string;
  /** Which agent produced this response */
  agent?: AgentKind;
  /**
   * Extracted Python code snippet (only present when agent === "code_generation" or "code_completion").
   * The client should pass this to onConvertPython() → onImportJson() to
   * draw the blocks automatically in the workspace.
   */
  pythonCode?: string;
  error?: string;
}
