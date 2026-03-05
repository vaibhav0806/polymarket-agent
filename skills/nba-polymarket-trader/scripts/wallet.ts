import "dotenv/config";
import { getWalletAddress, checkApproval } from "@/lib/polymarket/cli";
import { output, fatal } from "./_utils";

async function main() {
  const [addrResult, approvalResult] = await Promise.all([
    getWalletAddress(),
    checkApproval(),
  ]);

  if (!addrResult.ok) {
    fatal(`Failed to get wallet address: ${addrResult.error}`);
  }

  output({
    address: addrResult.data,
    approvals: approvalResult.ok ? approvalResult.data : { error: approvalResult.error },
  });
}

main().catch((err) => fatal(err.message));
