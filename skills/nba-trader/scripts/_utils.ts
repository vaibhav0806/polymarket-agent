import { STRATEGY_DEFAULTS } from "@/lib/config";
import type { StrategyConfig } from "@/lib/config";

export function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function fatal(msg: string): never {
  console.error(JSON.stringify({ error: msg }));
  process.exit(1);
}

export function buildStrategy(
  overrides?: Partial<Omit<StrategyConfig, "id">>
): StrategyConfig {
  const teams = getFlag("teams");
  const types = getFlag("types");
  const risk = getFlag("risk") as StrategyConfig["riskTolerance"] | undefined;
  const minConfidence = getFlag("min-confidence");
  const maxPosition = getFlag("max-position");
  const maxExposure = getFlag("max-exposure");
  const customRules = getFlag("custom-rules");
  const model = getFlag("model");

  return {
    id: 0,
    ...STRATEGY_DEFAULTS,
    ...overrides,
    ...(teams && { focusTeams: teams.split(",").map((t) => t.trim()) }),
    ...(types && { marketTypes: types.split(",").map((t) => t.trim()) }),
    ...(risk && { riskTolerance: risk }),
    ...(minConfidence && { minConfidence: parseFloat(minConfidence) }),
    ...(maxPosition && { maxPositionSize: parseFloat(maxPosition) }),
    ...(maxExposure && { maxTotalExposure: parseFloat(maxExposure) }),
    ...(customRules && { customRules }),
    ...(model && { llmModel: model }),
  };
}
