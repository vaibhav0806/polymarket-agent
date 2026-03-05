import "dotenv/config";
import { getGamesToday, getStandings, getInjuries } from "@/lib/data/sports";
import { getNBATweets } from "@/lib/data/twitter";
import { getFlag, output, fatal } from "./_utils";

async function main() {
  const teamsRaw = getFlag("teams");
  const teams = teamsRaw ? teamsRaw.split(",").map((t) => t.trim()) : undefined;

  const [games, standings, injuries, tweets] = await Promise.all([
    getGamesToday(),
    getStandings(),
    getInjuries(),
    getNBATweets(teams),
  ]);

  output({
    games: { count: games.length, data: games },
    standings: { count: standings.length, data: standings },
    injuries: { count: injuries.length, data: injuries },
    tweets: { count: tweets.length, data: tweets },
  });
}

main().catch((err) => fatal(err.message));
