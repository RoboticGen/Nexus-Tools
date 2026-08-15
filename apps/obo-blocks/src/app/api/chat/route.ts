import { type NextRequest, NextResponse } from "next/server";

import { runGraph } from "@/agent";
import { classifyError, userMessageFor } from "@/agent/errors";

import type { ChatRequest, ChatResponse } from "@/agent";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json<ChatResponse>(
        { reply: "", error: "Message is required." },
        { status: 400 }
      );
    }

    // Run the full agent graph: Router → QuestionAgent | CodeGenAgent
    // Pass preferredMode to override automatic routing if user selected a mode
    const finalState = await runGraph(
      body.message,
      body.history ?? [],
      body.currentCode,
      body.mode
    );

    if (finalState.error && !finalState.reply && !finalState.pythonCode) {
      // `finalState.error` names internals ("Router error: fetch failed"), so it
      // stays in the server log; the client only ever sees the sanitised text.
      console.error("[/api/chat] Graph failed:", finalState.error);
      return NextResponse.json<ChatResponse>(
        { reply: "", error: userMessageFor(finalState.errorKind) },
        { status: 500 }
      );
    }

    // Code came back despite a failure further along — worth logging, but the
    // user still gets their blocks, so it is not surfaced as an error.
    if (finalState.error) {
      console.warn("[/api/chat] Recovered after:", finalState.error);
    }

    const response: ChatResponse = {
      reply: finalState.reply ?? "No response generated.",
      agent: finalState.routedTo,
      pythonCode: finalState.pythonCode,
      // Mark as fallback if error occurred but code was generated anyway
      isFallback: !!finalState.error && !!finalState.pythonCode,
    };

    return NextResponse.json<ChatResponse>(response);
  } catch (err) {
    console.error("[/api/chat] Error:", err);
    return NextResponse.json<ChatResponse>(
      { reply: "", error: userMessageFor(classifyError(err)) },
      { status: 500 }
    );
  }
}
