import type { StrategyConfig } from "@/lib/config";
import type { Recommendation } from "@/lib/agent/analyzer";

export interface DailyStats {
  tradesExecuted: number;
  totalPnl: number;
  totalExposure: number;
}

export interface RejectedRecommendation {
  recommendation: Recommendation;
  reason: string;
}

export interface RiskFilterResult {
  approved: Recommendation[];
  rejected: RejectedRecommendation[];
  circuitBreakerTripped: boolean;
}

export function applyRiskFilters(
  recommendations: Recommendation[],
  strategy: StrategyConfig,
  dailyStats: DailyStats
): RiskFilterResult {
  const approved: Recommendation[] = [];
  const rejected: RejectedRecommendation[] = [];

  // Circuit breaker: stop all trading if max daily loss exceeded
  if (dailyStats.totalPnl < 0 && Math.abs(dailyStats.totalPnl) >= strategy.maxDailyLoss) {
    for (const rec of recommendations) {
      if (rec.action !== "SKIP") {
        rejected.push({
          recommendation: rec,
          reason: `Circuit breaker: daily loss ($${Math.abs(dailyStats.totalPnl).toFixed(2)}) exceeds max ($${strategy.maxDailyLoss})`,
        });
      }
    }
    return { approved, rejected, circuitBreakerTripped: true };
  }

  let tradesApprovedThisCycle = 0;
  let exposureAdded = 0;

  for (const rec of recommendations) {
    // Skip actions are always passed through (but not counted as trades)
    if (rec.action === "SKIP") continue;

    // Check confidence threshold
    if (rec.confidence < strategy.minConfidence) {
      rejected.push({
        recommendation: rec,
        reason: `Confidence ${rec.confidence.toFixed(2)} below minimum ${strategy.minConfidence}`,
      });
      continue;
    }

    // Check daily trade limit
    if (dailyStats.tradesExecuted + tradesApprovedThisCycle >= strategy.maxDailyTrades) {
      rejected.push({
        recommendation: rec,
        reason: `Daily trade limit reached (${strategy.maxDailyTrades})`,
      });
      continue;
    }

    // Cap position size
    let amount = rec.amount;
    if (amount > strategy.maxPositionSize) {
      amount = strategy.maxPositionSize;
    }

    // Check total exposure
    const newExposure = dailyStats.totalExposure + exposureAdded + amount;
    if (newExposure > strategy.maxTotalExposure) {
      const remaining =
        strategy.maxTotalExposure - dailyStats.totalExposure - exposureAdded;
      if (remaining <= 0) {
        rejected.push({
          recommendation: rec,
          reason: `Total exposure limit ($${strategy.maxTotalExposure}) would be exceeded`,
        });
        continue;
      }
      // Reduce amount to fit within exposure limit
      amount = Math.min(amount, remaining);
    }

    approved.push({ ...rec, amount });
    tradesApprovedThisCycle++;
    exposureAdded += amount;
  }

  return { approved, rejected, circuitBreakerTripped: false };
}
