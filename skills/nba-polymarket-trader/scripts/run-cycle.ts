import "dotenv/config";
import { prisma } from "@/lib/db";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";
import { getGamesToday, getStandings, getInjuries } from "@/lib/data/sports";
import { getNBATweets } from "@/lib/data/twitter";
import { analyzeMarkets } from "@/lib/agent/analyzer";
import { applyRiskFilters } from "@/lib/agent/risk";
import { executeTrades } from "@/lib/agent/executor";
import type { Signal } from "@/lib/data/types";
import { buildStrategy, hasFlag, output, fatal } from "./_utils";

async function main() {
  const dryRun = hasFlag("dry-run");
  const strategy = buildStrategy();
  const startTime = Date.now();

  // 1. Discover markets
  const markets = await discoverNBAMarkets(
    strategy.focusTeams,
    strategy.marketTypes
  );

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

  // 4. Apply risk filters
  const dailyStats = { tradesExecuted: 0, totalPnl: 0, totalExposure: 0 };
  const { approved, rejected, circuitBreakerTripped } = applyRiskFilters(
    recommendations,
    strategy,
    dailyStats
  );

  if (dryRun) {
    output({
      dryRun: true,
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
    return;
  }

  // 5. Create cycle record and execute trades (DB required)
  const cycle = await prisma.agentCycle.create({
    data: { status: "running" },
  });

  // Persist signals
  for (const signal of signals) {
    await prisma.signal.create({
      data: {
        source: signal.source,
        type: signal.type,
        data: JSON.stringify(signal.data),
        cycleId: cycle.id,
      },
    });
  }

  const execResults = await executeTrades(approved, strategy, cycle.id, markets);
  const successfulTrades = execResults.filter((r) => r.success).length;
  const durationMs = Date.now() - startTime;

  await prisma.agentCycle.update({
    where: { id: cycle.id },
    data: {
      status: "completed",
      marketsFound: markets.length,
      signalsFetched: signals.length,
      tradesExecuted: successfulTrades,
      durationMs,
    },
  });

  output({
    dryRun: false,
    cycleId: cycle.id,
    durationMs,
    marketsFound: markets.length,
    signalsCollected: signals.length,
    tradesExecuted: successfulTrades,
    tradesFailed: execResults.filter((r) => !r.success).length,
    results: execResults.map((r) => ({
      market: r.recommendation.marketTitle,
      success: r.success,
      tradeId: r.tradeId,
      txHash: r.txHash,
      error: r.error,
    })),
  });
}

main().catch((err) => fatal(err.message));
