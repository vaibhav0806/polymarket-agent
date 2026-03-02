import { NextRequest, NextResponse } from "next/server";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";

let cachedMarkets: Awaited<ReturnType<typeof discoverNBAMarkets>> | null = null;

export async function GET(request: NextRequest) {
  try {
    console.log("[api/markets] Request received");
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";

    if (!cachedMarkets || refresh) {
      console.log("[api/markets] Fetching markets...");
      cachedMarkets = await discoverNBAMarkets();
      console.log("[api/markets] Found", cachedMarkets.length, "markets");
    }

    return NextResponse.json({ markets: cachedMarkets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to discover markets";
    console.error("[api/markets] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
