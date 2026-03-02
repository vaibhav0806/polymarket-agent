import { NextRequest, NextResponse } from "next/server";
import { decodeOrchestratorKey, validateSetup } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orchestratorKey, openaiApiKey, polymarketPrivateKey } = body;
    const errors: string[] = [];

    if (orchestratorKey) {
      try {
        const decoded = decodeOrchestratorKey(orchestratorKey);
        return NextResponse.json({ valid: true, decoded });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Invalid orchestrator key");
        return NextResponse.json({ valid: false, errors }, { status: 400 });
      }
    }

    if (!openaiApiKey && !polymarketPrivateKey) {
      return NextResponse.json(
        { valid: false, errors: ["Provide an orchestrator key or individual API keys"] },
        { status: 400 },
      );
    }

    if (openaiApiKey && !openaiApiKey.startsWith("sk-")) {
      errors.push("Invalid OpenAI API key format");
    }

    if (polymarketPrivateKey && polymarketPrivateKey.length < 10) {
      errors.push("Invalid Polymarket private key");
    }

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors }, { status: 400 });
    }

    const setupResult = await validateSetup();
    if (!setupResult) {
      errors.push("Setup validation failed");
      return NextResponse.json({ valid: false, errors }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ valid: false, errors: [message] }, { status: 500 });
  }
}
