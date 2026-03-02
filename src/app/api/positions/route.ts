import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPositions } from "@/lib/polymarket/cli";

export async function GET() {
  try {
    const [dbPositions, liveResult] = await Promise.all([
      prisma.position.findMany(),
      getPositions(),
    ]);

    const livePositions = liveResult.ok && liveResult.data ? liveResult.data : [];

    const positionMap = new Map<string, Record<string, unknown>>();

    for (const pos of dbPositions) {
      positionMap.set(pos.marketId, { ...pos, source: "db" });
    }

    for (const pos of livePositions) {
      const marketId = pos.marketId ?? pos.tokenId;
      const existing = positionMap.get(marketId);
      if (existing) {
        positionMap.set(marketId, { ...existing, ...pos, source: "merged" });
      } else {
        positionMap.set(marketId, { ...pos, source: "live" });
      }
    }

    return NextResponse.json({ positions: Array.from(positionMap.values()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch positions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
