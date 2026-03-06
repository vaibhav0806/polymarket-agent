import OpenAI from "openai";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import type { StrategyConfig } from "@/lib/config";
import type { EnrichedMarket } from "@/lib/polymarket/types";
import type { Signal } from "@/lib/data/types";

// --- LLM output schema ---

export const RecommendationSchema = z.object({
  marketId: z.coerce.string(), // LLM sometimes returns numeric IDs
  marketTitle: z.string(),
  action: z.enum(["BUY", "SELL", "SKIP"]),
  side: z.enum(["YES", "NO"]),
  confidence: z.number().min(0).max(1),
  amount: z.number().min(0),
  reasoning: z.string(),
});

export const AnalysisResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

function buildSystemPrompt(strategy: StrategyConfig): string {
  const lines = [
    "You are an NBA sports betting analyst for Polymarket prediction markets.",
    "You analyze market data and signals to produce trading recommendations.",
    "",
    "STRATEGY PARAMETERS:",
    `- Risk tolerance: ${strategy.riskTolerance}`,
    `- Focus teams: ${strategy.focusTeams.length > 0 ? strategy.focusTeams.join(", ") : "All teams"}`,
    `- Market types: ${strategy.marketTypes.join(", ")}`,
    `- Max position size: $${strategy.maxPositionSize}`,
    `- Min confidence threshold: ${strategy.minConfidence}`,
    `- Order type: ${strategy.orderType}`,
    "",
  ];

  if (strategy.customRules) {
    lines.push("CUSTOM RULES (follow these strictly):");
    lines.push(strategy.customRules);
    lines.push("");
  }

  lines.push(
    "RESPONSE FORMAT:",
    "Return a JSON object with a 'recommendations' array.",
    "Each recommendation must have: marketId, marketTitle, action (BUY|SELL|SKIP), side (YES|NO), confidence (0-1), amount (in USD), reasoning.",
    "",
    "GUIDELINES:",
    "- Only recommend BUY or SELL when you have meaningful edge. Use SKIP otherwise.",
    "- Confidence should reflect how certain you are about the edge.",
    "- Amount should scale with confidence and respect the max position size.",
    "- Consider injury reports, recent performance, market prices, and sentiment.",
    "- Look for mispriced markets where your analysis differs from current odds.",
    "- For conservative risk: be very selective, lower amounts.",
    "- For aggressive risk: wider range of bets, higher amounts when confident.",
    "- Always provide clear reasoning."
  );

  return lines.join("\n");
}

function buildUserPrompt(
  markets: EnrichedMarket[],
  signals: Signal[]
): string {
  const sections: string[] = [];

  // Markets section
  sections.push("=== CURRENT NBA MARKETS ===");
  for (const market of markets) {
    const prices = market.midpoints
      ? Object.entries(market.midpoints)
          .map(([tokenId, price]) => {
            const outcome = market.outcomes.find((o) => o.tokenId === tokenId);
            return `${outcome?.title ?? tokenId}: ${(price * 100).toFixed(1)}%`;
          })
          .join(", ")
      : "prices unavailable";
    sections.push(
      `[${market.type}] ${market.question} (ID: ${market.id}) - ${prices}`
    );
  }

  // Signals section
  const injurySignals = signals.filter((s) => s.type === "injury");
  const scoreSignals = signals.filter((s) => s.type === "score");
  const standingSignals = signals.filter((s) => s.type === "standing");
  const tweetSignals = signals.filter((s) => s.type === "tweet");

  if (injurySignals.length > 0) {
    sections.push("\n=== INJURY REPORTS ===");
    for (const s of injurySignals) {
      sections.push(JSON.stringify(s.data));
    }
  }

  if (scoreSignals.length > 0) {
    sections.push("\n=== TODAY'S GAMES ===");
    for (const s of scoreSignals) {
      const g = s.data as Record<string, unknown>;
      const home = g.home_team as Record<string, unknown> | undefined;
      const away = g.visitor_team as Record<string, unknown> | undefined;
      sections.push(
        `${home?.full_name ?? "?"} vs ${away?.full_name ?? "?"} at ${g.status} | score: ${g.home_team_score}-${g.visitor_team_score}`
      );
    }
  }

  if (standingSignals.length > 0) {
    sections.push("\n=== STANDINGS ===");
    for (const s of standingSignals) {
      const st = s.data as Record<string, unknown>;
      const team = st.team as Record<string, unknown> | undefined;
      sections.push(`${team?.full_name ?? "?"}: ${st.wins}W-${st.losses}L`);
    }
  }

  if (tweetSignals.length > 0) {
    sections.push("\n=== RECENT NBA TWEETS ===");
    for (const s of tweetSignals) {
      sections.push(JSON.stringify(s.data));
    }
  }

  sections.push(
    "\nAnalyze these markets given the signals above and provide your trading recommendations."
  );

  return sections.join("\n");
}

export async function analyzeMarkets(
  markets: EnrichedMarket[],
  signals: Signal[],
  strategy: StrategyConfig
): Promise<Recommendation[]> {
  const apiKey = await getConfig("openaiApiKey");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  if (markets.length === 0) {
    return [];
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: strategy.llmModel,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(strategy) },
      { role: "user", content: buildUserPrompt(markets, signals) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  const parsed = JSON.parse(content);
  const validated = AnalysisResponseSchema.parse(parsed);

  return validated.recommendations;
}
