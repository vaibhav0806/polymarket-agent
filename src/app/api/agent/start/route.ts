import { NextResponse } from "next/server";
import { startAgent } from "@/lib/agent/loop";

export async function POST() {
  try {
    await startAgent();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
