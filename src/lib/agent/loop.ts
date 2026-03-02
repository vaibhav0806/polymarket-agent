import { prisma } from "@/lib/db";
import { getStrategy } from "@/lib/config";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";
import { getGamesToday, getStandings, getInjuries } from "@/lib/data/sports";
import { getNBATweets } from "@/lib/data/twitter";
import { analyzeMarkets } from "@/lib/agent/analyzer";
import { applyRiskFilters } from "@/lib/agent/risk";
import type { DailyStats } from "@/lib/agent/risk";
import { executeTrades } from "@/lib/agent/executor";
import type { Signal } from "@/lib/data/types";

// --- Singleton state ---

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;
let cycleCount = 0;
let lastCycleAt: Date | null = null;
let cycleInProgress = false;

export interface AgentStatus {
  running: boolean;
  cycleCount: number;
  lastCycleAt: string | null;
}

export function getAgentStatus(): AgentStatus {
  return {
    running,
    cycleCount,
    lastCycleAt: lastCycleAt?.toISOString() ?? null,
  };
}

async function getDailyStats(): Promise<DailyStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayTrades = await prisma.trade.findMany({
    where: {
      createdAt: { gte: startOfDay },
      status: "filled",
    },
  });

  const positions = await prisma.position.findMany();

  const tradesExecuted = todayTrades.length;
  const totalExposure = positions.reduce((sum, p) => sum + p.size, 0);
  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0);

  return { tradesExecuted, totalPnl, totalExposure };
}

async function collectSignals(
  focusTeams: string[],
  cycleId: number
): Promise<Signal[]> {
  const signals: Signal[] = [];
  const now = new Date().toISOString();

  // Fetch all data sources in parallel
  const [games, standings, injuries, tweets] = await Promise.all([
    getGamesToday(),
    getStandings(),
    getInjuries(),
    getNBATweets(focusTeams),
  ]);

  // Convert to signals
  for (const game of games) {
    signals.push({
      source: "balldontlie",
      type: "score",
      data: game,
      timestamp: now,
    });
  }

  for (const standing of standings) {
    signals.push({
      source: "balldontlie",
      type: "standing",
      data: standing,
      timestamp: now,
    });
  }

  for (const injury of injuries) {
    signals.push({
      source: "balldontlie",
      type: "injury",
      data: injury,
      timestamp: now,
    });
  }

  for (const tweet of tweets) {
    signals.push({
      source: "twitter",
      type: "tweet",
      data: tweet,
      timestamp: now,
    });
  }

  // Persist signals to DB
  for (const signal of signals) {
    await prisma.signal.create({
      data: {
        source: signal.source,
        type: signal.type,
        data: JSON.stringify(signal.data),
        cycleId,
      },
    });
  }

  return signals;
}

async function runCycle(): Promise<void> {
  if (cycleInProgress) {
    console.warn("[agent] Previous cycle still in progress, skipping");
    return;
  }

  cycleInProgress = true;
  const startTime = Date.now();

  // Create cycle record
  const cycle = await prisma.agentCycle.create({
    data: { status: "running" },
  });

  try {
    const strategy = await getStrategy();

    // 1. Discover NBA markets
    const markets = await discoverNBAMarkets(
      strategy.focusTeams,
      strategy.marketTypes
    );

    // 2. Collect signals
    const signals = await collectSignals(strategy.focusTeams, cycle.id);

    // 3. Analyze with LLM
    const recommendations = await analyzeMarkets(markets, signals, strategy);

    // 4. Apply risk filters
    const dailyStats = await getDailyStats();
    const { approved, rejected, circuitBreakerTripped } = applyRiskFilters(
      recommendations,
      strategy,
      dailyStats
    );

    if (circuitBreakerTripped) {
      console.warn("[agent] Circuit breaker tripped, no trades this cycle");
    }

    if (rejected.length > 0) {
      console.log(
        `[agent] Rejected ${rejected.length} recommendations:`,
        rejected.map((r) => `${r.recommendation.marketTitle}: ${r.reason}`)
      );
    }

    // 5. Execute approved trades
    const execResults = await executeTrades(approved, strategy, cycle.id, markets);
    const successfulTrades = execResults.filter((r) => r.success).length;

    // 6. Update cycle record
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

    cycleCount++;
    lastCycleAt = new Date();

    console.log(
      `[agent] Cycle ${cycle.id} completed in ${durationMs}ms: ` +
        `${markets.length} markets, ${signals.length} signals, ${successfulTrades} trades`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent] Cycle ${cycle.id} error: ${message}`);

    await prisma.agentCycle.update({
      where: { id: cycle.id },
      data: {
        status: "error",
        errorMsg: message,
        durationMs: Date.now() - startTime,
      },
    });
  } finally {
    cycleInProgress = false;
  }
}

export async function startAgent(): Promise<void> {
  if (running) {
    console.warn("[agent] Agent is already running");
    return;
  }

  const strategy = await getStrategy();
  running = true;

  console.log(
    `[agent] Starting agent loop with ${strategy.pollIntervalMs}ms interval`
  );

  // Run first cycle immediately
  runCycle();

  // Schedule subsequent cycles
  intervalHandle = setInterval(() => {
    runCycle();
  }, strategy.pollIntervalMs);
}

export function stopAgent(): void {
  if (!running) {
    console.warn("[agent] Agent is not running");
    return;
  }

  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }

  running = false;
  console.log("[agent] Agent stopped");
}
