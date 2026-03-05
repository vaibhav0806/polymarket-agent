import "dotenv/config";
import { prisma } from "@/lib/db";
import { getWalletAddress, getPositions } from "@/lib/polymarket/cli";
import { output, fatal } from "./_utils";

async function main() {
  // Fetch DB positions
  const dbPositions = await prisma.position.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Fetch live positions from CLI
  const addrResult = await getWalletAddress();
  let livePositions: unknown[] = [];
  if (addrResult.ok && addrResult.data) {
    const addr = typeof addrResult.data === "string"
      ? addrResult.data
      : (addrResult.data as Record<string, string>).address ?? "";
    if (addr) {
      const posResult = await getPositions(addr);
      if (posResult.ok && posResult.data) {
        livePositions = Array.isArray(posResult.data) ? posResult.data : [];
      }
    }
  }

  output({
    dbPositions: dbPositions.map((p) => ({
      marketId: p.marketId,
      marketTitle: p.marketTitle,
      side: p.side,
      size: p.size,
      avgPrice: p.avgPrice,
      currentPrice: p.currentPrice,
      pnl: p.pnl,
      updatedAt: p.updatedAt.toISOString(),
    })),
    livePositions,
  });
}

main().catch((err) => fatal(err.message));
