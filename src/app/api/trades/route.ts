import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count(),
    ]);

    return NextResponse.json({ trades, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch trades";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
