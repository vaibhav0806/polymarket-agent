import { NextRequest, NextResponse } from "next/server";
import { setConfig } from "@/lib/config";
import {
  decodeOrchestratorKey,
  applyOrchestratorKey,
  generateOrchestratorKey,
} from "@/lib/orchestrator";
import { updateStrategy } from "@/lib/config";

type Step = { name: string; status: "success" | "error"; message?: string };

export async function POST(request: NextRequest) {
  const steps: Step[] = [];

  try {
    const body = await request.json();
    const { orchestratorKey, openaiApiKey, polymarketPrivateKey, strategy } = body;

    if (orchestratorKey) {
      try {
        const decoded = decodeOrchestratorKey(orchestratorKey);
        steps.push({ name: "decode_key", status: "success" });

        await applyOrchestratorKey(decoded);
        steps.push({ name: "apply_key", status: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to apply orchestrator key";
        steps.push({ name: "apply_key", status: "error", message: msg });
        return NextResponse.json({ success: false, steps }, { status: 400 });
      }
    } else {
      if (openaiApiKey) {
        try {
          await setConfig("openaiApiKey", openaiApiKey);
          steps.push({ name: "set_openai_key", status: "success" });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to set OpenAI key";
          steps.push({ name: "set_openai_key", status: "error", message: msg });
        }
      }

      if (polymarketPrivateKey) {
        try {
          await setConfig("polymarketPrivateKey", polymarketPrivateKey);
          steps.push({ name: "set_polymarket_key", status: "success" });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to set Polymarket key";
          steps.push({ name: "set_polymarket_key", status: "error", message: msg });
        }
      }

      try {
        const config = {
          openaiApiKey: openaiApiKey || "",
          polymarketPrivateKey: polymarketPrivateKey || "",
        };
        await generateOrchestratorKey(config);
        steps.push({ name: "generate_orchestrator_key", status: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to generate orchestrator key";
        steps.push({ name: "generate_orchestrator_key", status: "error", message: msg });
      }
    }

    if (strategy) {
      try {
        await updateStrategy(strategy);
        steps.push({ name: "apply_strategy", status: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to apply strategy";
        steps.push({ name: "apply_strategy", status: "error", message: msg });
      }
    }

    const hasError = steps.some((s) => s.status === "error");
    return NextResponse.json({ success: !hasError, steps }, { status: hasError ? 500 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration failed";
    steps.push({ name: "parse_request", status: "error", message });
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}
