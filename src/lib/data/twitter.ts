import { TwitterApi } from "twitter-api-v2";
import { getConfig } from "@/lib/config";
import type { Tweet } from "@/lib/data/types";

export async function getNBATweets(teams?: string[]): Promise<Tweet[]> {
  const bearerToken = await getConfig("twitterBearerToken");
  if (!bearerToken) {
    console.warn("[twitter] No bearer token configured, skipping tweet fetch");
    return [];
  }

  const client = new TwitterApi(bearerToken).readOnly;

  // Build query: NBA-related injury/trade/lineup news
  const baseTerms = ["NBA injury", "NBA trade", "NBA lineup", "NBA out tonight"];
  const teamQueries = teams?.length
    ? teams.map((t) => `${t} NBA`)
    : [];
  const allTerms = [...baseTerms, ...teamQueries];
  // Twitter search allows OR-joined terms; limit query length
  const query = allTerms.slice(0, 10).join(" OR ") + " -is:retweet lang:en";

  try {
    // Search recent tweets from the last few hours
    const now = new Date();
    const startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago

    const result = await client.v2.search(query, {
      max_results: 20,
      "tweet.fields": ["created_at", "author_id"],
      start_time: startTime.toISOString(),
    });

    const tweets: Tweet[] = [];
    for (const tweet of result.data?.data ?? []) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
      });
    }

    return tweets;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[twitter] Search failed: ${message}`);
    return [];
  }
}
