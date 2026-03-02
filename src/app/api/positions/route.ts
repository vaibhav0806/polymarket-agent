import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPositions, getWalletAddress } from "@/lib/polymarket/cli";

export async function GET() {
  try {
    // Get DB positions first
    const dbPositions = await prisma.position.findMany();

    // Try to get live positions (requires wallet address)
    let livePositions: Record<string, unknown>[] = [];
    try {
      const walletResult = await getWalletAddress();
      if (walletResult.ok && walletResult.data) {
        const liveResult = await getPositions(walletResult.data.address);
        if (liveResult.ok && liveResult.data) {
          livePositions = liveResult.data;
        }
      }
    } catch {
      // Live fetch is best-effort
    }

    const positionMap = new Map<string, Record<string, unknown>>();

    for (const pos of dbPositions) {
      positionMap.set(pos.marketId, { ...pos, source: "db" });
    }

    for (const pos of livePositions) {
      const marketId =
        (pos as Record<string, string>).conditionId ??
        (pos as Record<string, string>).asset ??
        "";
      if (!marketId) continue;
      const existing = positionMap.get(marketId);
      if (existing) {
        positionMap.set(marketId, { ...existing, ...pos, source: "merged" });
      } else {
        positionMap.set(marketId, { ...pos, source: "live" });
      }
    }

    return NextResponse.json({ positions: Array.from(positionMap.values()) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch positions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
