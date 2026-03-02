import { NextRequest, NextResponse } from "next/server";
import { getStrategy, updateStrategy } from "@/lib/config";
import { z } from "zod";

const strategyUpdateSchema = z.object({
  focusTeams: z.array(z.string()).optional(),
  marketTypes: z.array(z.string()).optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  maxPositionSize: z.number().positive().optional(),
  maxTotalExposure: z.number().positive().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxDailyTrades: z.number().int().positive().optional(),
  maxDailyLoss: z.number().positive().optional(),
  orderType: z.enum(["market", "limit"]).optional(),
  pollIntervalMs: z.number().int().min(10000).optional(),
  llmModel: z.string().optional(),
  customRules: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const strategy = await getStrategy();
    return NextResponse.json(strategy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get strategy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = strategyUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid strategy data", details: result.error.issues },
        { status: 400 },
      );
    }

    const updated = await updateStrategy(result.data);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update strategy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
