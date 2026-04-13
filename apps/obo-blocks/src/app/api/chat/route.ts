import { NextRequest, NextResponse } from "next/server";
import { runGraph } from "@/agent";
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

    if (finalState.error && !finalState.reply) {
      return NextResponse.json<ChatResponse>(
        { reply: "", error: finalState.error },
        { status: 500 }
      );
    }

    const response: ChatResponse = {
      reply: finalState.reply ?? "No response generated.",
      agent: finalState.routedTo,
      pythonCode: finalState.pythonCode,
    };

    return NextResponse.json<ChatResponse>(response);
  } catch (err) {
    console.error("[/api/chat] Error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json<ChatResponse>(
      { reply: "", error: message },
      { status: 500 }
    );
  }
}
