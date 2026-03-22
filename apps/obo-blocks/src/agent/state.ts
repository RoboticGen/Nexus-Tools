/**
 * Graph State Machine — State Definitions
 *
 * Each run through the graph creates a fresh GraphState and mutates it
 * as it passes through nodes: Router → QuestionAgent | CodeGenAgent.
 */

import type { ConversationMessage } from "./types";

// ─── Node identifiers ─────────────────────────────────────────────────────────

export type NodeId = "router" | "question_agent" | "code_gen_agent" | "code_completion_agent" | "history_agent" | "end";

// ─── Agent that was selected by the router ────────────────────────────────────

export type RoutedAgent = "question" | "code_generation" | "code_completion";

// ─── Per-node execution status ────────────────────────────────────────────────

export type NodeStatus = "pending" | "running" | "done" | "error";

// ─── All agent names ─────────────────────────────────

export type AgentName = RoutedAgent | "history_agent" ;

// ─── The shared state object that flows through every node ───────────────────

export interface GraphState {
  /** The original user message */
  userMessage: string;

  /** Conversation history passed in from the client */
  history: ConversationMessage[];

  /** Current Python code from the editor (for code completion) */
  currentCode?: string;

  /** Which node is currently executing */
  currentNode: NodeId;

  /** Execution status per node */
  nodeStatuses: Partial<Record<NodeId, NodeStatus>>;

  /** Router output — which agent to invoke */
  routedTo?: RoutedAgent;

  /** Final text reply shown in the chat bubble */
  reply?: string;

  /** Store each agents' outputs */
  agentOutputs: Record<AgentName, string>;

  /**
   * Raw Python code extracted from the code-gen agent's response.
   * If present the client will call onConvertPython() → onImportJson()
   * to draw the code as Blockly blocks.
   */
  pythonCode?: string;

  /** Any unrecoverable error message */
  error?: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialState(
  userMessage: string,
  history: ConversationMessage[] = [],
  currentCode?: string
): GraphState {
  return {
    userMessage,
    history,
    currentCode,
    currentNode: "history_agent",
    nodeStatuses: { history_agent: "pending" },
    agentOutputs: {
      question: "",
      code_generation: "",
      code_completion: "",
      history_agent: ""
    }
  };
}
