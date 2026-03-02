import { getConfig } from "@/lib/config";
import type { Game, Standing, Injury, Team } from "@/lib/data/types";

const BASE_URL = "https://api.balldontlie.io/v1";

async function fetchApi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T[]> {
  const apiKey = await getConfig("balldontlieApiKey");
  if (!apiKey) {
    console.warn(
      "[sports] No BallDontLie API key configured, returning empty results"
    );
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
      // 401 = paid tier feature, 404 = endpoint doesn't exist
      if (res.status === 401 || res.status === 404) {
        console.warn(
          `[sports] ${path} returned ${res.status} (likely requires paid tier), skipping`
        );
        return [];
      }
      console.error(
        `[sports] API error ${res.status}: ${res.statusText} for ${path}`
      );
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
  // NBA season straddles years: 2025-2026 season starts in Oct 2025
  return now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
}

/**
 * Fetch today's NBA games. Works on free tier.
 */
export async function getGamesToday(): Promise<Game[]> {
  const today = todayDateString();
  return fetchApi<Game>("/games", {
    "dates[]": today,
  });
}

/**
 * Fetch all NBA teams. Works on free tier.
 * Useful as supplementary signal (team info for context).
 */
export async function getTeams(): Promise<Team[]> {
  return fetchApi<Team>("/teams");
}

/**
 * Fetch NBA standings. Requires paid BallDontLie tier.
 * Degrades gracefully — returns empty array on free tier.
 */
export async function getStandings(): Promise<Standing[]> {
  const season = currentSeason();
  return fetchApi<Standing>("/standings", {
    season: String(season),
  });
}

/**
 * Fetch NBA injuries. Endpoint may not exist.
 * Degrades gracefully — returns empty array.
 */
export async function getInjuries(): Promise<Injury[]> {
  return fetchApi<Injury>("/injuries");
}

/**
 * Search for a player by name. Works on free tier.
 */
export async function searchPlayers(name: string) {
  return fetchApi<Record<string, unknown>>("/players", {
    search: name,
  });
}
