import { searchMarkets, getMidpoint } from "@/lib/polymarket/cli";
import type {
  EnrichedMarket,
  MarketType,
  Market,
  ParsedMarketOutcome,
} from "@/lib/polymarket/types";

const NBA_QUERIES = [
  "NBA",
  "NBA basketball",
  "NBA winner",
  "NBA championship",
];

// Real Polymarket market types from `polymarket sports market-types`
const MARKET_TYPE_MAP: Record<string, MarketType> = {
  moneyline: "moneyline",
  spreads: "spreads",
  totals: "totals",
  points: "player_prop",
  rebounds: "player_prop",
  assists: "player_prop",
  threes: "player_prop",
  assists_points_rebounds: "player_prop",
  double_doubles: "player_prop",
};

function classifyMarket(market: Market): MarketType {
  // Prefer the sportsMarketType field if set
  if (market.sportsMarketType) {
    const mapped = MARKET_TYPE_MAP[market.sportsMarketType];
    if (mapped) return mapped;
  }

  // Fallback to title heuristics
  const lower = market.question.toLowerCase();
  if (
    lower.includes("spread") ||
    lower.includes("cover") ||
    lower.includes("handicap")
  ) {
    return "spreads";
  }
  if (lower.includes("total") || lower.includes("over/under")) {
    return "totals";
  }
  if (
    lower.includes("points") ||
    lower.includes("rebounds") ||
    lower.includes("assists") ||
    lower.includes("threes") ||
    lower.includes("prop")
  ) {
    return "player_prop";
  }
  if (
    lower.includes("championship") ||
    lower.includes("mvp") ||
    lower.includes("finals") ||
    lower.includes("win the") ||
    lower.includes("make the playoffs") ||
    lower.includes("regular season")
  ) {
    return "futures";
  }
  if (
    lower.includes(" vs") ||
    lower.includes(" vs.") ||
    lower.includes("win")
  ) {
    return "moneyline";
  }
  return "unknown";
}

function parseOutcomes(market: Market): ParsedMarketOutcome[] {
  const outcomes: ParsedMarketOutcome[] = [];

  let titles: string[] = [];
  let tokenIds: string[] = [];
  let prices: string[] = [];

  try {
    titles = JSON.parse(market.outcomes);
  } catch {
    return outcomes;
  }

  try {
    tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
  } catch {
    tokenIds = [];
  }

  try {
    prices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
  } catch {
    prices = [];
  }

  for (let i = 0; i < titles.length; i++) {
    outcomes.push({
      title: titles[i],
      tokenId: tokenIds[i] ?? "",
      price: prices[i] ? parseFloat(prices[i]) : null,
    });
  }

  return outcomes;
}

function marketMatchesTeams(question: string, focusTeams: string[]): boolean {
  if (focusTeams.length === 0) return true;
  const lower = question.toLowerCase();
  return focusTeams.some((team) => lower.includes(team.toLowerCase()));
}

async function fetchMidpoints(
  outcomes: ParsedMarketOutcome[]
): Promise<Record<string, number>> {
  const midpoints: Record<string, number> = {};
  for (const outcome of outcomes) {
    if (!outcome.tokenId) continue;
    const result = await getMidpoint(outcome.tokenId);
    if (result.ok && result.data) {
      midpoints[outcome.tokenId] = parseFloat(result.data.midpoint);
    }
  }
  return midpoints;
}

export async function discoverNBAMarkets(
  focusTeams: string[] = [],
  allowedTypes: string[] = [
    "moneyline",
    "spreads",
    "totals",
    "player_prop",
    "futures",
  ]
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

  // Filter and enrich
  const enriched: EnrichedMarket[] = [];
  for (const market of allMarkets) {
    // Skip closed markets
    if (market.closed) continue;

    // Skip markets not accepting orders
    if (market.acceptingOrders === false) continue;

    // Filter by team focus
    if (!marketMatchesTeams(market.question, focusTeams)) continue;

    // Classify market type
    const type = classifyMarket(market);
    if (type !== "unknown" && !allowedTypes.includes(type)) continue;

    // Parse outcomes from JSON strings
    const outcomes = parseOutcomes(market);
    if (outcomes.length === 0) continue;

    // Fetch live midpoint prices
    const midpoints = await fetchMidpoints(outcomes);

    enriched.push({
      id: market.id,
      question: market.question,
      slug: market.slug ?? undefined,
      description: market.description ?? undefined,
      outcomes,
      type,
      midpoints,
      closed: !!market.closed,
      volume: market.volumeNum ? parseFloat(market.volumeNum) : 0,
      sportsMarketType: market.sportsMarketType ?? null,
    });
  }

  return enriched;
}
