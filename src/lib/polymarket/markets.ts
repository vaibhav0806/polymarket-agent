import { searchMarkets, getMidpoint } from "@/lib/polymarket/cli";
import type { EnrichedMarket, MarketType, Market } from "@/lib/polymarket/types";

const NBA_QUERIES = [
  "NBA",
  "NBA basketball winner",
  "NBA spread",
  "NBA player props",
  "NBA championship",
];

function classifyMarket(title: string): MarketType {
  const lower = title.toLowerCase();
  if (
    lower.includes("spread") ||
    lower.includes("cover") ||
    lower.includes("point")
  ) {
    return "spread";
  }
  if (
    lower.includes("points") ||
    lower.includes("rebounds") ||
    lower.includes("assists") ||
    lower.includes("over") ||
    lower.includes("under") ||
    lower.includes("prop")
  ) {
    return "player_prop";
  }
  if (
    lower.includes("championship") ||
    lower.includes("mvp") ||
    lower.includes("finals") ||
    lower.includes("win the") ||
    lower.includes("make the playoffs")
  ) {
    return "futures";
  }
  if (
    lower.includes("win") ||
    lower.includes("vs") ||
    lower.includes("beat") ||
    lower.includes("defeat")
  ) {
    return "game_winner";
  }
  return "unknown";
}

function marketMatchesTeams(market: Market, focusTeams: string[]): boolean {
  if (focusTeams.length === 0) return true;
  const titleLower = market.title.toLowerCase();
  return focusTeams.some((team) => titleLower.includes(team.toLowerCase()));
}

async function fetchMidpoints(
  market: Market
): Promise<Record<string, number>> {
  const midpoints: Record<string, number> = {};
  for (const outcome of market.outcomes) {
    if (!outcome.tokenId) continue;
    const result = await getMidpoint(outcome.tokenId);
    if (result.ok && result.data) {
      midpoints[outcome.tokenId] = result.data.mid;
    }
  }
  return midpoints;
}

export async function discoverNBAMarkets(
  focusTeams: string[] = [],
  allowedTypes: string[] = ["game_winner", "spread", "player_prop", "futures"]
): Promise<EnrichedMarket[]> {
  const seen = new Set<string>();
  const allMarkets: Market[] = [];

  // Search with multiple queries to maximize coverage
  for (const query of NBA_QUERIES) {
    const result = await searchMarkets(query);
    if (!result.ok || !result.data) continue;

    for (const market of result.data) {
      if (seen.has(market.id)) continue;
      seen.add(market.id);
      allMarkets.push(market);
    }
  }

  // Filter by team focus and market type
  const enriched: EnrichedMarket[] = [];
  for (const market of allMarkets) {
    if (!marketMatchesTeams(market, focusTeams)) continue;

    const type = classifyMarket(market.title);
    if (type !== "unknown" && !allowedTypes.includes(type)) continue;

    // Skip closed/inactive markets
    if (market.closed) continue;

    // Fetch current midpoint prices
    const midpoints = await fetchMidpoints(market);

    enriched.push({
      ...market,
      type,
      midpoints,
    });
  }

  return enriched;
}
