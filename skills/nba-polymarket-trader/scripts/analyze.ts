import "dotenv/config";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";
import { getGamesToday, getStandings, getInjuries } from "@/lib/data/sports";
import { getNBATweets } from "@/lib/data/twitter";
import { analyzeMarkets } from "@/lib/agent/analyzer";
import { applyRiskFilters } from "@/lib/agent/risk";
import type { Signal } from "@/lib/data/types";
import { buildStrategy, getFlag, output, fatal } from "./_utils";

async function main() {
  const strategy = buildStrategy();

  // 1. Discover markets
  const allMarkets = await discoverNBAMarkets(
    strategy.focusTeams,
    strategy.marketTypes
  );
  const limitFlag = getFlag("limit");
  const markets = limitFlag ? allMarkets.slice(0, parseInt(limitFlag, 10)) : allMarkets;

  // 2. Collect signals
  const now = new Date().toISOString();
  const [games, standings, injuries, tweets] = await Promise.all([
    getGamesToday(),
    getStandings(),
    getInjuries(),
    getNBATweets(strategy.focusTeams),
  ]);

  const signals: Signal[] = [
    ...games.map((g) => ({ source: "balldontlie" as const, type: "score" as const, data: g, timestamp: now })),
    ...standings.map((s) => ({ source: "balldontlie" as const, type: "standing" as const, data: s, timestamp: now })),
    ...injuries.map((i) => ({ source: "balldontlie" as const, type: "injury" as const, data: i, timestamp: now })),
    ...tweets.map((t) => ({ source: "twitter" as const, type: "tweet" as const, data: t, timestamp: now })),
  ];

  // 3. Analyze with LLM
  const recommendations = await analyzeMarkets(markets, signals, strategy);

  // 4. Apply risk filters (no existing stats for standalone run)
  const dailyStats = { tradesExecuted: 0, totalPnl: 0, totalExposure: 0 };
  const { approved, rejected, circuitBreakerTripped } = applyRiskFilters(
    recommendations,
    strategy,
    dailyStats
  );

  output({
    marketsFound: markets.length,
    signalsCollected: signals.length,
    recommendations: {
      total: recommendations.length,
      approved: approved.map((r) => ({
        market: r.marketTitle,
        action: r.action,
        side: r.side,
        confidence: r.confidence,
        amount: r.amount,
        reasoning: r.reasoning,
      })),
      rejected: rejected.map((r) => ({
        market: r.recommendation.marketTitle,
        reason: r.reason,
      })),
      circuitBreakerTripped,
    },
  });
}

main().catch((err) => fatal(err.message));
