import { z } from "zod";
import { getConfig, setConfig, updateStrategy } from "@/lib/config";
import { getWalletAddress, checkApproval, setApproval } from "@/lib/polymarket/cli";

const OrchestratorKeySchema = z.object({
  polymarketPrivateKey: z.string(),
  openaiApiKey: z.string(),
  twitterBearerToken: z.string().optional(),
  balldontlieApiKey: z.string().optional(),
  defaultStrategy: z
    .object({
      focusTeams: z.array(z.string()).optional(),
      marketTypes: z.array(z.string()).optional(),
      riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
      maxPositionSize: z.number().optional(),
      maxTotalExposure: z.number().optional(),
      minConfidence: z.number().optional(),
      maxDailyTrades: z.number().optional(),
      maxDailyLoss: z.number().optional(),
      orderType: z.enum(["market", "limit"]).optional(),
      pollIntervalMs: z.number().optional(),
      llmModel: z.string().optional(),
      customRules: z.string().optional(),
    })
    .optional(),
});

export type OrchestratorKey = z.infer<typeof OrchestratorKeySchema>;

function base64urlDecode(input: string): string {
  // Convert base64url to base64
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad with '='
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function base64urlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeOrchestratorKey(base64urlString: string): OrchestratorKey {
  const json = base64urlDecode(base64urlString);
  const parsed = JSON.parse(json);
  return OrchestratorKeySchema.parse(parsed);
}

export async function applyOrchestratorKey(
  decoded: OrchestratorKey
): Promise<void> {
  // Store all keys in Config table
  await setConfig("polymarketPrivateKey", decoded.polymarketPrivateKey);
  await setConfig("openaiApiKey", decoded.openaiApiKey);

  if (decoded.twitterBearerToken) {
    await setConfig("twitterBearerToken", decoded.twitterBearerToken);
  }
  if (decoded.balldontlieApiKey) {
    await setConfig("balldontlieApiKey", decoded.balldontlieApiKey);
  }

  // Apply default strategy if provided
  if (decoded.defaultStrategy) {
    await updateStrategy(decoded.defaultStrategy);
  }
}

export interface SetupValidation {
  valid: boolean;
  checks: {
    polymarketKey: boolean;
    openaiKey: boolean;
    walletAccessible: boolean;
    approvalsSet: boolean;
    twitterKey: boolean;
    balldontlieKey: boolean;
  };
  errors: string[];
}

export async function validateSetup(): Promise<SetupValidation> {
  const errors: string[] = [];

  const polymarketKey = await getConfig("polymarketPrivateKey");
  const openaiKey = await getConfig("openaiApiKey");
  const twitterKey = await getConfig("twitterBearerToken");
  const balldontlieKey = await getConfig("balldontlieApiKey");

  const hasPolymarketKey = !!polymarketKey;
  const hasOpenaiKey = !!openaiKey;
  const hasTwitterKey = !!twitterKey;
  const hasBalldontlieKey = !!balldontlieKey;

  if (!hasPolymarketKey) errors.push("Polymarket private key is not configured");
  if (!hasOpenaiKey) errors.push("OpenAI API key is not configured");

  // Check wallet accessibility
  let walletAccessible = false;
  if (hasPolymarketKey) {
    const walletResult = await getWalletAddress();
    walletAccessible = walletResult.ok;
    if (!walletAccessible) {
      errors.push(`Wallet not accessible: ${walletResult.error}`);
    }
  }

  // Check approvals
  let approvalsSet = false;
  if (walletAccessible) {
    const approvalResult = await checkApproval();
    if (approvalResult.ok && approvalResult.data) {
      approvalsSet = approvalResult.data.approved;
      if (!approvalsSet) {
        // Try to set approvals automatically
        const setResult = await setApproval();
        approvalsSet = setResult.ok;
        if (!approvalsSet) {
          errors.push(`Could not set approvals: ${setResult.error}`);
        }
      }
    }
  }

  return {
    valid: hasPolymarketKey && hasOpenaiKey && walletAccessible && approvalsSet,
    checks: {
      polymarketKey: hasPolymarketKey,
      openaiKey: hasOpenaiKey,
      walletAccessible,
      approvalsSet,
      twitterKey: hasTwitterKey,
      balldontlieKey: hasBalldontlieKey,
    },
    errors,
  };
}

export function generateOrchestratorKey(config: OrchestratorKey): string {
  const validated = OrchestratorKeySchema.parse(config);
  const json = JSON.stringify(validated);
  return base64urlEncode(json);
}
