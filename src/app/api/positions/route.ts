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

    // Build a title→dbPosition lookup for matching (CLI and DB share market title)
    const dbByTitle = new Map<string, typeof dbPositions[number]>();
    for (const pos of dbPositions) {
      dbByTitle.set(pos.marketTitle.toLowerCase(), pos);
    }

    const positionMap = new Map<string, Record<string, unknown>>();

    // Seed with DB positions
    for (const pos of dbPositions) {
      positionMap.set(pos.marketId, { ...pos, source: "db" });
    }

    // Merge live CLI positions (CLI returns snake_case fields)
    for (const pos of livePositions) {
      const live = pos as Record<string, string>;
      const title = live.title ?? "";
      const size = parseFloat(live.size ?? "0");
      const avgPrice = parseFloat(live.avg_price ?? "0");
      const currentPrice = parseFloat(live.cur_price ?? "0");
      const cashPnl = parseFloat(live.cash_pnl ?? "0");
      const percentPnl = parseFloat(live.percent_pnl ?? "0");

      // Try to match with a DB position by title
      const dbMatch = title ? dbByTitle.get(title.toLowerCase()) : null;

      if (dbMatch) {
        // Merge live data into the DB entry
        positionMap.set(dbMatch.marketId, {
          ...dbMatch,
          size,
          avgPrice,
          currentPrice,
          pnl: cashPnl,
          percentPnl,
          outcome: live.outcome,
          conditionId: live.condition_id,
          source: "merged",
        });
      } else {
        // Live-only position (not in DB)
        const key = live.condition_id ?? live.slug ?? title;
        if (!key) continue;
        positionMap.set(key, {
          marketId: key,
          marketTitle: title,
          side: live.outcome ?? "YES",
          size,
          avgPrice,
          currentPrice,
          pnl: cashPnl,
          percentPnl,
          conditionId: live.condition_id,
          source: "live",
        });
      }
    }

    return NextResponse.json({ positions: Array.from(positionMap.values()) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch positions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
