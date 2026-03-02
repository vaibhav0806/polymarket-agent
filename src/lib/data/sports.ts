import { getConfig } from "@/lib/config";
import type { Game, Standing, Injury, PlayerStats } from "@/lib/data/types";

const BASE_URL = "https://api.balldontlie.io/v1";

async function fetchApi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T[]> {
  const apiKey = await getConfig("balldontlieApiKey");
  if (!apiKey) {
    console.warn("[sports] No BallDontLie API key configured, returning empty results");
    return [];
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[sports] API error ${res.status}: ${res.statusText} for ${path}`);
      return [];
    }

    const json = await res.json();
    // BallDontLie wraps results in a `data` array
    return (json.data ?? json) as T[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sports] Fetch failed for ${path}: ${message}`);
    return [];
  }
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentSeason(): number {
  const now = new Date();
  // NBA season straddles years: 2024-2025 season starts in Oct 2024
  // If we're in Jan-Jul, the season started the previous year
  return now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
}

export async function getGamesToday(): Promise<Game[]> {
  const today = todayDateString();
  return fetchApi<Game>("/games", {
    "dates[]": today,
  });
}

export async function getStandings(): Promise<Standing[]> {
  const season = currentSeason();
  return fetchApi<Standing>("/standings", {
    season: String(season),
  });
}

export async function getInjuries(): Promise<Injury[]> {
  // The injuries endpoint may not be available on all BallDontLie tiers
  try {
    return await fetchApi<Injury>("/injuries");
  } catch {
    console.warn("[sports] Injuries endpoint not available, returning empty");
    return [];
  }
}

export async function getPlayerStats(playerId: number): Promise<PlayerStats[]> {
  const season = currentSeason();
  return fetchApi<PlayerStats>("/stats", {
    "player_ids[]": String(playerId),
    seasons: String(season),
  });
}
