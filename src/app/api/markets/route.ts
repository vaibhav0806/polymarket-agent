import { NextRequest, NextResponse } from "next/server";
import { discoverNBAMarkets } from "@/lib/polymarket/markets";

let cachedMarkets: Awaited<ReturnType<typeof discoverNBAMarkets>> | null = null;

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";

    if (!cachedMarkets || refresh) {
      cachedMarkets = await discoverNBAMarkets();
    }

    return NextResponse.json({ markets: cachedMarkets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to discover markets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
