import { NextResponse } from "next/server";
import { stopAgent } from "@/lib/agent/loop";

export async function POST() {
  try {
    await stopAgent();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
