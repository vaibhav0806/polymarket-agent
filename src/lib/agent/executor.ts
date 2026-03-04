import { prisma } from "@/lib/db";
import {
  createMarketOrder,
  createLimitOrder,
  getMidpoint,
} from "@/lib/polymarket/cli";
import type { StrategyConfig } from "@/lib/config";
import type { Recommendation } from "@/lib/agent/analyzer";
import type { EnrichedMarket } from "@/lib/polymarket/types";

export interface ExecutionResult {
  recommendation: Recommendation;
  success: boolean;
  tradeId: number;
  txHash?: string;
  error?: string;
}

function findTokenId(
  recommendation: Recommendation,
  markets: EnrichedMarket[]
): string | null {
  const market = markets.find((m) => m.id === recommendation.marketId);
  if (!market) return null;

  // Match side to outcome: YES → first outcome (index 0), NO → second (index 1)
  const sideIndex = recommendation.side === "YES" ? 0 : 1;
  const outcome = market.outcomes[sideIndex];
  if (outcome?.tokenId) return outcome.tokenId;

  // Fallback: try to find by title match
  const sideLabel = recommendation.side.toLowerCase();
  const match = market.outcomes.find(
    (o) => o.title.toLowerCase() === sideLabel
  );
  return match?.tokenId ?? null;
}

export async function executeTrades(
  recommendations: Recommendation[],
  strategy: StrategyConfig,
  cycleId: number,
  markets: EnrichedMarket[] = []
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const rec of recommendations) {
    if (rec.action === "SKIP") continue;

    const tokenId = findTokenId(rec, markets);
    if (!tokenId) {
      console.warn(`[executor] No token ID found for market ${rec.marketId} side ${rec.side}, skipping`);
      continue;
    }

    // Create pending trade record
    const trade = await prisma.trade.create({
      data: {
        marketId: rec.marketId,
        marketTitle: rec.marketTitle,
        side: rec.side,
        action: rec.action,
        amount: rec.amount,
        price: 0, // Will be updated after execution
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        status: "pending",
        cycleId,
      },
    });

    try {
      let orderResult;

      if (strategy.orderType === "limit") {
        // For limit orders, fetch the current midpoint as the price
        const midResult = await getMidpoint(tokenId);
        const price =
          midResult.ok && midResult.data
            ? parseFloat(midResult.data.midpoint)
            : 0.5;

        orderResult = await createLimitOrder(
          tokenId,
          rec.action,
          rec.amount,
          price
        );

        // Update trade with the actual price
        await prisma.trade.update({
          where: { id: trade.id },
          data: { price },
        });
      } else {
        orderResult = await createMarketOrder(tokenId, rec.action, rec.amount);
      }

      if (orderResult.ok && orderResult.data) {
        const data = orderResult.data;
        const success = data.success !== false && data.status !== "REJECTED";
        const txHash =
          data.transaction_hashes?.[0] ??
          data.order_id ??
          undefined;

        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            status: success ? "filled" : "failed",
            txHash,
            errorMsg: success ? undefined : (data.error_msg || data.status),
          },
        });

        // Upsert position — use outcome price from enriched market as execution price
        const mkt = markets.find((m) => m.id === rec.marketId);
        const sideIdx = rec.side === "YES" ? 0 : 1;
        const execPrice = mkt?.outcomes[sideIdx]?.price ?? 0.5;
        await upsertPosition(rec, execPrice);

        results.push({
          recommendation: rec,
          success,
          tradeId: trade.id,
          txHash,
        });
      } else {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            status: "failed",
            errorMsg: orderResult.error,
          },
        });

        results.push({
          recommendation: rec,
          success: false,
          tradeId: trade.id,
          error: orderResult.error,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: "failed",
          errorMsg: message,
        },
      });

      results.push({
        recommendation: rec,
        success: false,
        tradeId: trade.id,
        error: message,
      });
    }
  }

  return results;
}

async function upsertPosition(rec: Recommendation, executionPrice: number): Promise<void> {
  const existing = await prisma.position.findUnique({
    where: { marketId: rec.marketId },
  });

  if (existing) {
    const isSameSide = existing.side === rec.side;
    let newSize: number;
    let newAvgPrice: number;

    if (rec.action === "BUY" && isSameSide) {
      // Adding to position
      const totalCost =
        existing.avgPrice * existing.size + executionPrice * rec.amount;
      newSize = existing.size + rec.amount;
      newAvgPrice = newSize > 0 ? totalCost / newSize : existing.avgPrice;
    } else if (rec.action === "SELL" && isSameSide) {
      // Reducing position
      newSize = Math.max(0, existing.size - rec.amount);
      newAvgPrice = existing.avgPrice;
    } else {
      // Opposite side -- net out
      newSize = Math.abs(existing.size - rec.amount);
      newAvgPrice = existing.avgPrice;
    }

    if (newSize <= 0) {
      await prisma.position.delete({ where: { marketId: rec.marketId } });
    } else {
      await prisma.position.update({
        where: { marketId: rec.marketId },
        data: {
          size: newSize,
          avgPrice: newAvgPrice,
          side: rec.side,
        },
      });
    }
  } else if (rec.action === "BUY") {
    await prisma.position.create({
      data: {
        marketId: rec.marketId,
        marketTitle: rec.marketTitle,
        side: rec.side,
        size: rec.amount,
        avgPrice: executionPrice,
      },
    });
  }
}
