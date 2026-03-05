import "dotenv/config";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";
import { getFlag, output, fatal } from "./_utils";

async function main() {
  const teamsRaw = getFlag("teams");
  const typesRaw = getFlag("types");

  const focusTeams = teamsRaw ? teamsRaw.split(",").map((t) => t.trim()) : [];
  const allowedTypes = typesRaw
    ? typesRaw.split(",").map((t) => t.trim())
    : undefined;

  const markets = await discoverNBAMarkets(focusTeams, allowedTypes);

  output({
    count: markets.length,
    markets: markets.map((m) => ({
      id: m.id,
      question: m.question,
      type: m.type,
      outcomes: m.outcomes.map((o) => ({
        title: o.title,
        tokenId: o.tokenId,
        price: o.price,
      })),
      midpoints: m.midpoints,
      volume: m.volume,
    })),
  });
}

main().catch((err) => fatal(err.message));
