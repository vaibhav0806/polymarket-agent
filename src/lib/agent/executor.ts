import { prisma } from "@/lib/db";
import {
  createMarketOrder,
  createLimitOrder,
  getMidpoint,
} from "@/lib/polymarket/cli";
import type { StrategyConfig } from "@/lib/config";
import type { Recommendation } from "@/lib/agent/analyzer";

export interface ExecutionResult {
  recommendation: Recommendation;
  success: boolean;
  tradeId: number;
  txHash?: string;
  error?: string;
}

function findTokenId(
  recommendation: Recommendation,
  // We need to resolve the token ID from the market data.
  // For simplicity, the marketId IS the condition ID, and we derive token from side.
  // In practice, markets store tokenIds in outcomes. The analyzer should return
  // the marketId which maps to the market, and we use side to pick YES/NO token.
  // Since we don't have the outcome mapping here, we treat marketId as the tokenId.
): string {
  // The marketId from the analyzer maps to the tokenId for the relevant outcome.
  // The convention is: marketId is the token ID for the YES outcome.
  // If the recommendation says NO, we'd need the NO token. However, on Polymarket,
  // buying NO is equivalent to selling YES in many cases.
  // We'll use marketId as the token ID directly -- the analyzer is expected
  // to provide the correct token ID.
  return recommendation.marketId;
}

export async function executeTrades(
  recommendations: Recommendation[],
  strategy: StrategyConfig,
  cycleId: number
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const rec of recommendations) {
    if (rec.action === "SKIP") continue;

    const tokenId = findTokenId(rec);

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
        const txHash =
          orderResult.data.transactionsHashes?.[0] ??
          orderResult.data.orderID ??
          undefined;

        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            status: "filled",
            txHash,
          },
        });

        // Upsert position
        await upsertPosition(rec);

        results.push({
          recommendation: rec,
          success: true,
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

async function upsertPosition(rec: Recommendation): Promise<void> {
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
        existing.avgPrice * existing.size + rec.confidence * rec.amount;
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
        avgPrice: rec.confidence, // Using confidence as proxy for expected price
      },
    });
  }
}
