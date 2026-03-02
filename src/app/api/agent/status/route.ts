import { NextResponse } from "next/server";
import { getAgentStatus } from "@/lib/agent/loop";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const status = await getAgentStatus();

    const recentCycles = await prisma.agentCycle.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      running: status.running,
      lastCycleAt: status.lastCycleAt,
      cycleCount: status.cycleCount,
      recentCycles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get agent status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
