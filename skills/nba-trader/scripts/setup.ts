import "dotenv/config";
import { execSync } from "child_process";
import { getWalletAddress, checkApproval, setApproval } from "@/lib/polymarket/cli";
import { output, fatal } from "./_utils";

async function main() {
  // 1. Run prisma generate + db push
  console.error("[setup] Running prisma generate...");
  try {
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch {
    fatal("prisma generate failed");
  }

  console.error("[setup] Running prisma db push...");
  try {
    execSync("npx prisma db push", { stdio: "inherit" });
  } catch {
    fatal("prisma db push failed");
  }

  // 2. Check wallet
  const addrResult = await getWalletAddress();
  if (!addrResult.ok) {
    fatal(`Wallet not configured: ${addrResult.error}. Run: polymarket setup`);
  }

  // 3. Check and set approvals
  const approvalResult = await checkApproval();
  let approvalsSet = false;

  if (approvalResult.ok && approvalResult.data) {
    const approvals = approvalResult.data;
    const allApproved = Array.isArray(approvals)
      ? approvals.every((a: Record<string, unknown>) => a.approved === true || a.isApproved === true)
      : true;

    if (!allApproved) {
      console.error("[setup] Setting contract approvals...");
      const setResult = await setApproval();
      if (!setResult.ok) {
        fatal(`Failed to set approvals: ${setResult.error}`);
      }
      approvalsSet = true;
    }
  }

  output({
    status: "ready",
    wallet: addrResult.data,
    approvals: approvalsSet ? "newly_set" : "already_approved",
    database: "initialized",
  });
}

main().catch((err) => fatal(err.message));
