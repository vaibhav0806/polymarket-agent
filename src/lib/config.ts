import { prisma } from "@/lib/db";

export interface StrategyConfig {
  id: number;
  focusTeams: string[];
  marketTypes: string[];
  riskTolerance: "conservative" | "moderate" | "aggressive";
  maxPositionSize: number;
  maxTotalExposure: number;
  minConfidence: number;
  maxDailyTrades: number;
  maxDailyLoss: number;
  orderType: "market" | "limit";
  pollIntervalMs: number;
  llmModel: string;
  customRules: string;
  active: boolean;
}

const STRATEGY_DEFAULTS: Omit<StrategyConfig, "id"> = {
  focusTeams: [],
  marketTypes: ["moneyline", "spreads", "totals", "player_prop", "futures"],
  riskTolerance: "moderate",
  maxPositionSize: 10,
  maxTotalExposure: 100,
  minConfidence: 0.6,
  maxDailyTrades: 10,
  maxDailyLoss: 50,
  orderType: "market",
  pollIntervalMs: 300000,
  llmModel: "gpt-4o-mini",
  customRules: "",
  active: true,
};

export async function getConfig(key: string): Promise<string | null> {
  const row = await prisma.config.findUnique({ where: { key } });
  if (row) return row.value;
  // Fallback to environment variable (uppercase, underscored)
  const envKey = key.toUpperCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "");
  return process.env[envKey] ?? process.env[key] ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getStrategy(): Promise<StrategyConfig> {
  const row = await prisma.strategy.findFirst({
    where: { active: true },
    orderBy: { id: "desc" },
  });

  if (!row) {
    return { id: 0, ...STRATEGY_DEFAULTS };
  }

  return {
    id: row.id,
    focusTeams: JSON.parse(row.focusTeams) as string[],
    marketTypes: JSON.parse(row.marketTypes) as string[],
    riskTolerance: row.riskTolerance as StrategyConfig["riskTolerance"],
    maxPositionSize: row.maxPositionSize,
    maxTotalExposure: row.maxTotalExposure,
    minConfidence: row.minConfidence,
    maxDailyTrades: row.maxDailyTrades,
    maxDailyLoss: row.maxDailyLoss,
    orderType: row.orderType as StrategyConfig["orderType"],
    pollIntervalMs: row.pollIntervalMs,
    llmModel: row.llmModel,
    customRules: row.customRules,
    active: row.active,
  };
}

export async function updateStrategy(
  data: Partial<Omit<StrategyConfig, "id">>
): Promise<StrategyConfig> {
  const current = await getStrategy();

  const updatePayload: Record<string, unknown> = {};
  if (data.focusTeams !== undefined)
    updatePayload.focusTeams = JSON.stringify(data.focusTeams);
  if (data.marketTypes !== undefined)
    updatePayload.marketTypes = JSON.stringify(data.marketTypes);
  if (data.riskTolerance !== undefined)
    updatePayload.riskTolerance = data.riskTolerance;
  if (data.maxPositionSize !== undefined)
    updatePayload.maxPositionSize = data.maxPositionSize;
  if (data.maxTotalExposure !== undefined)
    updatePayload.maxTotalExposure = data.maxTotalExposure;
  if (data.minConfidence !== undefined)
    updatePayload.minConfidence = data.minConfidence;
  if (data.maxDailyTrades !== undefined)
    updatePayload.maxDailyTrades = data.maxDailyTrades;
  if (data.maxDailyLoss !== undefined)
    updatePayload.maxDailyLoss = data.maxDailyLoss;
  if (data.orderType !== undefined) updatePayload.orderType = data.orderType;
  if (data.pollIntervalMs !== undefined)
    updatePayload.pollIntervalMs = data.pollIntervalMs;
  if (data.llmModel !== undefined) updatePayload.llmModel = data.llmModel;
  if (data.customRules !== undefined)
    updatePayload.customRules = data.customRules;
  if (data.active !== undefined) updatePayload.active = data.active;

  if (current.id === 0) {
    // No existing strategy, create one
    const row = await prisma.strategy.create({
      data: {
        focusTeams: JSON.stringify(data.focusTeams ?? STRATEGY_DEFAULTS.focusTeams),
        marketTypes: JSON.stringify(data.marketTypes ?? STRATEGY_DEFAULTS.marketTypes),
        riskTolerance: data.riskTolerance ?? STRATEGY_DEFAULTS.riskTolerance,
        maxPositionSize: data.maxPositionSize ?? STRATEGY_DEFAULTS.maxPositionSize,
        maxTotalExposure: data.maxTotalExposure ?? STRATEGY_DEFAULTS.maxTotalExposure,
        minConfidence: data.minConfidence ?? STRATEGY_DEFAULTS.minConfidence,
        maxDailyTrades: data.maxDailyTrades ?? STRATEGY_DEFAULTS.maxDailyTrades,
        maxDailyLoss: data.maxDailyLoss ?? STRATEGY_DEFAULTS.maxDailyLoss,
        orderType: data.orderType ?? STRATEGY_DEFAULTS.orderType,
        pollIntervalMs: data.pollIntervalMs ?? STRATEGY_DEFAULTS.pollIntervalMs,
        llmModel: data.llmModel ?? STRATEGY_DEFAULTS.llmModel,
        customRules: data.customRules ?? STRATEGY_DEFAULTS.customRules,
        active: data.active ?? STRATEGY_DEFAULTS.active,
      },
    });
    return getStrategy();
  }

  await prisma.strategy.update({
    where: { id: current.id },
    data: updatePayload,
  });

  return getStrategy();
}
